// part4/static/js/scripts.js

const API_URL = 'http://localhost:5000/api/v1';

// === Utilitaires ===

function getHeaders(requireAuth = false) {
    const headers = { 'Content-Type': 'application/json' };

    if (requireAuth) {
        // Récupérer le JWT dans le cookie
        const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
        const token = match ? match[2] : null;

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}


// Gestion centralisée des erreurs
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.error || error.message || 'Erreur inconnue');
    }
    return response.json();
}

// Vérifier si l'utilisateur est connecté
async function isLoggedIn() {
    const res = await fetch(`${API_URL}/users/me`, {
        method: "GET",
        credentials: "include"
    });

    return res.ok;
}


// === API Calls ===

// --- USERS ---
async function fetchUser(userId) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/v1/users/${userId}`);

        if (!response.ok) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error("User fetch error:", error);
        return null;
    }
}

// --- PLACES ---
async function getAllPlaces() {
    try {
        const response = await fetch(`${API_URL}/places/`);
        if (!response.ok) throw new Error('Erreur API');

        // Lire le JSON **une seule fois**
        const data = await response.json();
        return data; // tableau de places
    } catch (e) {
        console.error("Erreur getAllPlaces:", e);
        return []; // renvoyer un tableau vide en cas d'erreur
    }
}

async function getPlaceById(placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}`, {
            method: 'GET',
            credentials: "include", // Pour gérer les cookies
            headers: getHeaders()
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Erreur getPlaceById:', error);
        throw error;
    }
}

// --- AUTHENTIFICATION ---
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({
                error: `HTTP ${response.status}: ${response.statusText}`
            }));
            throw new Error(err.error || 'Erreur inconnue');
        }

        const data = await response.json();

        // Stocker le JWT dans un cookie
        if (data.access_token) {
            document.cookie = `token=${data.access_token}; path=/`;
        }

        // Rediriger vers la page principale
        window.location.href = '/index.html';

    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}


async function logout() {
    await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include"
    });

    window.location.href = '/login';
}


// --- Filters ---
function priceFilter(places) {
    const filter = document.getElementById('proce-filter');
    if (!filter) return;

    // Récupérer les prix et uniques (utilisation du set) et les trier 
    const prices = [...new Set(places.map(p => p.price))].sort((a,b) => a-b);

    // Ajouter les options
    filter.innerHTML = '<option value="">-- No max price --</option>';
    prices.forEach(price => {
        const option = document.createElement('option');
        option.value = price;
        option.textContent = `€${price} max`;
        filter.appendChild(option);
    });

    // Evenement du filtre
    filter.addEventListener('change', () => {
        const maxPrice = parseInt(filter.value);
        displayPlaces(places, maxPrice)
    });
}


// --- REVIEWS ---
async function getReviewsByPlace(placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}/reviews`, {
            method: 'GET',
            headers: getHeaders()
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Erreur getReviewsByPlace:', error);
        throw error;
    }
}

async function createReview(placeId, rating, description) {
    try {
        const response = await fetch(`${API_URL}/reviews/`, {
            method: 'POST',
            headers: getHeaders(true), // Authentification requise
            credentials: 'include', // envoie des cookies JWT
            body: JSON.stringify({
                place_id: placeId,
                rating: parseInt(rating),
                text: description 
            })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Erreur createReview:', error);
        throw error;
    }
}

// --- USERS ---
async function getCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/users/me`, {
            method: 'GET',
            headers: getHeaders(true)
        });

        if (response.status === 401) {
            // Pas connecté → on renvoie null SANS erreur
            return null;
        }

        return await handleResponse(response);
        
    } catch (error) {
        console.error('Erreur getCurrentUser:', error);
        return null; // ← On renvoie null même en cas d'erreur réseau
    }
}


// === UI Functions ===
// Récupérer les reviews d'une place pour avoir la moyenne des notes
async function getPlaceReviews(placeId) {
    try {
        const res = await fetch(`http://localhost:5000/api/v1/places/${placeId}/reviews`);
        if (!res.ok) throw new Error('Impossible de récupérer les reviews');
        const data = await res.json();
        return data; // un tableau de reviews [{rating: X, comment: "..."}, ...]
    } catch (error) {
        console.error(`Erreur reviews place ${placeId}:`, error);
        return []; // en cas d'erreur, retourner tableau vide
    }
}

// Fonction pour générer les étoiles visuelles
function getStars(rating) {
    if (!rating) return 'No reviews yet';
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5 ? '½' : '';
    return '★'.repeat(fullStars) + halfStar;
}



// Afficher les places dans la page d'accueil
async function displayPlaces() {
    const container = document.getElementById('places-list');
    if (!container) return;

    container.innerHTML = '<p>Loading...</p>';

    try {
        const places = await getAllPlaces();

        if (places.length === 0) {
            container.innerHTML = '<p>No places yet...</p>';
            return;
        }

        container.innerHTML = ''; // vider le container avant d'ajouter les cartes

        for (const place of places) {
            // Récupérer les reviews pour cette place
            const reviews = await getPlaceReviews(place.id);
            const avgRating = reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                : null;

            // Créer la carte HTML
            const cardHTML = `
                <div class="place-card" data-id="${place.id}">
                    <h3>${place.title}</h3>
                    <p>${place.description}</p>
                    <div class="place-info">
                        <span class="price">${place.price}€ / night</span>
                        <span class="rating">${getStars(avgRating)} (${avgRating})</span>
                    </div>
                    <button class="details-button" onclick="viewPlaceDetails('${place.id}')">View details</button>
                </div>
            `;

            container.insertAdjacentHTML('beforeend', cardHTML);
        }

    } catch (error) {
        container.innerHTML = `
            <div class="error">
                <p>Erreur: ${error.message}</p>
                <p>Assure-toi que le backend est lancé sur http://localhost:5000/api/v1</p>
            </div>
        `;
    }
}

// Voir les détails d'un place
function viewPlaceDetails(placeId) {
    window.location.href = `/place?id=${placeId}`;
}

// Afficher les détails d'un place
async function displayPlaceDetails() {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('id');

    if (!placeId) {
        document.body.innerHTML = '<p>Missing place ID</p>';
        return;
    }

    try {
        // Récupérer la place
        const place = await getPlaceById(placeId);

        // Afficher le Host (owner)
        const hostElement = document.getElementById("place-host");
        const owner = await fetchUser(place.owner_id);

        if (owner && owner.first_name) {
            hostElement.textContent = `${owner.first_name} ${owner.last_name || ""}`;
        } else {
            hostElement.textContent = "Unknown host";
        }

        // Afficher les infos principales
        document.getElementById('place-title').textContent = place.title;
        document.getElementById('place-description').textContent = place.description;
        document.getElementById('place-price').textContent = `${place.price}€ /night`;
        document.getElementById('place-location').textContent =
            (place.latitude && place.longitude) 
            ? `${place.latitude}, ${place.longitude}`
            : 'Unknown';

        // Afficher les amenities
        const amenitiesList = document.getElementById("place-amenities");

        if (!place.amenities || place.amenities.length === 0) {
            amenitiesList.innerHTML = '<li>No amenities listed</li>';
        } else {
            amenitiesList.innerHTML = place.amenities
                .map(a => `<li>${a.name}</li>`)
                .join('');
        }

        // Charger les reviews
        await displayReviews(placeId);

        // === Gérer le bouton "Add review" selon login ===
        const addReviewBtn = document.getElementById('add-review-btn');
        const loginWarning = document.getElementById('login-warning');

        const logged = await isLoggedIn();

        if (!logged) {
            addReviewBtn.disabled = true;
            addReviewBtn.style.opacity = "0.5";
            addReviewBtn.style.cursor = "not-allowed";
            loginWarning.style.display = "block";
        } else {
            loginWarning.style.display = "none";
            addReviewBtn.disabled = false;
            addReviewBtn.style.opacity = "1";
            addReviewBtn.style.cursor = "pointer";

            addReviewBtn.onclick = () => {
                window.location.href = `/add_review?place_id=${placeId}`;
            };
        }
    } catch (error) {
        document.body.innerHTML = `<p>❌ Erreur: ${error.message}</p>`;
    }
}

// Afficher les avis
async function displayReviews(placeId) {
    const container = document.getElementById('reviews-list');
    if (!container) return;
    
    try {
        const reviews = await getReviewsByPlace(placeId);
        console.log('✅ Reviews reçues:', reviews);

        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<p>No reviews yet</p>';
            return;
        }

        container.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <span class="rating">${'★'.repeat(review.rating)}</span>
                    <span class="author">${review.user?.first_name || 'Unknown user'}</span>
                </div>
                <p class="comment">${review.text}</p>
            </div>
        `).join('');
        
        // Debug : afficher le texte du premier commentaire
        console.log('Premier commentaire:', reviews[0].text);

    } catch (error) {
        container.innerHTML = `<p>❌ Erreur: ${error.message}</p>`;
    }
}


// Gérer le formulaire de login
function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            await login(email, password);
            window.location.href = '/index';
        } catch (error) {
            if (errorDiv) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        }
    });
}

// Gérer le formulaire d'ajout d'avis
function setupReviewForm() {
    const form = document.getElementById('review-form');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const params = new URLSearchParams(window.location.search);
        const placeId = params.get('place_id');
        const rating = document.getElementById('rating').value;
        const comment = document.getElementById('comment').value;
        
        console.log('Rating:', rating);
        console.log('Comment/Description:', comment);
        console.log('PlaceId:', placeId);

        if (!placeId) {
            alert('ID du logement manquant');
            return;
        }
        
        try {
            await createReview(placeId, rating, comment);
            alert('Review add succesfully !');
            window.location.href = `/place?id=${placeId}`;
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    });
}

// Vérifier l'authentification
function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/index';
    }
}

// === Initialisation au chargement de la page ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('Scripts chargés, API:', API_URL);
    
    // Page d'accueil
    if (document.getElementById('places-list')) {
        displayPlaces();
    }
    
    // Page de détails
    if (document.getElementById('place-title')) {
        displayPlaceDetails();
    }
    
    // Page de login
    if (document.getElementById('login-form')) {
        setupLoginForm();
    }
    
    // Page d'ajout d'avis
    if (document.getElementById('review-form')) {
        checkAuth(); // Vérifier l'authentification
        setupReviewForm();
    }

    // --- Gestion du bouton de la Nav barre ---
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const homeBtn = document.getElementById('home-btn');

    // Home redirige vers la page principale
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = '/index';
        });
    }

    // Mise à jour dynamique selon login
    isLoggedIn().then(isAuth => {

        if (logoutBtn) {
            logoutBtn.style.display = isAuth ? "inline-block" : "none";
            logoutBtn.onclick = async () => {
                await fetch(`${API_URL}/auth/logout`, {
                    method: "POST",
                    credentials: "include"
                });
                window.location.href = "/login";
            };
        }

        if (loginBtn) {
            loginBtn.style.display = isAuth ? "none" : "inline-block";
            loginBtn.onclick = () => window.location.href = "/login";
        }
    });
});
