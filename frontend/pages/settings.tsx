import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api, RewardSite, PointBalance } from '@/lib/api'

export default function SettingsPage() {
  const [sites, setSites] = useState<RewardSite[]>([])
  const [balance, setBalance] = useState<PointBalance | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [cost, setCost] = useState('10')
  const [duration, setDuration] = useState('30')

  const loadData = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        api.getSites(),
        api.getBalance(),
      ])
      setSites(s)
      setBalance(b)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addSite = async () => {
    if (!name.trim() || !url.trim()) return
    try {
      await api.createSite({
        name: name.trim(),
        url: url.trim(),
        timed_cost: parseInt(cost) || 10,
        timed_duration_minutes: parseInt(duration) || 30,
      })
      setName('')
      setUrl('')
      setCost('10')
      setDuration('30')
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const removeSite = async (id: string, isPreconfigured: boolean) => {
    if (isPreconfigured) return
    if (!confirm('Remove this site?')) return
    try {
      await api.deleteSite(id)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return <Layout balance={balance?.balance ?? 0}><p>Loading...</p></Layout>
  }

  return (
    <Layout balance={balance?.balance ?? 0}>
      <div className="card">
        <h2>Add Custom Site</h2>
        <div className="form-group">
          <label>Site Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Facebook"
          />
        </div>
        <div className="form-group">
          <label>Site URL</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="e.g. facebook.com"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Point Cost</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              min={1}
            />
          </div>
          <div className="form-group">
            <label>Duration (minutes, max 1440)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min={1}
              max={1440}
            />
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={addSite}
          disabled={!name.trim() || !url.trim()}
        >
          Add Site
        </button>
      </div>

      <div className="card">
        <h2>All Sites</h2>
        {sites.length === 0 ? (
          <div className="empty-state">No sites configured.</div>
        ) : (
          sites.map(site => (
            <div key={site.id} className="site-card">
              <div className="site-info">
                <div className="site-name">
                  {site.name}
                  {site.is_preconfigured && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      (pre-configured)
                    </span>
                  )}
                </div>
                <div className="site-url">{site.url}</div>
                <div className="site-stats">
                  <span>{site.timed_cost} pts</span>
                  <span>{site.timed_duration_minutes} min</span>
                </div>
              </div>
              {!site.is_preconfigured && (
                <button
                  className="btn btn-danger"
                  onClick={() => removeSite(site.id, site.is_preconfigured)}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  Remove
                </button>
              )}
            </div>
          ))
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
