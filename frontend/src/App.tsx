import { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import RunDetail from './pages/RunDetail'
import Pipelines from './pages/Pipelines'
import FailedRuns from './pages/FailedRuns'
import Activity from './pages/Activity'

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
      case 'pipelines':
        return <Pipelines onNavigate={handleNavigate} />
      case 'failures':
        return <FailedRuns onNavigate={handleNavigate} />
      case 'activity':
        return <Activity onNavigate={handleNavigate} />
      case 'run-detail':
        return selectedId
          ? <RunDetail runId={selectedId} onBack={() => handleNavigate('dashboard')} />
          : <Dashboard onNavigate={handleNavigate} />
      default:
        return <Dashboard onNavigate={handleNavigate} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  )
}

export default App