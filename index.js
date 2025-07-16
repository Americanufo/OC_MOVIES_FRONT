// Fonction utilitaire pour remplir une grille de films avec overlay
function fillMovieGrid(movies, gridSelector) {
  const gridItems = document.querySelectorAll(gridSelector);
  gridItems.forEach(item => item.innerHTML = "");
  movies.forEach((movie, index) => {
    if (gridItems[index]) {
      gridItems[index].innerHTML = `
        <img src="${movie.image_url}" alt="${movie.title}">
        <div class="movie-overlay">
          <span class="movie-title">${movie.title}</span>
          <button class="movie-detail-btn">Détails</button>
        </div>
      `;
    }
  });
}

// Récupère les films selon les paramètres donnés
async function fetchMovies(params) {
  const url = new URL("http://localhost:8000/api/v1/titles/");
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  const response = await fetch(url);
  if (!response.ok) throw new Error('Erreur lors de la récupération des films');
  return (await response.json()).results;
}

// Meilleur film (détail)
async function updateBestMovie() {
  try {
    const best = await fetchMovies({ sort_by: "-imdb_score", page_size: 1 });
    const bestMovie = best[0];
    const detailResponse = await fetch(`http://localhost:8000/api/v1/titles/${bestMovie.id}`);
    const detailData = await detailResponse.json();
    const section = document.querySelector('.meilleur-film-rectangle');
    section.querySelector('.affichefilm').src = detailData.image_url;
    section.querySelector('.affichefilm').alt = detailData.title;
    section.querySelector('.titre-film').textContent = detailData.title;
    section.querySelector('.desc-film').textContent =
      detailData.description || detailData.long_description || "Résumé indisponible.";
  } catch (error) {
    console.error(error);
  }
}

// Grille top films (tous genres ou filtré)
async function updateMovieGrid({ genre = null, gridSelector }) {
  try {
    const params = { sort_by: "-imdb_score", page_size: 6 };
    if (genre) params.genre_contains = genre;
    const movies = await fetchMovies(params);
    fillMovieGrid(movies, gridSelector);
  } catch (error) {
    console.error(error);
  }
}

// Récupère toutes les catégories (pagination)
async function fetchAllGenres() {
  let genres = [], url = "http://localhost:8000/api/v1/genres/";
  while (url) {
    const response = await fetch(url);
    const data = await response.json();
    genres = genres.concat(data.results);
    url = data.next;
  }
  return genres;
}

// Menu déroulant dynamique
async function populateGenreDropdown() {
  const select = document.querySelector('.menu-deroulant');
  select.innerHTML = "";
  const genres = await fetchAllGenres();
  genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre.name;
    option.textContent = genre.name;
    select.appendChild(option);
  });
  if (genres.length > 0) {
    select.value = genres[0].name;
    updateMovieGrid({ genre: genres[0].name, gridSelector: '#other-category-section .category-grid .category-item' });
  }
}

// Événements au chargement du DOM
document.addEventListener('DOMContentLoaded', async () => {
  updateBestMovie();
  updateMovieGrid({ gridSelector: '.category-section:nth-of-type(2) .category-grid .category-item' }); // Top films
  updateMovieGrid({ genre: 'Mystery', gridSelector: '.category-section:nth-of-type(3) .category-grid .category-item' });
  updateMovieGrid({ genre: 'Action', gridSelector: '.category-section:nth-of-type(4) .category-grid .category-item' });

  await populateGenreDropdown();
  const select = document.querySelector('.menu-deroulant');
  select.addEventListener('change', (e) => {
    updateMovieGrid({ genre: e.target.value, gridSelector: '#other-category-section .category-grid .category-item' });
  });
});

// -------- MODALE FILM –– donne à chaque .category-item et au best-movie son id --------

// Ajoute les id films dans grid pour la modale
function patchMovieIdsInGrid(movies, gridSelector) {
  const gridItems = document.querySelectorAll(gridSelector);
  movies.forEach((movie, index) => {
    if (gridItems[index]) {
      gridItems[index].dataset.movieId = movie.id;
    }
  });
}

// Modifie la fonction fillMovieGrid pour intégrer les id
const _fillMovieGrid = fillMovieGrid;
fillMovieGrid = function(movies, gridSelector) {
  _fillMovieGrid(movies, gridSelector);
  patchMovieIdsInGrid(movies, gridSelector);
}

// Stocke aussi l'id sur .meilleur-film-rectangle
const _updateBestMovie = updateBestMovie;
updateBestMovie = async function() {
  await _updateBestMovie();
  try {
    const best = await fetchMovies({ sort_by: "-imdb_score", page_size: 1 });
    if (best[0]) {
      document.querySelector('.meilleur-film-rectangle').dataset.movieId = best[0].id;
    }
  } catch {}
}

// Helper pour formater les infos du film
function formatMovieMeta(data) {
  const genres = (data.genres || []).join(', ') || "Genre inconnu";
  const year = data.date_published || "Date inconnue";
  const rated = data.rated || "Classif. ?";
  const score = data.imdb_score ? `IMDB score: ${data.imdb_score}/10` : "Score indisponible";
  const duration = data.duration ? `${data.duration} minutes` : "Durée ?";
  const country = (data.countries || []).join(', ') || "Pays inconnu";
  const boxOffice = data.worldwide_gross_income ? `Recettes au box-office : ${data.worldwide_gross_income}` : "";
  return `${year} - ${genres}<br>${rated} - ${duration} (${country})<br><b>${score}</b><br>${boxOffice}`;
}

// Affiche la modale avec toutes les informations du film
async function showMovieModal(movieId) {
  try {
    const response = await fetch(`http://localhost:8000/api/v1/titles/${movieId}`);
    const data = await response.json();

    document.querySelector('#movie-modal .modal-movie-img').src = data.image_url || '';
    document.querySelector('#movie-modal .modal-movie-img').alt = data.title || '';
    document.querySelector('#movie-modal .modal-title').textContent = data.title || '';
    document.querySelector('#movie-modal .modal-meta').innerHTML = formatMovieMeta(data);
    document.querySelector('#movie-modal .modal-directors span').textContent = (data.directors || []).join(', ') || "Inconnu";
    document.querySelector('#movie-modal .modal-description').textContent = data.description || data.long_description || "Résumé indisponible.";
    document.querySelector('#movie-modal .modal-actors').innerHTML = `<b>Acteurs&nbsp;:</b> ${(data.actors || []).join(', ') || "Inconnu"}`;

    document.getElementById('movie-modal').style.display = "flex";
    document.body.style.overflow = "hidden";
  } catch (e) {
    alert('Impossible de charger les détails du film.');
  }
}

// Ferme la modale
function closeMovieModal() {
  document.getElementById('movie-modal').style.display = "none";
  document.body.style.overflow = "";
}

// Gestion des clics
document.body.addEventListener("click", (e) => {
  // Bouton détails dans les grilles
  const detailBtn = e.target.closest(".movie-detail-btn");
  if (detailBtn) {
    let movieItem = detailBtn.closest('.category-item');
    if (movieItem && movieItem.dataset.movieId) {
      showMovieModal(movieItem.dataset.movieId);
      return;
    }
    // Ou le film vedette
    if (e.target.closest('.meilleur-film-rectangle')) {
      let bmId = e.target.closest('.meilleur-film-rectangle').dataset.movieId;
      if (bmId) showMovieModal(bmId);
      return;
    }
  }
  // Cliquer sur l'overlay ferme aussi
  if (e.target === document.getElementById('movie-modal')) closeMovieModal();
});

// Fermeture explicite
document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#movie-modal .modal-close').addEventListener('click', closeMovieModal);
});

// Fermer avec Esc
window.addEventListener('keydown', (e) => {
  if (e.key === "Escape" && document.getElementById('movie-modal').style.display === "flex") {
    closeMovieModal();
  }
});
