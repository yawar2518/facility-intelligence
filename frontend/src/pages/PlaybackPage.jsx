import { useState, useEffect } from 'react';
import { History, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { usePlayback } from '../hooks/usePlayback';
import { useFacilities } from '../hooks/useFacilities';

// ── Chart palette — muted fills for the bars, saturated for the
// reference lines/legend, matching the rest of the app's severity
// colors but toned down so a whole bar of it stays readable. ──
const BAR_DEFAULT = '#d9cdb8';
const BAR_SPIKE   = '#e0b98a';
const BAR_DROP    = '#e59a92';
const LINE_SPIKE  = 'var(--degraded-dark)';
const LINE_DROP   = 'var(--critical)';

// ── Helpers ────────────────────────────────────────────────

function toLocalDatetimeInput(isoString) {
  // Converts ISO string → "YYYY-MM-DDTHH:MM" for datetime-local input
  const d = new Date(isoString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(isoString) {
  // Short HH:MM for chart axis and feed timestamps
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(isoString) {
  // Full date+time — used for the chart tooltip, a standalone popup
  // that isn't grouped under a date header the way feed rows are, so
  // it needs to state the date itself.
  return new Date(isoString).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatRowTime(isoString) {
  // Time-only for feed rows — the date is stated once per day by the
  // group header above them (see formatDayLabel), not repeated on
  // every row.
  return new Date(isoString).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// Groups the feed under a date header wherever the calendar day
// changes — the selected window can span multiple days, and this
// keeps the whole thing as one continuous, scrollable list (matching
// the traffic chart above it, which always covers the full window)
// instead of hiding days behind a switcher.
function formatDayLabel(isoString) {
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function severityColor(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'var(--critical)';
  if (severity === 'MEDIUM')  return 'var(--degraded-dark)';
  return 'var(--text-2)';
}

function statusColor(status) {
  if (status === 'ONLINE')   return 'var(--online)';
  if (status === 'OFFLINE')  return 'var(--offline)';
  if (status === 'DEGRADED') return 'var(--degraded)';
  return 'var(--text-2)';
}

// Assigns each traffic anomaly to its nearest chart bucket, so the bar
// itself can be tinted and a reference line can land exactly on an
// XAxis tick (recharts needs an exact category match to place it).
// Only TRAFFIC_SPIKE/TRAFFIC_DROP are traffic-volume events — device or
// error-rate anomalies aren't about this chart's series and stay out of
// it (they still show up in the Event Feed below).
function buildBucketAnomalyMap(buckets, anomalies) {
  const map = {};
  if (!buckets?.length) return map;

  for (const a of anomalies) {
    if (a.anomaly_type !== 'TRAFFIC_SPIKE' && a.anomaly_type !== 'TRAFFIC_DROP') continue;

    const t = new Date(a.detected_at).getTime();
    let closest = buckets[0].bucket;
    let closestDiff = Infinity;
    for (const b of buckets) {
      const diff = Math.abs(new Date(b.bucket).getTime() - t);
      if (diff < closestDiff) { closestDiff = diff; closest = b.bucket; }
    }

    // If two anomalies land on the same bucket, keep the more severe one.
    // sigma_score is signed (negative for drops), so compare magnitude.
    const existing = map[closest];
    if (!existing || Math.abs(a.sigma_score ?? 0) > Math.abs(existing.sigma_score ?? 0)) {
      map[closest] = a;
    }
  }
  return map;
}

// ── Chart pieces ───────────────────────────────────────────

function TrafficTooltip({ active, label, payload, anomaliesByBucket }) {
  if (!active || !payload?.length) return null;
  const anomaly = anomaliesByBucket[label];

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '10px 13px',
      maxWidth: '230px',
      boxShadow: '0 4px 14px rgba(33, 29, 23, 0.12)',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', color: 'var(--text-3)', marginBottom: '5px' }}>
        {formatDateTime(label)}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-1)' }}>
        <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{payload[0].value}</strong> vehicle events
      </div>
      {anomaly && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '10.5px',
            fontWeight: 600,
            color: anomaly.anomaly_type === 'TRAFFIC_SPIKE' ? LINE_SPIKE : LINE_DROP,
          }}>
            {anomaly.severity} · {anomaly.anomaly_type.replace(/_/g, ' ')} · {Math.abs(anomaly.sigma_score ?? 0).toFixed(1)}σ
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-mid)', marginTop: '4px', lineHeight: 1.45 }}>
            {anomaly.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function StatusChangeRow({ item, delay }) {
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '11px 20px', borderBottom: '1px solid var(--border-2)',
      animation: `floatUp 0.35s ease-out ${delay}s both`,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(33, 29, 23, 0.03)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{
        fontSize: '11px', color: 'var(--text-3)',
        fontFamily: 'JetBrains Mono, monospace',
        minWidth: '64px', flexShrink: 0,
      }}>
        {formatRowTime(item.changed_at)}
      </span>

      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: statusColor(item.new_status),
        marginTop: '5px', flexShrink: 0,
      }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-1)', fontSize: '12.5px', fontFamily: 'JetBrains Mono, monospace' }}>
          {item.device_code}
        </span>
        <span style={{ fontSize: '11px', color: statusColor(item.previous_status) }}>{item.previous_status}</span>
        <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>→</span>
        <span style={{ fontSize: '11px', color: statusColor(item.new_status) }}>{item.new_status}</span>
        <span style={{ color: 'var(--text-2)', fontSize: '11.5px' }}>
          · {item.area_name} / {item.lane_name} · {item.reason.replace(/_/g, ' ').toLowerCase()}
        </span>
      </div>
    </div>
  );
}

function AnomalyRow({ item, delay }) {
  const color = severityColor(item.severity);
  const tint  = item.severity === 'CRITICAL' ? 'rgba(204, 59, 48, 0.06)' : 'rgba(194, 133, 26, 0.06)';
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '12px 20px', borderBottom: '1px solid var(--border-2)',
      background: tint,
      animation: `floatUp 0.35s ease-out ${delay}s both`,
    }}>
      <span style={{
        fontSize: '11px', color: 'var(--text-3)',
        fontFamily: 'JetBrains Mono, monospace',
        minWidth: '64px', flexShrink: 0,
      }}>
        {formatRowTime(item.detected_at)}
      </span>

      <AlertTriangle size={13} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />

      <div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', fontWeight: 600, color }}>
            {item.severity} · {item.anomaly_type.replace(/_/g, ' ')} · {Math.abs(item.sigma_score ?? 0).toFixed(1)}σ
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-2)' }}>
            {item.area_name} / {item.lane_name}
          </span>
        </div>
        {item.explanation && (
          <div style={{ fontSize: '11.5px', color: 'var(--text-mid)', marginTop: '4px', lineHeight: 1.45 }}>
            {item.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────

export default function PlaybackPage() {
  const { facilities } = useFacilities();
  const [selectedFacility, setSelectedFacility] = useState('');

  // Default window: last 24 hours
  const now       = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [startInput, setStartInput] = useState(toLocalDatetimeInput(yesterday.toISOString()));
  const [endInput,   setEndInput]   = useState(toLocalDatetimeInput(now.toISOString()));

  const { data, loading, error, refetch } = usePlayback();

  // Auto-select the first facility and fire the initial 24h fetch once
  // facilities load.
  useEffect(() => {
    if (facilities.length > 0 && !selectedFacility) {
      const firstId = facilities[0].id;
      setSelectedFacility(firstId);
      const end   = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      refetch(firstId, start.toISOString(), end.toISOString());
    }
  }, [facilities]);

  function handleLoad() {
    const start = new Date(startInput).toISOString();
    const end   = new Date(endInput).toISOString();
    refetch(selectedFacility, start, end);
  }

  // ── Build interleaved event feed ──────────────────────────
  const feedItems = [];
  if (data) {
    data.status_changes.forEach(c => feedItems.push({ ...c, _type: 'status', _time: c.changed_at }));
    data.anomalies.forEach(a      => feedItems.push({ ...a, _type: 'anomaly', _time: a.detected_at }));
    feedItems.sort((a, b) => new Date(a._time) - new Date(b._time));
  }

  // ── Bar coloring + reference lines for the chart ──────────
  const bucketAnomalies = data ? buildBucketAnomalyMap(data.traffic_buckets, data.anomalies) : {};
  const referenceLines  = Object.entries(bucketAnomalies).map(([bucket, a]) => ({
    bucket,
    color: a.anomaly_type === 'TRAFFIC_SPIKE' ? LINE_SPIKE : LINE_DROP,
    sigma: Math.abs(a.sigma_score ?? 0),
  }));

  return (
    <>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 34px',
        borderBottom: '1px solid var(--border)',
        flex: 'none',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.2em',
          color: 'var(--text-4)',
        }}>
          PLAYBACK <span style={{ color: 'var(--text-light)' }}>/</span> HISTORICAL
        </div>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: 'var(--text-2)',
        }}>
          Asia/Karachi
        </span>
      </div>

      {/* Main Content — fades/rises in on every mount (initial load,
          reload, or route switch) and smooth-scrolls on its own axis.
          This scrollable wrapper is also what fixes the page: without
          it, content taller than the viewport had nowhere to scroll and
          was simply clipped by the layout's outer `overflow: hidden`. */}
      <div className="fade-in" style={{ flex: 1, overflow: 'auto', scrollBehavior: 'smooth', padding: '32px 34px 48px' }}>

        {/* Title */}
        <div style={{ marginBottom: '22px' }}>
          <h1 style={{
            fontFamily: 'Archivo, sans-serif',
            fontWeight: 800,
            fontSize: '34px',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Historical Playback
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
            Scrub through traffic, device status, and anomalies for any window.
          </p>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '16px 18px', marginBottom: '22px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-3)', fontSize: '11px' }}>Facility</label>
            <select
              value={selectedFacility}
              onChange={e => setSelectedFacility(e.target.value)}
              style={{
                background: 'var(--surface-white)', border: '1px solid var(--border-strong)',
                color: 'var(--text-1)', borderRadius: '7px',
                padding: '7px 11px', fontSize: '12px', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name} · {f.code}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-3)', fontSize: '11px' }}>Start</label>
            <input
              type="datetime-local"
              value={startInput}
              onChange={e => setStartInput(e.target.value)}
              style={{
                background: 'var(--surface-white)', border: '1px solid var(--border-strong)',
                color: 'var(--text-1)', borderRadius: '7px',
                padding: '7px 11px', fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                colorScheme: 'light',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ color: 'var(--text-3)', fontSize: '11px' }}>End</label>
            <input
              type="datetime-local"
              value={endInput}
              onChange={e => setEndInput(e.target.value)}
              style={{
                background: 'var(--surface-white)', border: '1px solid var(--border-strong)',
                color: 'var(--text-1)', borderRadius: '7px',
                padding: '7px 11px', fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                colorScheme: 'light',
              }}
            />
          </div>

          <button
            onClick={handleLoad}
            disabled={loading || !selectedFacility}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'var(--text-1)', color: 'var(--bg)',
              border: 'none', borderRadius: '7px',
              padding: '9px 18px', fontSize: '13px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = '1'; }}
          >
            <RefreshCw size={13} style={loading ? { animation: 'spin 0.8s linear infinite' } : undefined} />
            {loading ? 'Loading…' : 'Load window'}
          </button>

          {data && (
            <span style={{
              marginLeft: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '10px',
              color: 'var(--text-3)',
              alignSelf: 'center',
            }}>
              {data.bucket_minutes}-min buckets · {data.traffic_buckets.length} intervals
            </span>
          )}
        </div>

        {error && (
          <p style={{ color: 'var(--critical)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
        )}

        {data && (
          <>
            {/* Traffic Chart */}
            <div className="fade-in" style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px 22px', marginBottom: '22px',
            }}>
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <History size={14} color="var(--text-2)" />
                <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-1)' }}>
                  Traffic Volume
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                  vehicle events · facility-wide
                </span>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: LINE_SPIKE }}>
                    <span style={{ width: '2px', height: '10px', background: LINE_SPIKE, flex: 'none' }} />
                    traffic spike
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: LINE_DROP }}>
                    <span style={{ width: '2px', height: '10px', background: LINE_DROP, flex: 'none' }} />
                    traffic drop
                  </span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data.traffic_buckets} margin={{ top: 24, right: 8, bottom: 5, left: 0 }} barCategoryGap="18%">
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={formatTime}
                    tick={{ fill: 'var(--text-3)', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace' }}
                    interval="preserveStartEnd"
                    stroke="var(--border-strong)"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-3)', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace' }}
                    stroke="var(--border-strong)"
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={<TrafficTooltip anomaliesByBucket={bucketAnomalies} />}
                    cursor={{ fill: 'rgba(33, 29, 23, 0.05)' }}
                  />

                  {referenceLines.map((r) => (
                    <ReferenceLine
                      key={r.bucket}
                      x={r.bucket}
                      stroke={r.color}
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{
                        value: `${r.sigma?.toFixed(1)}σ`,
                        position: 'top',
                        fill: r.color,
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  ))}

                  <Bar
                    dataKey="event_count"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive
                    animationDuration={700}
                    animationEasing="ease-out"
                    activeBar={{ stroke: 'var(--text-1)', strokeWidth: 1 }}
                  >
                    {data.traffic_buckets.map((b) => {
                      const a = bucketAnomalies[b.bucket];
                      const fill = !a ? BAR_DEFAULT : a.anomaly_type === 'TRAFFIC_SPIKE' ? BAR_SPIKE : BAR_DROP;
                      return <Cell key={b.bucket} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Event Feed */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              }}>
                <span style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: '14px', color: 'var(--text-1)' }}>
                  Event Feed
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>
                  {feedItems.length} events · {data.status_changes.length} status changes · {data.anomalies.length} anomalies
                </span>
              </div>

              {feedItems.length === 0 && (
                <p style={{ padding: '24px', color: 'var(--text-3)', fontSize: '13px' }}>
                  No events in this time window.
                </p>
              )}

              {feedItems.map((item, i) => {
                const dayLabel = formatDayLabel(item._time);
                const isNewDay = i === 0 || dayLabel !== formatDayLabel(feedItems[i - 1]._time);

                return (
                  <div key={i}>
                    {isNewDay && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 20px',
                        background: 'var(--surface-2)',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: '10px',
                          letterSpacing: '0.14em', color: 'var(--text-2)', flex: 'none',
                        }}>
                          {dayLabel.toUpperCase()}
                        </span>
                      </div>
                    )}
                    {item._type === 'status'
                      ? <StatusChangeRow item={item} delay={Math.min(i, 14) * 0.03} />
                      : <AnomalyRow      item={item} delay={Math.min(i, 14) * 0.03} />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
