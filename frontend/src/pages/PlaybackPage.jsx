import { useState, useEffect } from 'react';
import { History, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { usePlayback } from '../hooks/usePlayback';
import { useFacilities } from '../hooks/useFacilities';

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
  // Full date+time for feed rows
  return new Date(isoString).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function severityColor(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'var(--offline)';
  if (severity === 'MEDIUM')  return 'var(--degraded)';
  return 'var(--text-2)';
}

function statusColor(status) {
  if (status === 'ONLINE')   return 'var(--online)';
  if (status === 'OFFLINE')  return 'var(--offline)';
  if (status === 'DEGRADED') return 'var(--degraded)';
  return 'var(--text-2)';
}

// ── Sub-components ─────────────────────────────────────────

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '2px 8px',
      borderRadius: '4px', border: `1px solid ${color}`,
      color, fontFamily: 'JetBrains Mono, monospace',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function StatusChangeRow({ item }) {
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
    }}>
      {/* Icon */}
      <Activity size={14} color="var(--text-2)" style={{ marginTop: '2px', flexShrink: 0 }} />

      {/* Timestamp */}
      <span style={{
        fontSize: '12px', color: 'var(--text-2)',
        fontFamily: 'JetBrains Mono, monospace',
        minWidth: '160px', flexShrink: 0,
      }}>
        {formatDateTime(item.changed_at)}
      </span>

      {/* Detail */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-1)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>
          {item.device_code}
        </span>
        <Badge label={item.previous_status} color={statusColor(item.previous_status)} />
        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>→</span>
        <Badge label={item.new_status} color={statusColor(item.new_status)} />
        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>
          · {item.area_name} / {item.lane_name} · {item.reason.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
}

function AnomalyRow({ item }) {
  const color = severityColor(item.severity);
  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
      background: 'rgba(185,28,28,0.04)',
    }}>
      {/* Icon */}
      <AlertTriangle size={14} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />

      {/* Timestamp */}
      <span style={{
        fontSize: '12px', color: 'var(--text-2)',
        fontFamily: 'JetBrains Mono, monospace',
        minWidth: '160px', flexShrink: 0,
      }}>
        {formatDateTime(item.detected_at)}
      </span>

      {/* Detail */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <Badge label={item.severity} color={color} />
        <Badge label={item.anomaly_type.replace(/_/g, ' ')} color="var(--text-2)" />
        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>
          · {item.area_name} / {item.lane_name}
          · σ {item.sigma_score?.toFixed(2)}
        </span>
        {item.explanation && (
          <span style={{ color: 'var(--text-3)', fontSize: '11px', width: '100%', marginTop: '2px' }}>
            {item.explanation}
          </span>
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
  const now          = new Date();
  const yesterday    = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [startInput, setStartInput] = useState(toLocalDatetimeInput(yesterday.toISOString()));
  const [endInput,   setEndInput]   = useState(toLocalDatetimeInput(now.toISOString()));

  // After — only passes ID once we actually have one:
const { data, loading, error, refetch } = usePlayback();

  // After — auto-select AND auto-fetch once facilities load:
useEffect(() => {
  if (facilities.length > 0 && !selectedFacility) {
    const firstId = facilities[0].id;
    setSelectedFacility(firstId);
    // Fire initial 24h fetch with the first facility
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

  // ── Anomaly reference lines for chart ────────────────────
  // Snap each anomaly to the nearest bucket timestamp for alignment
  const anomalyLines = data?.anomalies.map(a => ({
    time: a.detected_at,
    color: severityColor(a.severity),
  })) ?? [];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-1)', fontSize: '20px', fontWeight: 600, margin: 0 }}>
          Historical Playback
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '4px' }}>
          Scrub through device status, traffic, and anomalies for any time window
        </p>
      </div>

      {/* ── Controls ── */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-end',
        flexWrap: 'wrap', marginBottom: '24px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '16px',
      }}>

        {/* Facility selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ color: 'var(--text-2)', fontSize: '12px' }}>Facility</label>
          <select
            value={selectedFacility}
            onChange={e => setSelectedFacility(e.target.value)}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-2)',
              color: 'var(--text-1)', borderRadius: '6px',
              padding: '7px 12px', fontSize: '13px', cursor: 'pointer',
            }}
          >
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
            ))}
          </select>
        </div>

        {/* Start datetime */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ color: 'var(--text-2)', fontSize: '12px' }}>Start</label>
          <input
            type="datetime-local"
            value={startInput}
            onChange={e => setStartInput(e.target.value)}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-2)',
              color: 'var(--text-1)', borderRadius: '6px',
              padding: '7px 12px', fontSize: '13px',
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* End datetime */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ color: 'var(--text-2)', fontSize: '12px' }}>End</label>
          <input
            type="datetime-local"
            value={endInput}
            onChange={e => setEndInput(e.target.value)}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-2)',
              color: 'var(--text-1)', borderRadius: '6px',
              padding: '7px 12px', fontSize: '13px',
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Load button */}
        <button
          onClick={handleLoad}
          disabled={loading || !selectedFacility}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--text-1)', color: 'var(--bg)',
            border: 'none', borderRadius: '6px',
            padding: '8px 16px', fontSize: '13px', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} />
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {error && (
        <p style={{ color: 'var(--offline)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
      )}

      {data && (
        <>
          {/* ── Traffic Chart ── */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '20px', marginBottom: '24px',
          }}>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={14} color="var(--text-2)" />
              <span style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 600 }}>
                Traffic Volume
              </span>
              <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>
                — {data.bucket_minutes}-min buckets · {data.traffic_buckets.length} intervals
              </span>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.traffic_buckets} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EDEDED" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#EDEDED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={formatTime}
                  tick={{ fill: 'var(--text-2)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  interval="preserveStartEnd"
                  stroke="var(--border)"
                />
                <YAxis
                  tick={{ fill: 'var(--text-2)', fontSize: 11 }}
                  stroke="var(--border)"
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                    borderRadius: '6px', fontSize: '12px', color: 'var(--text-1)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  labelFormatter={formatDateTime}
                  formatter={val => [val, 'Events']}
                />
                {/* Anomaly reference lines — one vertical line per anomaly */}
                {anomalyLines.map((a, i) => (
                  <ReferenceLine
                    key={i}
                    x={a.time}
                    stroke={a.color}
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                  />
                ))}
                <Area
                  type="monotone"
                  dataKey="event_count"
                  stroke="var(--text-1)"
                  strokeWidth={1.5}
                  fill="url(#trafficGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Event Feed ── */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '8px', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <History size={14} color="var(--text-2)" />
              <span style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 600 }}>
                Event Feed
              </span>
              <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>
                — {feedItems.length} events ({data.status_changes.length} status changes · {data.anomalies.length} anomalies)
              </span>
            </div>

            {feedItems.length === 0 && (
              <p style={{ padding: '24px', color: 'var(--text-2)', fontSize: '13px' }}>
                No events in this time window.
              </p>
            )}

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {feedItems.map((item, i) =>
                item._type === 'status'
                  ? <StatusChangeRow key={i} item={item} />
                  : <AnomalyRow      key={i} item={item} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}