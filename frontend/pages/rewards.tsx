import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api, RewardSite, PointBalance, ActiveUnlock } from '@/lib/api'

export default function RewardsPage() {
  const [sites, setSites] = useState<RewardSite[]>([])
  const [balance, setBalance] = useState<PointBalance | null>(null)
  const [activeUnlocks, setActiveUnlocks] = useState<ActiveUnlock[]>([])
  const [loading, setLoading] = useState(true)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [s, b, u] = await Promise.all([
        api.getSites(),
        api.getBalance(),
        api.getActiveUnlocks(),
      ])
      setSites(s)
      setBalance(b)
      setActiveUnlocks(u)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

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
                </div>
              </div>
            )
          })
        )}
      </div>
    </Layout>
  )
}

function Layout({ children, balance }: { children: React.ReactNode; balance: number }) {
  return (
    <>
      <nav>
        <h1>FocusReward</h1>
        <Link href="/">Tasks</Link>
        <Link href="/rewards">Rewards</Link>
        <Link href="/history">History</Link>
        <Link href="/settings">Settings</Link>
        <div className="balance">{balance} pts</div>
      </nav>
      <main>{children}</main>
    </>
  )
}
