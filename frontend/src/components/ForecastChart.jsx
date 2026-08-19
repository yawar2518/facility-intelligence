import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts'
import { useState, useEffect } from 'react'
import { getLaneForecast } from '../api/monitoring'

function formatHour(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ForecastChart({ laneId, laneName }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!laneId) return

    setLoading(true)
    getLaneForecast(laneId)
      .then(res => {
        const results = res.results ?? res
        const chartData = results.map(f => ({
          time:      f.forecast_for,
          label:     `${formatDate(f.forecast_for)} ${formatHour(f.forecast_for)}`,
          predicted: Math.round(f.predicted),
          low:       Math.round(f.predicted_low),
          high:      Math.round(f.predicted_high),
        }))
        setData(chartData)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load forecast')
        setLoading(false)
      })
  }, [laneId])

  if (loading) return (
    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
      Loading forecast...
    </p>
  )

  if (error) return (
    <p style={{ fontSize: '13px', color: 'var(--offline)' }}>{error}</p>
  )

  if (data.length === 0) return (
    <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
      No forecast available for this lane.
    </p>
  )

  return (
    <div>
      <p style={{
        fontSize: '12px', color: 'var(--text-2)', margin: '0 0 12px 0'
      }}>
        Next 24 hours — predicted vehicle events per hour
      </p>

      <ResponsiveContainer width='100%' height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            {/* Confidence band gradient */}
            <linearGradient id='confidenceBand' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='5%'  stopColor='#16A34A' stopOpacity={0.15} />
              <stop offset='95%' stopColor='#16A34A' stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />

          <XAxis
            dataKey='label'
            tick={{ fontSize: 10, fill: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}
            interval={3}
            angle={-30}
            textAnchor='end'
            height={45}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-2)' }}
            width={35}
          />

          <Tooltip
            contentStyle={{
              background:   'var(--surface-2)',
              border:       '1px solid var(--border)',
              borderRadius: '6px',
              fontSize:     '12px',
              color:        'var(--text-1)',
            }}
            formatter={(value, name) => {
              const labels = {
                predicted: 'Predicted',
                high:      'Upper bound',
                low:       'Lower bound',
              }
              return [value, labels[name] ?? name]
            }}
          />

          {/* Confidence band — high bound */}
          <Area
            type='monotone'
            dataKey='high'
            stroke='none'
            fill='url(#confidenceBand)'
            legendType='none'
          />

          {/* Predicted line */}
          <Line
            type='monotone'
            dataKey='predicted'
            stroke='var(--online)'
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />

          {/* Lower bound — dashed */}
          <Line
            type='monotone'
            dataKey='low'
            stroke='var(--online)'
            strokeWidth={1}
            strokeDasharray='4 4'
            dot={false}
            legendType='none'
          />

          <Legend
            wrapperStyle={{ fontSize: '11px', color: 'var(--text-2)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
