function fillMovieGrid(movies, gridSelector) {
  const gridItems = document.querySelectorAll(gridSelector);
  gridItems.forEach(item => item.innerHTML = "");
  movies.forEach((movie, index) => {
    if (gridItems[index]) {
      gridItems[index].innerHTML = `
        <img src="${movie.image_url}" alt="${movie.title}">
        <div class="movie-overlay">
          <span class="movie-title">${movie.title}</span>
          <button class="movie-detail-btn" data-movie-id="${movie.id}">Détails</button>
        </div>
      `;
    }
  });
}

async function fetchMovies(params) {
  const url = new URL("http://localhost:8000/api/v1/titles/");
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  const response = await fetch(url);
  if (!response.ok) throw new Error('Erreur lors de la récupération des films');
  return (await response.json()).results;
}

async function updateBestMovie() {
  try {
    const best = await fetchMovies({ sort_by: "-imdb_score", page_size: 1 });
    const bestMovie = best[0];
    const detailResponse = await fetch(`http://localhost:8000/api/v1/titles/${bestMovie.id}`);
    const detailData = await detailResponse.json();
    const section = document.querySelector('.meilleur-film-rectangle');
    const affiche = new Image()
    affiche.classList.add("affichefilm")
    affiche.src = detailData.image_url;
    affiche.alt = detailData.title;
    section.querySelector(".bestmovie-content").insertAdjacentElement("afterbegin",affiche)
    section.querySelector('.titre-film').textContent = detailData.title;
    section.querySelector('.desc-film').textContent =
      detailData.description || detailData.long_description || "Résumé indisponible.";
    // Ajoute l'id sur le bouton détails
    section.querySelector('.button-bas.movie-detail-btn').dataset.movieId = bestMovie.id;
  } catch (error) {
    console.error(error);
  }
}

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

// Formate les infos du film pour la modale
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

async function showMovieModal(movieId) {
  try {
    const response = await fetch(`http://localhost:8000/api/v1/titles/${movieId}`);
    const data = await response.json();
    const wrapper = document.querySelector('#movie-modal .modal-img-wrapper');
    wrapper.innerHTML = "";
    const img = new Image();
    img.classList.add("modal-movie-img");
    img.src = data.image_url || "https://via.placeholder.com/180x260?text=Affiche"; // fallback W3C compliant
    img.alt = data.title || "Affiche du film";
    wrapper.appendChild(img);

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


function closeMovieModal() {
  document.getElementById('movie-modal').style.display = "none";
  document.body.style.overflow = "";
}

document.addEventListener('DOMContentLoaded', async () => {
  await updateBestMovie();
  await updateMovieGrid({ gridSelector: '.category-section:nth-of-type(2) .category-grid .category-item' });
  await updateMovieGrid({ genre: 'Mystery', gridSelector: '.category-section:nth-of-type(3) .category-grid .category-item' });
  await updateMovieGrid({ genre: 'Action', gridSelector: '.category-section:nth-of-type(4) .category-grid .category-item' });

  await populateGenreDropdown();

  document.querySelector('.menu-deroulant').addEventListener('change', (e) => {
    updateMovieGrid({ genre: e.target.value, gridSelector: '#other-category-section .category-grid .category-item' });
  });

  // Clic détail meilleur film (bouton bas)
  document.querySelector('.meilleur-film-rectangle .movie-detail-btn').addEventListener('click', e => {
    const btn = e.currentTarget;
    if (btn.dataset.movieId) showMovieModal(btn.dataset.movieId);
  });

  // Délégation clic sur les boutons "Détails" des films catégories
  document.body.addEventListener('click', e => {
    // détails sur un item catégorie
    const detailBtn = e.target.closest('.category-item .movie-detail-btn');
    if (detailBtn && detailBtn.dataset.movieId) {
      showMovieModal(detailBtn.dataset.movieId);
    }
  });

  // MODALE : fermeture croix rouge (mobile/tablette)
  const xBtn = document.querySelector('#movie-modal .modal-x-close');
  if (xBtn) xBtn.addEventListener('click', closeMovieModal);

  // MODALE : fermeture bouton bas (desktop)
  const closeBtn = document.querySelector('#movie-modal .modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeMovieModal);

  // Clique sur overlay (en-dehors du contenu)
  document.getElementById('movie-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeMovieModal();
  });

  // ESC pour fermer
  window.addEventListener('keydown', e => {
    if (e.key === "Escape" && document.getElementById('movie-modal').style.display === "flex") {
      closeMovieModal();
    }
  });

  // VOIR PLUS / VOIR MOINS
  document.querySelectorAll('.voir-plus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let grid = btn.previousElementSibling;
      if (!grid || !grid.classList.contains('category-grid')) {
        grid = btn.parentElement.querySelector('.category-grid');
      }
      if (grid) grid.querySelectorAll('.category-item').forEach(item => item.style.display = 'flex');
      btn.style.display = 'none';
      let btnMoins = document.createElement('button');
      btnMoins.className = 'voir-moins-btn';
      btnMoins.innerText = 'Voir moins';
      btn.parentElement.appendChild(btnMoins);
      btnMoins.addEventListener('click', () => {
        let maxFilms = 6;
        if (window.innerWidth <= 425) maxFilms = 2;
        else if (window.innerWidth <= 900) maxFilms = 4;
        grid.querySelectorAll('.category-item').forEach((item, idx) => {
          item.style.display = (idx < maxFilms) ? 'flex' : 'none';
        });
        btnMoins.remove();
        btn.style.display = 'flex';
      });
    });
  });

});

// Ajustement de l'image du film dans la modale pour la version tablette et mobile 
function adjustModalImgPosition() {
  const modalDetails = document.querySelector('.modal-details');
  const modalImg = document.querySelector('.modal-img-wrapper');
  const modalDescription = modalDetails.querySelector('.modal-description');
  const modalActors = modalDetails.querySelector('.modal-actors');

  if(window.innerWidth <= 900) {
    // insérer img entre description et acteurs
    if (modalImg.parentNode !== modalDetails) {
      modalDescription.after(modalImg);
    }
  } else {
    // remettre img en dehors modal-details (dernier enfant de modal-main-row)
    const modalMainRow = document.querySelector('.modal-main-row');
    if (modalImg.parentNode !== modalMainRow) {
      modalMainRow.appendChild(modalImg);
    }
  }
}

window.addEventListener('resize', adjustModalImgPosition);
window.addEventListener('load', adjustModalImgPosition);
