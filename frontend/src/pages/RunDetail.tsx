import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getRunWithAnalysis,
  triggerAnalysis,
  getTaskStatus,
} from '../api/pipelines'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import {
  ArrowLeft,
  Cpu,
  GitCommit,
  Clock,
  User,
  AlertTriangle,
  Wrench,
  Zap,
  RefreshCw,
} from 'lucide-react'

interface RunDetailProps {
  runId: string
  onBack: () => void
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <Icon size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      <span style={{
        color: 'var(--text-muted)',
        fontSize: '12px',
        width: '100px',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        color: 'var(--text-primary)',
        fontSize: '13px',
        fontFamily: label === 'Commit' ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}

function SeverityBar({ severity }: { severity: string }) {
  const levels = ['low', 'medium', 'high', 'critical']
  const index = levels.indexOf(severity)
  const colors = ['var(--low)', 'var(--medium)', 'var(--high)', 'var(--critical)']

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {levels.map((level, i) => (
        <div
          key={level}
          style={{
            width: '28px',
            height: '4px',
            borderRadius: '2px',
            background: i <= index ? colors[i] : 'var(--border)',
            transition: 'background 0.2s ease',
          }}
        />
      ))}
      <span style={{
        marginLeft: '6px',
        fontSize: '12px',
        color: colors[index] ?? 'var(--text-muted)',
        fontWeight: 500,
        textTransform: 'capitalize',
      }}>
        {severity}
      </span>
    </div>
  )
}

export default function RunDetail({ runId, onBack }: RunDetailProps) {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const queryClient = useQueryClient()

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => getRunWithAnalysis(runId),
    refetchInterval: polling ? 3000 : false,
  })

const { data: taskStatus } = useQuery({
  queryKey: ['taskStatus', taskId],
  queryFn: () => getTaskStatus(taskId!),
  enabled: !!taskId && polling,
  refetchInterval: (query) => {
    const data = query.state.data
    if (data && (data.status === 'completed' || data.status === 'failed')) {
      setPolling(false)
      setTaskId(null)
      queryClient.invalidateQueries({ queryKey: ['run', runId] })
      return false
    }
    return polling ? 2000 : false
  },
})

  const { mutate: triggerAnalysisMutation, isPending } = useMutation({
    mutationFn: () => triggerAnalysis(runId),
    onSuccess: (data) => {
      if (data.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: ['run', runId] })
      } else {
        setTaskId(data.task_id)
        setPolling(true)
      }
    },
  })

  if (isLoading) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
        Loading run details...
      </div>
    )
  }

  if (!run) {
    return (
      <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
        Run not found.
      </div>
    )
  }

  const analysis = run.ai_analysis
  const isFailed = run.status === 'failed'

  return (
    <div style={{ maxWidth: '900px' }}>

      {/* Back button + header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            marginBottom: '12px',
            padding: 0,
          }}
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>
            Run #{run.run_number}
          </h1>
          <StatusBadge status={run.status} />
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          {run.commit_message ?? 'No commit message'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

        {/* Run info */}
        <Card>
          <h2 style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
            Run Details
          </h2>
          <div>
            <InfoRow icon={GitCommit} label="Commit" value={run.commit_sha?.slice(0, 7) ?? '—'} />
            <InfoRow icon={GitCommit} label="Branch" value={run.branch ?? '—'} />
            <InfoRow icon={User} label="Triggered by" value={run.triggered_by ?? '—'} />
            <InfoRow icon={Clock} label="Duration" value={
              run.duration_seconds ? `${run.duration_seconds}s` : '—'
            } />
            <InfoRow icon={Clock} label="Started" value={
              run.started_at ? new Date(run.started_at).toLocaleString() : '—'
            } />
          </div>
        </Card>

        {/* AI Analysis trigger */}
        {isFailed && !analysis && (
          <Card style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--accent)18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Cpu size={20} color="var(--accent)" />
            </div>
            <div>
              <p style={{ fontWeight: 500, marginBottom: '4px', fontSize: '14px' }}>
                AI Analysis Available
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Let AI analyze the failure logs and suggest a fix
              </p>
            </div>
            {polling ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
              }}>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                {taskStatus?.status === 'running' ? 'Analyzing...' : 'Queued...'}
              </div>
            ) : (
              <button
                onClick={() => triggerAnalysisMutation()}
                disabled={isPending}
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius)',
                  fontSize: '13px',
                  fontWeight: 500,
                  opacity: isPending ? 0.7 : 1,
                }}
              >
                {isPending ? 'Queuing...' : 'Analyze with AI'}
              </button>
            )}
          </Card>
        )}

        {/* Show analysis summary card if exists */}
        {analysis && (
          <Card>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <h2 style={{ fontSize: '13px', fontWeight: 500 }}>AI Summary</h2>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                background: 'var(--bg-hover)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                {analysis.model_used}
              </span>
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              marginBottom: '16px',
              lineHeight: '1.6',
            }}>
              {analysis.summary}
            </p>
            <SeverityBar severity={analysis.severity ?? 'low'} />
          </Card>
        )}
      </div>

      {/* Full AI Analysis */}
      {analysis && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          <Card>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <AlertTriangle size={14} color="var(--failed)" />
              <h2 style={{ fontSize: '13px', fontWeight: 500 }}>Root Cause</h2>
              <span style={{
                marginLeft: 'auto',
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'capitalize',
              }}>
                {analysis.error_category}
              </span>
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              lineHeight: '1.7',
            }}>
              {analysis.root_cause}
            </p>
          </Card>

          <Card>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <Wrench size={14} color="var(--success)" />
              <h2 style={{ fontSize: '13px', fontWeight: 500 }}>Fix Suggestion</h2>
              <span style={{
                marginLeft: 'auto',
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'capitalize',
              }}>
                confidence: {analysis.confidence}
              </span>
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '13px',
              lineHeight: '1.7',
              whiteSpace: 'pre-line',
            }}>
              {analysis.fix_suggestion}
            </p>
          </Card>
        </div>
      )}

      {/* Raw logs */}
      {run.logs && (
        <Card style={{ padding: 0 }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Zap size={13} color="var(--text-muted)" />
            <h2 style={{ fontSize: '13px', fontWeight: 500 }}>Raw Logs</h2>
          </div>
          <pre style={{
            padding: '16px',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            lineHeight: '1.8',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: '300px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {run.logs}
          </pre>
        </Card>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}