import { useQuery } from '@tanstack/react-query'
import { getFailedRuns, getPipelines } from '../api/pipelines'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import { Activity as ActivityIcon, GitCommit } from 'lucide-react'

interface ActivityProps {
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

export default function Activity({ onNavigate }: ActivityProps) {
  const { data: failedRuns = [], isLoading } = useQuery({
    queryKey: ['failedRuns'],
    queryFn: () => getFailedRuns(30),
    refetchInterval: 15000,
  })

  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: getPipelines,
  })

  const pipelineMap = Object.fromEntries(pipelines.map(p => [p.id, p.name]))

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
          Activity
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Recent pipeline activity — auto-refreshes every 15 seconds
        </p>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
          Loading...
        </div>
      ) : failedRuns.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <ActivityIcon size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <p style={{ fontWeight: 500, marginBottom: '6px' }}>No activity yet</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Pipeline runs will appear here as they happen
          </p>
        </Card>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute',
            left: '19px',
            top: '8px',
            bottom: '8px',
            width: '1px',
            background: 'var(--border)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {failedRuns.map((run) => (
              <div
                key={run.id}
                onClick={() => onNavigate('run-detail', run.id)}
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: 'var(--radius)',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: run.status === 'failed'
                    ? 'var(--failed)'
                    : run.status === 'success'
                    ? 'var(--success)'
                    : 'var(--running)',
                  flexShrink: 0,
                  marginTop: '6px',
                  border: '2px solid var(--bg)',
                  zIndex: 1,
                  position: 'relative',
                  marginLeft: '16px',
                }} />

                {/* Content */}
                <div style={{
                  flex: 1,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 16px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StatusBadge status={run.status} />
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}>
                        {pipelineMap[run.pipeline_id] ?? 'Unknown pipeline'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatTime(run.created_at)}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                  }}>
                    {run.commit_message ?? 'No commit message'}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                    }}>
                      <GitCommit size={10} />
                      {run.commit_sha?.slice(0, 7) ?? '—'}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                    }}>
                      {run.branch ?? '—'}
                    </span>
                    {run.triggered_by && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        by {run.triggered_by}
                      </span>
                    )}
                    {run.ai_analysis && (
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--accent)',
                        background: 'var(--accent)18',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        AI analyzed · {run.ai_analysis.severity} severity
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}