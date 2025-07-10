// Fonction utilitaire pour remplir une grille de films avec overlay
function fillMovieGrid(movies, gridSelector) {
  const gridItems = document.querySelectorAll(gridSelector);
  gridItems.forEach(item => item.innerHTML = ""); // Vide les cases
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
