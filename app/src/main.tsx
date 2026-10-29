import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'

// GitHub Pages has no rewrite rule, so a refresh on a deep link like
// /app/editor/123 is served 404.html. That page stashes the intended URL and
// bounces to the app root; restore it before the router reads window.location.
const REDIRECT_KEY = 'kennings:redirect'
const savedRedirect = sessionStorage.getItem(REDIRECT_KEY)
if (savedRedirect) {
  sessionStorage.removeItem(REDIRECT_KEY)
  window.history.replaceState(null, '', savedRedirect)
}

// Vite's base is '/' in dev and '/<repo>/app/' in a Pages build. react-router
// needs the same value as a basename or every route misses.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)