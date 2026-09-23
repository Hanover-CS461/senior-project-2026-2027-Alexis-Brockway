import { Link } from 'react-router-dom'

const genres = [
  {
    name: 'Fiction',
    blurb: 'Short stories and flash fiction.',
  },
  {
    name: 'Poetry',
    blurb: 'Poems of any length or form.',
  },
  {
    name: 'Creative Nonfiction',
    blurb: 'Essays and memoir.',
  },
  {
    name: 'Visual Arts',
    blurb: 'Photography and other visual work.',
  },
]

function GenrePage() {
  return (
    <div className="home">
      <h1>What are you submitting?</h1>
      <p className="lede">Pick a genre to start your submission.</p>

      <div className="cards">
        {genres.map((genre) => (
          <div className="card" key={genre.name}>
            <h2>{genre.name}</h2>
            <p>{genre.blurb}</p>
            <Link
              to={`/submit?genre=${encodeURIComponent(genre.name)}`}
              className="btn"
            >
              Submit {genre.name}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GenrePage