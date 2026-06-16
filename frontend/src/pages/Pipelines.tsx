import { useState, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPipelines, createPipeline } from '../api/pipelines'
import Card from '../components/Card'
import { GitBranch, Plus, ExternalLink, X } from 'lucide-react'

interface PipelinesProps {
  onNavigate: (page: string, id?: string) => void
}

function AddPipelineModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const queryClient = useQueryClient()

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () => createPipeline({ name, repo_url: repoUrl, branch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      onSuccess()
      onClose()
    },
  })

  const inputStyle: CSSProperties = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '13px',
  }

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        width: '420px',
        maxWidth: '90vw',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: 500 }}>Add Pipeline</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Pipeline name</label>
            <input
              style={inputStyle}
              placeholder="e.g. My App CI"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Repository URL</label>
            <input
              style={inputStyle}
              placeholder="https://github.com/username/repo"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Branch</label>
            <input
              style={inputStyle}
              placeholder="main"
              value={branch}
              onChange={e => setBranch(e.target.value)}
            />
          </div>

          {isError && (
            <p style={{ color: 'var(--failed)', fontSize: '12px' }}>
              Failed to create pipeline. Check the URL and try again.
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                color: 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                fontSize: '13px',
                border: '1px solid var(--border)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => mutate()}
              disabled={isPending || !name || !repoUrl}
              style={{
                background: 'var(--accent)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                fontSize: '13px',
                fontWeight: 500,
                opacity: isPending || !name || !repoUrl ? 0.6 : 1,
              }}
            >
              {isPending ? 'Adding...' : 'Add Pipeline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pipelines({ onNavigate: _onNavigate }: PipelinesProps) {
  const [showModal, setShowModal] = useState(false)

  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: getPipelines,
  })

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
            Pipelines
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''} monitored
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--accent)',
            color: 'white',
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          <Plus size={14} />
          Add Pipeline
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>
          Loading...
        </div>
      ) : pipelines.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px' }}>
          <GitBranch size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <p style={{ fontWeight: 500, marginBottom: '6px' }}>No pipelines yet</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            Add your first pipeline to start monitoring
          </p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'var(--accent)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              fontSize: '13px',
            }}
          >
            Add Pipeline
          </button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pipelines.map(pipeline => (
            <Card key={pipeline.id} style={{ padding: '16px 20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--accent)18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <GitBranch size={16} color="var(--accent)" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '14px', marginBottom: '2px' }}>
                      {pipeline.name}
                    </p>
                    <p style={{
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}>
                      {pipeline.branch} · {pipeline.repo_url}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    color: pipeline.is_active ? 'var(--success)' : 'var(--text-muted)',
                    background: pipeline.is_active ? 'var(--success)18' : 'var(--bg-hover)',
                    padding: '3px 8px',
                    borderRadius: '100px',
                    border: `1px solid ${pipeline.is_active ? 'var(--success)30' : 'var(--border)'}`,
                  }}>
                    {pipeline.is_active ? 'active' : 'inactive'}
                  </span>
                  <a
                    href={pipeline.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <AddPipelineModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}
