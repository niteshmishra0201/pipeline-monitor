import { useQuery } from '@tanstack/react-query'
import { getFailedRuns } from '../api/pipelines'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { AlertCircle, Cpu } from 'lucide-react'

interface FailedRunsProps {
  onNavigate: (page: string, id?: string) => void
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

export default function FailedRuns({ onNavigate }: FailedRunsProps) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ['failedRuns'],
    queryFn: () => getFailedRuns(50),
    refetchInterval: 30000,
  })

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
          Failed Runs
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          {runs.length} failed run{runs.length !== 1 ? 's' : ''} — click any row to view AI analysis
        </p>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
          Loading...
        </div>
      ) : runs.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <AlertCircle size={32} color="var(--success)" style={{ marginBottom: '12px' }} />
          <p style={{ fontWeight: 500, marginBottom: '6px' }}>No failed runs</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            All pipelines are passing. Great work!
          </p>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
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
            <span>Time</span>
            <span>AI</span>
          </div>

          {runs.map((run, index) => (
            <div
              key={run.id}
              onClick={() => onNavigate('run-detail', run.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 80px',
                padding: '14px 20px',
                borderBottom: index < runs.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                alignItems: 'center',
                transition: 'background 0.1s ease',
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
                  marginBottom: '3px',
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
                  #{run.run_number} · {run.commit_sha?.slice(0, 7) ?? '—'}
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

              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {formatTime(run.created_at)}
              </span>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                {run.ai_analysis ? (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    background: 'var(--accent)18',
                    padding: '3px 8px',
                    borderRadius: '100px',
                  }}>
                    <Cpu size={10} />
                    analyzed
                  </span>
                ) : (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}>
                    —
                  </span>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}