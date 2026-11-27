import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts: no request to Google Fonts.
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800-italic.css'
import './index.css'
import './scannerSetup.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
