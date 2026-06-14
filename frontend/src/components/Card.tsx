interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
}

export default function Card({ children, style }: CardProps) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      ...style,
    }}>
      {children}
    </div>
  )
}