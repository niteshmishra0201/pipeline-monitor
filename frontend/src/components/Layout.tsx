import { useState } from 'react'
import { GitBranch, Activity, AlertCircle, Home, Menu, X } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'pipelines', label: 'Pipelines', icon: GitBranch },
  { id: 'failures', label: 'Failed Runs', icon: AlertCircle },
  { id: 'activity', label: 'Activity', icon: Activity },
]

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '220px' : '60px',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minHeight: '57px',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              color: 'var(--text-secondary)',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              flexShrink: 0,
            }}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          {sidebarOpen && (
            <span style={{
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}>
              Pipeline Monitor
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ padding: '8px', flex: 1 }}>
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px',
                  borderRadius: 'var(--radius)',
                  background: isActive ? 'var(--bg-hover)' : 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  marginBottom: '2px',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!isActive)(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  if (!isActive)(e.currentTarget as HTMLButtonElement).style.background = 'none'
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {sidebarOpen && (
                  <span style={{ fontSize: '13px', fontWeight: isActive ? 500 : 400 }}>
                    {label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            color: 'var(--text-muted)',
            fontSize: '11px',
          }}>
            v0.1.0 · development
          </div>
        )}
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: '57px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: 'var(--bg-card)',
          flexShrink: 0,
        }}>
          <span style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textTransform: 'capitalize',
          }}>
            {navItems.find(n => n.id === currentPage)?.label ?? 'Dashboard'}
          </span>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}