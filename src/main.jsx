import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// NOTE: no <StrictMode> — it double-invokes effects in development, which would
// make the Room page emit the socket join handshake twice (duplicate participants).
createRoot(document.getElementById('root')).render(<App />)
