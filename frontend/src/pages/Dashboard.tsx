import { useQuery } from '@tanstack/react-query'
import { getPipelines, getFailedRuns } from '../api/pipelines'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { AlertCircle, GitBranch, CheckCircle, Activity } from 'lucide-react'

interface DashboardProps {
  onNavigate: (page: string, id?: string) => void
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '12px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {label}
          </p>
          <p style={{
            fontSize: '28px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}>
            {value}
          </p>
        </div>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius)',
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </Card>
  )
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: pipelines = [], isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: getPipelines,
  })

  const { data: failedRuns = [], isLoading: loadingRuns } = useQuery({
    queryKey: ['failedRuns'],
    queryFn: () => getFailedRuns(10),
  })

//   const totalRuns = failedRuns.length
  const successRate = pipelines.length > 0
    ? Math.round(((pipelines.length - failedRuns.length) / Math.max(pipelines.length, 1)) * 100)
    : 0

  return (
    <div style={{ maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 600,
          marginBottom: '4px',
        }}>
          Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Monitor your CI/CD pipelines and AI-powered failure analysis
        </p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Pipelines"
          value={loadingPipelines ? '...' : pipelines.length}
          icon={GitBranch}
          color="var(--accent)"
        />
        <StatCard
          label="Failed Runs"
          value={loadingRuns ? '...' : failedRuns.length}
          icon={AlertCircle}
          color="var(--failed)"
        />
        <StatCard
          label="Success Rate"
          value={loadingPipelines ? '...' : `${successRate}%`}
          icon={CheckCircle}
          color="var(--success)"
        />
        <StatCard
          label="Active Workers"
          value="1"
          icon={Activity}
          color="var(--running)"
        />
      </div>

      {/* Recent failures */}
      <Card style={{ padding: 0 }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: 500 }}>
            Recent Failures
          </h2>
          <button
            onClick={() => onNavigate('failures')}
            style={{
              background: 'none',
              color: 'var(--accent)',
              fontSize: '12px',
            }}
          >
            View all →
          </button>
        </div>

        {loadingRuns ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : failedRuns.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <CheckCircle size={32} color="var(--success)" style={{ marginBottom: '8px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              No failed runs. Everything is healthy.
            </p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              padding: '8px 20px',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <span>Commit</span>
              <span>Branch</span>
              <span>Status</span>
              <span>Duration</span>
              <span>Time</span>
            </div>

            {/* Table rows */}
            {failedRuns.map((run) => (
              <div
                key={run.id}
                onClick={() => onNavigate('run-detail', run.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                  padding: '12px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                <div>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {run.commit_message ?? 'No commit message'}
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}>
                    {run.commit_sha?.slice(0, 7) ?? '—'}
                  </p>
                </div>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace',
                }}>
                  {run.branch ?? '—'}
                </span>
                <StatusBadge status={run.status} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {formatDuration(run.duration_seconds)}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatTime(run.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}