import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import GenrePage from './pages/GenrePage'
import GenreRulesPage from './pages/GenreRulesPage'
import SubmitPage from './pages/SubmitPage'
import ReaderQueuePage from './pages/ReaderQueuePage'
import EditorDashboardPage from './pages/EditorDashboardPage'

function App() {
  return (
    <div className="app-shell">
      <nav className="site-nav">
        <Link to="/" className="brand">
          The Journal
        </Link>
        <div className="nav-links">
          <Link to="/submit">Submit</Link>
          <Link to="/reader">Reader queue</Link>
          <Link to="/editor">Editor dashboard</Link>
        </div>
      </nav>

      <main className="content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit/genre" element={<GenrePage />} />
          <Route path="/submit/genre/:genreSlug" element={<GenreRulesPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/reader" element={<ReaderQueuePage />} />
          <Route path="/editor" element={<EditorDashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App