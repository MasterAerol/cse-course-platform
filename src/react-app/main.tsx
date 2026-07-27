import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App'
import { AuthProvider } from './auth/AuthProvider'
import './styles.css'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('React root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
