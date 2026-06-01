import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (window.location.pathname === '/Sailing') {
  window.history.replaceState(null, '', `/Sailing/${window.location.search}${window.location.hash}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
