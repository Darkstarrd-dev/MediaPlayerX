import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import BenchRoot from './bench/BenchRoot.tsx'

const benchMode = new URLSearchParams(window.location.search).get('bench')

createRoot(document.getElementById('root')!).render(
  benchMode ? (
    <BenchRoot benchMode={benchMode} />
  ) : (
    <StrictMode>
      <App />
    </StrictMode>
  ),
)
