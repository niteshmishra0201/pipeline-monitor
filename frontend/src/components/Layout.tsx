import { useState } from 'react'
import { GitBranch, Activity, AlertCircle, Home, Menu, X } from 'lucide-react'
import { useWebSocket } from '../hooks/useWebSocket'
import { useQueryClient } from '@tanstack/react-query'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string, id?: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'pipelines', label: 'Pipelines', icon: GitBranch },
  { id: 'failures', label: 'Failed Runs', icon: AlertCircle },
  { id: 'activity', label: 'Activity', icon: Activity },
]

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const queryClient = useQueryClient()

  const { isConnected } = useWebSocket((message) => {
    if (message.event === 'analysis_completed') {
      queryClient.invalidateQueries({ queryKey: ['failedRuns'] })
      queryClient.invalidateQueries({ queryKey: ['run', message.data.run_id as string] })
    }
    if (message.event === 'pipeline_run_created' || message.event === 'pipeline_run_failed') {
      queryClient.invalidateQueries({ queryKey: ['failedRuns'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    }
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
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

        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
        }}>
          {sidebarOpen ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isConnected ? 'var(--success)' : 'var(--failed)',
                flexShrink: 0,
              }} />
              {isConnected ? 'Live' : 'Reconnecting...'}
              <span style={{ marginLeft: 'auto' }}>v0.1.0</span>
            </div>
          ) : (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isConnected ? 'var(--success)' : 'var(--failed)',
              margin: '0 auto',
            }} />
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{
          height: '57px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: 'var(--bg-card)',
          flexShrink: 0,
          justifyContent: 'space-between',
        }}>
          <span style={{
            color: 'var(--text-secondary)',
            fontSize: '13px',
            textTransform: 'capitalize',
          }}>
            {navItems.find(n => n.id === currentPage)?.label ?? 'Dashboard'}
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: isConnected ? 'var(--success)' : 'var(--text-muted)',
          }}>
            <div style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: isConnected ? 'var(--success)' : 'var(--text-muted)',
            }} />
            {isConnected ? 'Real-time connected' : 'Connecting...'}
          </div>
        </header>

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