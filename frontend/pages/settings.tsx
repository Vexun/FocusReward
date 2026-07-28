import { useState } from 'react'
import { api, RewardSite, PointBalance } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import Layout from '@/components/Layout'

export default function SettingsPage() {
  const { data, loading, error, retry } = useApiData(async () => {
    const [sites, balance] = await Promise.all([
      api.getSites(),
      api.getBalance(),
    ])
    return { sites, balance }
  })

  const sites = data?.sites ?? []
  const balance = data?.balance ?? null

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [cost, setCost] = useState('10')
  const [duration, setDuration] = useState('30')

  const [pairingPin, setPairingPin] = useState<string | null>(null)
  const [pairingMessage, setPairingMessage] = useState('')
  const [generatingPin, setGeneratingPin] = useState(false)

  const [resetMessage, setResetMessage] = useState('')
  const [resettingToken, setResettingToken] = useState(false)

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
      retry()
    } catch (e) {
      console.error(e)
    }
  }

  const removeSite = async (id: string, isPreconfigured: boolean) => {
    if (isPreconfigured) return
    if (!confirm('Remove this site?')) return
    try {
      await api.deleteSite(id)
      retry()
    } catch (e) {
      console.error(e)
    }
  }

  const generatePin = async () => {
    setGeneratingPin(true)
    setPairingMessage('')
    setPairingPin(null)
    try {
      const result = await api.generatePairingPin()
      setPairingPin(result.pin)
      setPairingMessage('Enter this pin in the browser extension within 60 seconds.')
    } catch (e) {
      setPairingMessage('Failed to generate pin.')
    } finally {
      setGeneratingPin(false)
    }
  }

  const handleResetToken = async () => {
    if (!confirm('This will invalidate all paired extensions and require re-pairing. Continue?')) return
    setResettingToken(true)
    setResetMessage('')
    try {
      const result = await api.resetToken()
      setResetMessage('Token reset successfully. Extensions must be re-paired.')
    } catch (e) {
      setResetMessage('Failed to reset token.')
    } finally {
      setResettingToken(false)
    }
  }

  if (loading) {
    return <Layout balance={balance?.balance ?? 0}><p>Loading...</p></Layout>
  }

  return (
    <Layout balance={balance?.balance ?? 0}>
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={retry}>Retry</button>
        </div>
      )}

      <div className="card">
        <h2>Pair Browser Extension</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
          The browser extension needs a one-time token to communicate with the desktop app.
        </p>
        <button
          className="btn btn-primary"
          onClick={generatePin}
          disabled={generatingPin}
        >
          {generatingPin ? 'Generating...' : 'Generate Pairing Pin'}
        </button>
        {pairingPin && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#0f172a',
            border: '1px solid #38bdf8',
            borderRadius: '0.5rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.5rem' }}>
              {pairingPin}
            </div>
          </div>
        )}
        {pairingMessage && (
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            {pairingMessage}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Access Token</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
          The access token is stored on disk and persists across app restarts.
          Paired extensions remain connected indefinitely.
        </p>
        <button
          className="btn btn-danger"
          onClick={handleResetToken}
          disabled={resettingToken}
        >
          {resettingToken ? 'Resetting...' : 'Reset Access Token'}
        </button>
        {resetMessage && (
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            {resetMessage}
          </p>
        )}
      </div>

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