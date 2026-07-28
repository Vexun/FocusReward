import { useState, useEffect, useCallback, useRef } from 'react'

export function useApiData<T>(fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFnRef.current()
      setData(result)
    } catch {
      setError("Can't reach the FocusReward server. Is the app running?")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { data, loading, error, retry: load }
}