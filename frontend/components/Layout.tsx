import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Layout({ children, balance }: { children: React.ReactNode; balance: number }) {
  const router = useRouter()
  const links = [
    { href: '/', label: 'Tasks' },
    { href: '/rewards', label: 'Rewards' },
    { href: '/history', label: 'History' },
    { href: '/settings', label: 'Settings' },
  ]
  return (
    <>
      <nav>
        <h1>FocusReward</h1>
        {links.map(l => (
          <Link key={l.href} href={l.href} className={router.pathname === l.href ? 'active' : ''}>
            {l.label}
          </Link>
        ))}
        <div className="balance">{balance} pts</div>
      </nav>
      <main>{children}</main>
    </>
  )
}