import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useState, useEffect } from 'react'
import { getLaneForecast } from '../api/monitoring'

function formatHour(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatFull(isoString) {
  const d = new Date(isoString)
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Matches the tooltip language used on the Playback chart — same
// surface, border, and type treatment instead of recharts' default
// tooltip box.
function ForecastTooltip({ active, label, payload }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '10px 13px',
      boxShadow: '0 4px 14px rgba(33, 29, 23, 0.12)',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', color: 'var(--text-3)', marginBottom: '6px' }}>
        {formatFull(label)}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-1)' }}>
        <strong style={{ fontFamily: 'JetBrains Mono, monospace' }}>{point.predicted}</strong> events predicted
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10.5px', color: 'var(--text-3)', marginTop: '4px' }}>
        range {point.low}–{point.high}
      </div>
    </div>
  )
}

export default function ForecastChart({ laneId }) {
  const [data,       setData]      = useState([])
  // How far ahead the returned data actually reaches. Prophet forecasts
  // are (re)generated once a day as a rolling 24h window from whenever
  // that task last ran, so as the day goes on there are fewer future
  // hours left in it until the next run refreshes it — reading the real
  // span off the data, instead of hardcoding "Next 24 hours", means the
  // caption is never wrong regardless of how stale the forecast is.
  // Computed once when the data arrives below (not from Date.now()
  // during render, which would be impure/unstable).
  const [spanHours,  setSpanHours] = useState(0)
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState(null)

  useEffect(() => {
    if (!laneId) return

    setLoading(true)
    getLaneForecast(laneId)
      .then(res => {
        const results = res.results ?? res
        const now = Date.now()
        const chartData = results.map(f => {
          const low  = Math.round(f.predicted_low)
          const high = Math.round(f.predicted_high)
          return {
            time:       f.forecast_for,
            predicted:  Math.round(f.predicted),
            low,
            high,
            // The band itself is drawn as `low` (invisible, just to push
            // the stack's baseline up) + `bandHeight` stacked on top of
            // it — the shaded region ends up exactly between low and
            // high regardless of what's behind the chart, unlike the
            // common trick of painting a second area in the panel's own
            // background color to "erase" everything below `low`.
            bandHeight: high - low,
          }
        })
        setData(chartData)
        setSpanHours(chartData.length
          ? Math.max(1, Math.round((new Date(chartData[chartData.length - 1].time) - now) / 3600000))
          : 0)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load forecast')
        setLoading(false)
      })
  }, [laneId])

  if (loading) return (
    <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
      Loading forecast...
    </p>
  )

  if (error) return (
    <p style={{ fontSize: '13px', color: 'var(--critical)' }}>{error}</p>
  )

  if (data.length === 0) return (
    <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
      No forecast available for this lane.
    </p>
  )

  // Target ~6 evenly-spaced x-axis ticks no matter how many data points
  // there are, so labels never crowd into each other on a dense (near
  // 24-point) dataset, and aren't sparser than they need to be on a
  // short one.
  const xTickInterval = Math.max(0, Math.ceil(data.length / 6) - 1)

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
          Next {spanHours}h · predicted vehicle events per hour
        </p>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'var(--text-3)',
        }}>
          <span style={{ width: '10px', height: '2px', background: 'var(--accent)', flex: 'none' }} />
          predicted
          <span style={{ width: '10px', height: '8px', background: 'rgba(191, 90, 47, 0.14)', border: '1px solid rgba(191, 90, 47, 0.3)', borderRadius: '2px', flex: 'none' }} />
          range
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.16} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="time"
            tickFormatter={formatHour}
            tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            interval={xTickInterval}
            stroke="var(--border-strong)"
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke="var(--border-strong)"
            tickLine={false}
            tickMargin={6}
            width={46}
            allowDecimals={false}
          />

          <Tooltip content={<ForecastTooltip />} cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '3 3' }} />

          {/* Confidence range — one shaded band between low and high,
              instead of a second dashed line competing with the
              predicted line for attention. Stacked rather than masked
              with a background-color fill, so it looks right regardless
              of what's behind the chart. */}
          <Area
            type="monotone"
            dataKey="low"
            stackId="band"
            stroke="none"
            fill="transparent"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="bandHeight"
            stackId="band"
            stroke="none"
            fill="url(#forecastBand)"
            isAnimationActive
            animationDuration={600}
          />

          {/* Predicted line */}
          <Area
            type="monotone"
            dataKey="predicted"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="none"
            dot={false}
            activeDot={{ r: 3.5, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
