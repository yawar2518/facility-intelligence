function FacilitySelector({ facilities, selectedId, onSelect }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-gray-400 text-sm">Facility:</label>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="" disabled>Select a facility...</option>
        {facilities.map((facility) => (
          <option key={facility.id} value={facility.id}>
            {facility.name} ({facility.code})
          </option>
        ))}
      </select>
    </div>
  )
}

export default FacilitySelector