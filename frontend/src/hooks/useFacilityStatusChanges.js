import { useState, useEffect, useCallback } from 'react'
import { getFacilityStatusChanges } from '../api/monitoring'

const PAGE_SIZE = 50

export function useFacilityStatusChanges(facilityId) {
  const [changes, setChanges]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore]         = useState(false)
  const [error, setError]             = useState(null)
  // How many rows we've actually paged through from the API — tracked
  // separately from `changes.length`, because live events get
  // prepended into `changes` (see TimelinePage) without having come
  // from a page fetch. Using `changes.length` as the next offset would
  // silently skip or duplicate rows once a live event or two had
  // landed.
  const [fetchedCount, setFetchedCount] = useState(0)

  useEffect(() => {
    if (!facilityId) return
    let cancelled = false

    async function fetchFirstPage() {
      setLoading(true)
      setError(null)

      try {
        const response = await getFacilityStatusChanges(facilityId, PAGE_SIZE, 0)
        if (cancelled) return
        setChanges(response.data.changes)
        setFetchedCount(response.data.changes.length)
        setHasMore(response.data.has_more)
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load status changes')
          console.error(err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchFirstPage()
    return () => { cancelled = true }
  }, [facilityId])

  const loadMore = useCallback(async () => {
    if (!facilityId || loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const response = await getFacilityStatusChanges(facilityId, PAGE_SIZE, fetchedCount)
      setChanges((prev) => [...prev, ...response.data.changes])
      setFetchedCount((prev) => prev + response.data.changes.length)
      setHasMore(response.data.has_more)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMore(false)
    }
  }, [facilityId, fetchedCount, hasMore, loadingMore])

  return { changes, setChanges, loading, loadingMore, hasMore, error, loadMore }
}
