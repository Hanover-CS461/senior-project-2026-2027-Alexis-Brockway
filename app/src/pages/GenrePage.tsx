import { Link } from 'react-router-dom'
import { genres } from '../data/genres'

function GenrePage() {
  return (
    <div className="home">
      <h1>What are you submitting?</h1>
      <p className="lede">Pick a genre to see the rules and start your submission.</p>

      <div className="cards">
        {genres.map((genre) => (
          <div className="card" key={genre.slug}>
            <h2>{genre.name}</h2>
            <p>{genre.blurb}</p>
            <Link to={`/submit/genre/${genre.slug}`} className="btn">
              Submit {genre.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GenrePage