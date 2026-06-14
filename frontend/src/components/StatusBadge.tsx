const statusColors: Record<string, string> = {
  success: 'var(--success)',
  failed: 'var(--failed)',
  running: 'var(--running)',
  cancelled: 'var(--cancelled)',
  critical: 'var(--critical)',
  high: 'var(--high)',
  medium: 'var(--medium)',
  low: 'var(--low)',
}

export default function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] ?? 'var(--text-muted)'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '11px',
      fontWeight: 500,
      color,
      background: `${color}18`,
      padding: '3px 8px',
      borderRadius: '100px',
      border: `1px solid ${color}30`,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }} />
      {status}
    </span>
  )
}