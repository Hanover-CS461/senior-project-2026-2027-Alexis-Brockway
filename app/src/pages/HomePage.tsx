import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <div className="home">
      <h1>Submittable replacement</h1>
      <p className="lede">
        A custom submission manager for the college literary magazine.
      </p>

      <div className="cards">
        <div className="card">
          <h2>I'm a writer</h2>
          <p>Submit a story, poem, or essay and track its status.</p>
          <Link to="/submit" className="btn">
            Submit a manuscript
          </Link>
        </div>

        <div className="card">
          <h2>I'm a reader</h2>
          <p>Review submissions without ever seeing who wrote them.</p>
          <Link to="/reader" className="btn">
            Open reader queue
          </Link>
        </div>

        <div className="card">
          <h2>I'm a managing editor</h2>
          <p>Run the whole review workflow and manage the journal.</p>
          <Link to="/editor" className="btn">
            Open editor dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HomePage