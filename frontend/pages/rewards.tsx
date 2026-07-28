import { useState, useEffect, useCallback } from 'react'
import { api, RewardSite, PointBalance, ActiveUnlock } from '@/lib/api'
import Layout from '@/components/Layout'

export default function RewardsPage() {
  const [sites, setSites] = useState<RewardSite[]>([])
  const [balance, setBalance] = useState<PointBalance | null>(null)
  const [activeUnlocks, setActiveUnlocks] = useState<ActiveUnlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, b, u] = await Promise.all([
        api.getSites(),
        api.getBalance(),
        api.getActiveUnlocks(),
      ])
      setSites(s)
      setBalance(b)
      setActiveUnlocks(u)
    } catch {
      setError("Can't reach the FocusReward server. Is the app running?")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const unlock = async (siteId: string) => {
    setUnlockingId(siteId)
    try {
      await api.timedUnlock(siteId)
      loadData()
    } catch (e) {
      console.error(e)
    } finally {
      setUnlockingId(null)
    }
  }

  const getActiveInfo = (siteId: string, url: string) => {
    const active = activeUnlocks.find(u => u.url === url)
    if (!active) return null
    const expires = new Date(active.expires_at + 'Z')
    const now = new Date()
    const remaining = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000))
    if (remaining <= 0) return null
    const mins = Math.floor(remaining / 60)
    const secs = remaining % 60
    return `${mins}m ${secs}s remaining`
  }

  if (loading) {
    return <Layout balance={balance?.balance ?? 0}><p>Loading...</p></Layout>
  }

  return (
    <Layout balance={balance?.balance ?? 0}>
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={loadData}>Retry</button>
        </div>
      )}

      <div className="card">
        <h2>Reward Sites</h2>
        {sites.length === 0 ? (
          <div className="empty-state">No sites configured.</div>
        ) : (
          sites.map(site => {
            const activeInfo = getActiveInfo(site.id, site.url)
            const insufficientBalance = balance !== null && site.timed_cost > balance.balance
            return (
              <div key={site.id} className="site-card">
                <div className="site-info">
                  <div className="site-name">{site.name}</div>
                  <div className="site-url">{site.url}</div>
                  <div className="site-stats">
                    <span>{site.timed_cost} pts</span>
                    <span>{site.timed_duration_minutes} min</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {activeInfo && (
                    <div className="site-status">{activeInfo}</div>
                  )}
                  <button
                    className="btn btn-primary"
                    onClick={() => unlock(site.id)}
                    disabled={unlockingId === site.id || insufficientBalance}
                    style={{ marginTop: '0.5rem' }}
                  >
                    {unlockingId === site.id ? '...' : 'Unlock'}
                  </button>
                  {insufficientBalance && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                      Not enough points
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Layout>
  )
}