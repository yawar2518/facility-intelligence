function FacilityCard({ facility }) {
  const health = facility.health

  // Determine color based on health score
  const getHealthColor = (score) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getBorderColor = (score) => {
    if (score >= 90) return 'border-green-800'
    if (score >= 70) return 'border-yellow-800'
    return 'border-red-800'
  }

  return (
    <div className={`bg-gray-900 border rounded-xl p-6 ${getBorderColor(health.health_score)}`}>

      {/* Facility name and code */}
      <div className="mb-4">
        <h3 className="text-white font-semibold text-lg">{facility.name}</h3>
        <p className="text-gray-500 text-sm">{facility.code}</p>
      </div>

      {/* Health score — big number */}
      <div className="mb-4">
        <span className={`text-4xl font-bold ${getHealthColor(health.health_score)}`}>
          {health.health_score}%
        </span>
        <span className="text-gray-500 text-sm ml-2">health score</span>
      </div>

      {/* Device counts */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-800 rounded-lg p-2">
          <p className="text-green-400 font-bold text-lg">{health.online}</p>
          <p className="text-gray-500 text-xs">Online</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <p className="text-yellow-400 font-bold text-lg">{health.degraded}</p>
          <p className="text-gray-500 text-xs">Degraded</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-2">
          <p className="text-red-400 font-bold text-lg">{health.offline}</p>
          <p className="text-gray-500 text-xs">Offline</p>
        </div>
      </div>

      {/* Total devices */}
      <p className="text-gray-600 text-xs mt-3">
        {health.total_devices} devices total
      </p>

    </div>
  )
}

export default FacilityCard