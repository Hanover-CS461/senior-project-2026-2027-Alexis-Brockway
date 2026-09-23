import { Link, useParams, Navigate } from 'react-router-dom'
import { getGenre, generalRequirements } from '../data/genres'

function GenreRulesPage() {
  const { genreSlug } = useParams()
  const genre = genreSlug ? getGenre(genreSlug) : undefined

  if (!genre) {
    return <Navigate to="/submit/genre" replace />
  }

  return (
    <div className="page">
      <h1>{genre.name} — Submission Rules</h1>
      <p className="lede">{genre.blurb}</p>

      <ul className="rules">
        {genre.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      <h2>General requirements</h2>
      <ul className="rules">
        {generalRequirements.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      <Link
        to={`/submit?genre=${encodeURIComponent(genre.slug)}`}
        className="btn"
      >
        Continue to {genre.name} form
      </Link>

      <p className="back-link">
        <Link to="/submit/genre">← Choose a different genre</Link>
      </p>
    </div>
  )
}

export default GenreRulesPage