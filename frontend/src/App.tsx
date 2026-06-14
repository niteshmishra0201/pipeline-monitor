import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import RunDetail from './pages/RunDetail'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedId, setSelectedId] = useState<string | undefined>()

  const handleNavigate = (page: string, id?: string) => {
    setCurrentPage(page)
    if (id) setSelectedId(id)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />
      case 'run-detail':
        return selectedId
          ? <RunDetail runId={selectedId} onBack={() => handleNavigate('dashboard')} />
          : <Dashboard onNavigate={handleNavigate} />
      case 'pipelines':
        return <div style={{ color: 'var(--text-secondary)' }}>Pipelines page — coming next</div>
      case 'failures':
        return <div style={{ color: 'var(--text-secondary)' }}>Failed Runs page — coming next</div>
      default:
        return null
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  )
}

export default App