import { useState } from 'react'
import InputPage from './pages/InputPage'
import ResultsPage from './pages/ResultsPage'
import DebateHistory from './components/DebateHistory'
import { ToastProvider } from './components/ToastProvider'
import './index.css'

export default function App() {
  const [page, setPage]       = useState('input')   // 'input' | 'results'
  const [result, setResult]   = useState(null)
  const [showHistory, setShowHistory] = useState(false)

  const handleSubmit = (data) => {
    setResult(data)
    setPage('results')
  }

  const handleBack = () => {
    setPage('input')
    setResult(null)
  }

  const handleHistorySelect = (data) => {
    setResult(data)
    setPage('results')
    setShowHistory(false)
  }

  return (
    <ToastProvider>
      {showHistory && (
        <DebateHistory
          onClose={() => setShowHistory(false)}
          onSelect={handleHistorySelect}
        />
      )}
      {page === 'results' && result ? (
        <ResultsPage result={result} onBack={handleBack} />
      ) : (
        <InputPage
          onSubmit={handleSubmit}
          onHistoryOpen={() => setShowHistory(true)}
        />
      )}
    </ToastProvider>
  )
}
