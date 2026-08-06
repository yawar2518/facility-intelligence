import { useFacilities } from '../hooks/useFacilities'
import FacilityCard from '../components/FacilityCard'

function DashboardPage() {
  // Call our custom hook — it handles fetching and state
  const { facilities, loading, error } = useFacilities()

  // Show loading state while fetching
  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading facilities...</p>
      </div>
    )
  }

  // Show error if fetch failed
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Overview</h2>
        <p className="text-gray-500 mt-1">
          {facilities.length} facilities monitored
        </p>
      </div>

      {/* Facility cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilities.map((facility) => (
          <FacilityCard
            key={facility.id}
            facility={facility}
          />
        ))}
      </div>
    </div>
  )
}

export default DashboardPage