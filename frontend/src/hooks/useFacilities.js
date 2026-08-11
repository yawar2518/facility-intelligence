import { useState, useEffect } from 'react'
import { getFacilities, getFacilityHealth } from '../api/monitoring'

export function useFacilities() {
  // useState gives us three pieces of state to track
  const [facilities, setFacilities] = useState([])  // the data
  const [loading, setLoading] = useState(true)       // are we fetching?
  const [error, setError] = useState(null)           // did something go wrong?

  useEffect(() => {
    // useEffect runs this function after the component renders
    // The empty [] at the bottom means "only run once on mount"

    async function fetchFacilities() {
      try {
        // Step 1: get the facility list
        const response = await getFacilities()
        const facilityList = response.data.results

        // Step 2: for each facility, also fetch its health summary
        // Promise.all runs all fetches in parallel, not one by one
        const withHealth = await Promise.all(
          facilityList.map(async (facility) => {
            const healthResponse = await getFacilityHealth(facility.id)
            return {
              ...facility,           // spread all facility fields
              health: healthResponse.data,  // add health data on top
            }
          })
        )

        setFacilities(withHealth)
      } catch (err) {
        setError('Failed to load facilities')
        console.error(err)
      } finally {
        // finally runs whether it succeeded or failed
        setLoading(false)
      }
    }

    fetchFacilities()
  }, []) // empty array = run once on mount

  return { facilities, loading, error }
}