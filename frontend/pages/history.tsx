import { api, PointTransaction, PointBalance, ActiveUnlock } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import Layout from '@/components/Layout'

export default function HistoryPage() {
  const { data, loading, error, retry } = useApiData(async () => {
    const [txs, balance, activeUnlocks] = await Promise.all([
      api.getHistory(),
      api.getBalance(),
      api.getActiveUnlocks(),
    ])
    return { txs, balance, activeUnlocks }
  })

  const txs = data?.txs ?? []
  const balance = data?.balance ?? null
  const activeUnlocks = data?.activeUnlocks ?? []

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

      {activeUnlocks.length > 0 && (
        <div className="card">
          <h2>Active Unlocks</h2>
          {activeUnlocks.map((u, i) => (
            <div key={i} className="task-item">
              <div className="task-info">
                <div className="task-title">{u.name}</div>
                <div className="task-meta">
                  <span style={{ fontSize: '0.8125rem', color: '#22c55e' }}>
                    Expires: {u.expires_at}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Transaction History</h2>
        {txs.length === 0 ? (
          <div className="empty-state">No transactions yet.</div>
        ) : (
          txs.map(tx => (
            <div key={tx.id} className="tx-item">
              <div className={`tx-amount ${tx.type === 'earned' ? 'tx-earned' : 'tx-spent'}`}>
                {tx.type === 'earned' ? '+' : '-'}{tx.amount}
              </div>
              <div className="tx-info">
                <div className="tx-type">
                  {tx.type === 'earned' ? 'Earned' : 'Spent'}
                  {tx.type === 'earned' ? ' (task completion)' : ' (site unlock)'}
                </div>
                <div className="tx-date">{tx.created_at}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}