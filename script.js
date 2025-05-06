const { useState, useEffect } = React;

function App() {
  const [view, setView] = useState('home');
  const [selectedShow, setSelectedShow] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const goHome = () => {
    setView('home');
    setSelectedShow(null);
    setSelectedPerson(null);
  };

  const handleShowClick = (show) => {
    setSelectedShow(show);
    setView('details');
  };

  const handlePersonClick = (person) => {
    setSelectedPerson(person);
    setView('person');
  };

  return (
    React.createElement('div', null,
      React.createElement('button', { onClick: goHome }, "🏠 Accueil"),
      view === 'home' && React.createElement(SearchPage, { onShowClick: handleShowClick }),
      view === 'details' && selectedShow && React.createElement(ShowDetails, {
        show: selectedShow,
        onPersonClick: handlePersonClick
      }),
      view === 'person' && selectedPerson && React.createElement(PersonDetails, {
        person: selectedPerson,
        onShowClick: handleShowClick
      })
    )
  );
}

function SearchPage({ onShowClick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("search-history")) || [];
    setHistory(saved);
  }, []);

  const search = async (q = query) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    const found = data.map(r => r.show);
    setResults(found);
    setHasSearched(true);
    saveToHistory(trimmed);
  };

  const saveToHistory = (term) => {
    let updated = [term, ...history.filter(h => h !== term)];
    if (updated.length > 10) updated = updated.slice(0, 10);
    setHistory(updated);
    localStorage.setItem("search-history", JSON.stringify(updated));
  };

  const removeFromHistory = (term) => {
    const updated = history.filter(h => h !== term);
    setHistory(updated);
    localStorage.setItem("search-history", JSON.stringify(updated));
  };

  return (
    <div>
      <h1>Recherche de séries TV</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && search()}
        placeholder="Tapez une série (ex: Breaking Bad)"
      />

      {history.length > 0 && (
        <div>
          <strong>Recherches récentes :</strong>
          <ul>
            {history.map((term, index) => (
              <li key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="clickable" onClick={() => { setQuery(term); search(term); }}>
                  {term}
                </span>
                <button
                  onClick={() => removeFromHistory(term)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer',
                  }}
                  title="Supprimer"
                >
                  ❌
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasSearched && results.length === 0 && (
        <p>Aucune série trouvée pour “{query.trim()}”.</p>
      )}

      <div className="series-list">
        {results.map((show) => (
          <div key={show.id} className="series-item" onClick={() => onShowClick(show)}>
            <strong>{show.name}</strong> {show.premiered ? `(${show.premiered.slice(0, 4)})` : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShowDetails({ show, onPersonClick }) {
  const [episodes, setEpisodes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [cast, setCast] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [epRes, seasonRes, castRes] = await Promise.all([
        fetch(`https://api.tvmaze.com/shows/${show.id}/episodes`),
        fetch(`https://api.tvmaze.com/shows/${show.id}/seasons`),
        fetch(`https://api.tvmaze.com/shows/${show.id}/cast`)
      ]);

      setEpisodes(await epRes.json());
      setSeasons(await seasonRes.json());
      setCast(await castRes.json());
    };

    fetchAll();
  }, [show]);

  return (
    <div>
      <h2>{show.name}</h2>
      {show.image && <img src={show.image.medium} alt={show.name} />}
      <div dangerouslySetInnerHTML={{ __html: show.summary }}></div>

      <h3>Saisons</h3>
      <ul>
        {seasons.map(season => (
          <li key={season.id}>Saison {season.number} ({season.episodeOrder || '?'})</li>
        ))}
      </ul>

      <h3>Épisodes</h3>
      <ul>
        {episodes.map(ep => (
          <li key={ep.id}>S{ep.season}E{ep.number} – {ep.name}</li>
        ))}
      </ul>

      <h3>Acteurs</h3>
      <ul>
        {cast.map(({ person, character }) => (
          <li key={person.id}>
            <span className="clickable" onClick={() => onPersonClick(person)}>
              {person.name}
            </span> (rôle : {character.name})
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonDetails({ person, onShowClick }) {
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const resPerson = await fetch(`https://api.tvmaze.com/people/${person.id}`);
      const dataPerson = await resPerson.json();
      setDetails(dataPerson);

      const resCredits = await fetch(`https://api.tvmaze.com/people/${person.id}/castcredits?embed=show`);
      const dataCredits = await resCredits.json();
      const shows = dataCredits.map(c => c._embedded.show);
      const uniqueShows = Array.from(new Map(shows.map(s => [s.id, s])).values());
      setCredits(uniqueShows);
    };

    fetchAll();
  }, [person]);

  if (!details) return <p>Chargement...</p>;

  return (
    <div>
      <h2>{details.name}</h2>
      {details.image && <img src={details.image.medium} alt={details.name} />}
      <p>Genre : {details.gender}</p>
      <p>Date de naissance : {details.birthday || 'Inconnue'}</p>
      <p>Nationalité : {details.country ? details.country.name : 'Inconnue'}</p>

      {credits.length > 0 && (
        <div>
          <h3>Séries jouées</h3>
          <ul>
            {credits.map(show => (
              <li key={show.id}>
                <span className="clickable" onClick={() => onShowClick(show)}>
                  {show.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
