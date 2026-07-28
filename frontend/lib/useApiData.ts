import { useState, useEffect, useCallback } from 'react'

export function useApiData<T>(fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch {
      setError("Can't reach the FocusReward server. Is the app running?")
    } finally {
      setLoading(false)
    }
  }, [fetchFn])

  useEffect(() => { load() }, [load])

  return { data, loading, error, retry: load }
}