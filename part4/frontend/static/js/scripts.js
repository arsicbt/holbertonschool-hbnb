// part4/static/js/scripts.js

const API_URL = 'http://localhost:5000/api/v1';

// === Utilitaires ===

// Récupérer le token JWT stocké
function getToken() {
    return localStorage.getItem('token');
}

// Sauvegarder le token JWT
function saveToken(token) {
    localStorage.setItem('token', token);
}

// Supprimer le token (logout)
function clearToken() {
    localStorage.removeItem('token');
}

// Vérifier si l'utilisateur est connecté
function isLoggedIn() {
    return !!getToken();
}

// Headers par défaut pour les requêtes
function getHeaders(includeAuth = false) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (includeAuth) {
        const token = getToken();
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
        const response = await fetch(`${API_URL}/places`, {
            method: 'GET',
            headers: getHeaders()
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Erreur getAllPlaces:', error);
        throw error;
    }
}

async function getPlaceById(placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}`, {
            method: 'GET',
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
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ email, password })
        });
        
        const data = await handleResponse(response);
        
        if (data.access_token) {
            saveToken(data.access_token);
        }

        return data;

    } catch (error) {
        console.error('Erreur login:', error);
        throw error;
    }
}

function logout() {
    clearToken();
    window.location.href = "/login";
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

async function createReview(placeId, rating, comment) {
    try {
        const response = await fetch(`${API_URL}/reviews/`, {
            method: 'POST',
            headers: getHeaders(true), // Authentification requise
            body: JSON.stringify({
                place_id: placeId,
                rating: parseInt(rating),
                comment: comment
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
        return await handleResponse(response);
    } catch (error) {
        console.error('Erreur getCurrentUser:', error);
        throw error;
    }
}

// === UI Functions ===

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
        
        container.innerHTML = places.map(place => `
            <div class="place-card" data-id="${place.id}">
                <h3>${place.title}</h3>
                <p>${place.description}</p>
                <div class="place-info">
                    <span class="price">${place.price}€ /nigth</span>
                    <span class="rating">  -  ★ ${place.rating || 'No reviews yet'}</span>
                </div>
                <button onclick="viewPlaceDetails('${place.id}')">View details</button>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="error">
                <p>❌ Erreur: ${error.message}</p>
                <p>T'as encore oublié de run le back Arsi...</p>
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
            <div class="review">
                <div class="review-header">
                    <span class="rating">${'★'.repeat(review.rating)}</span>
                    <span class="author">${review.user_name}</span>
                </div>
                <p class="comment">${text.comment}</p>
            </div>
        `).join('');
        
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
        window.location.href = '/login';
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

    // Bouton de déconnexion
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});
