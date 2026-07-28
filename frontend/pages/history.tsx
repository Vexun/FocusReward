import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { api, PointTransaction, PointBalance, ActiveUnlock } from '@/lib/api'

export default function HistoryPage() {
  const [txs, setTxs] = useState<PointTransaction[]>([])
  const [balance, setBalance] = useState<PointBalance | null>(null)
  const [activeUnlocks, setActiveUnlocks] = useState<ActiveUnlock[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [h, b, u] = await Promise.all([
        api.getHistory(),
        api.getBalance(),
        api.getActiveUnlocks(),
      ])
      setTxs(h)
      setBalance(b)
      setActiveUnlocks(u)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return <Layout balance={balance?.balance ?? 0}><p>Loading...</p></Layout>
  }

  return (
    <Layout balance={balance?.balance ?? 0}>
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
