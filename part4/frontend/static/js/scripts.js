const API_URL = 'http://localhost:5000/api/v1';

// === Utilitaires ===

function getHeaders(requireAuth = false) {
    const headers = { 'Content-Type': 'application/json' };

    if (requireAuth) {
        const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
        const token = match ? match[2] : null;

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}

async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({
            error: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(error.error || error.message || 'Erreur inconnue');
    }
    return response.json();
}

async function isLoggedIn() {
    const res = await fetch(`${API_URL}/users/me`, {
        method: "GET",
        credentials: "include"
    });

    return res.ok;
}

// === API Calls ===

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

async function getAllPlaces() {
    try {
        const response = await fetch(`${API_URL}/places/`);
        if (!response.ok) throw new Error('Erreur API');

        const data = await response.json();
        return data;
    } catch (e) {
        console.error("Erreur getAllPlaces:", e);
        return [];
    }
}

async function getPlaceById(placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}`, {
            method: 'GET',
            credentials: "include",
            headers: getHeaders()
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Erreur getPlaceById:', error);
        throw error;
    }
}

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

        if (data.access_token) {
            document.cookie = `token=${data.access_token}; path=/`;
        }

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

/* --- FONCTION POUR AFFICHER LES MESSAGES --- */
function showReviewMessage(message, type = 'error') {
    const messageDiv = document.getElementById('review-message');
    
    if (!messageDiv) {
        console.error('Élément #review-message introuvable');
        return;
    }
    
    // Afficher le message
    messageDiv.textContent = message;
    messageDiv.className = type; // 'error', 'warning', ou 'success'
    messageDiv.style.display = 'block';
    
    // Faire défiler jusqu'au message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

/* --- CRÉER UNE REVIEW --- */
async function createReview(placeId, rating, description) {
    try {
        const response = await fetch(`${API_URL}/reviews/`, {
            method: 'POST',
            headers: getHeaders(true),
            credentials: 'include',
            body: JSON.stringify({
                place_id: placeId,
                rating: parseInt(rating),
                text: description 
            })
        });

        console.log('📥 Statut réponse:', response.status);

        // Gérer le cas 409 - Review déjà existante
        if (response.status === 409) {
            showReviewMessage(
                'You have already reviewed this place. You can only leave one review per location.',
                'warning'
            );
            return null;
        }

        // Gérer les autres erreurs
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            showReviewMessage(
                `Error: ${errorData.message || 'Unable to submit review'}`,
                'error'
            );
            throw new Error(errorData.message || 'Request failed');
        }

        // Succès
        showReviewMessage('Thank you! Your review has been successfully published.', 'success');
        
        return await response.json();

    } catch (error) {
        console.error('💥 Erreur createReview:', error);
        showReviewMessage(`An error occurred: ${error.message}`, 'error');
        throw error;
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/users/me`, {
            method: 'GET',
            headers: getHeaders(true)
        });

        if (response.status === 401) {
            return null;
        }

        return await handleResponse(response);
        
    } catch (error) {
        console.error('Erreur getCurrentUser:', error);
        return null;
    }
}

// === UI Functions ===

// Variables globales pour le filtrage
let allPlaces = []; 
let allReviews = {};

// Charger toutes les reviews pour toutes les places
async function loadAllReviews(places) {
    for (const place of places) {
        try {
            const reviews = await getReviewsByPlace(place.id);
            allReviews[place.id] = reviews || [];
        } catch (error) {
            console.error(`Erreur chargement reviews pour place ${place.id}:`, error);
            allReviews[place.id] = [];
        }
    }
}

// Fonction pour générer les étoiles visuelles
function getStars(rating) {
    if (!rating) return 'No reviews yet';
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5 ? '½' : '';
    return '★'.repeat(fullStars) + halfStar;
}

// Initialiser le filtre de prix
function priceFilter(places) {
    const filter = document.getElementById('price-filter');
    if (!filter) return;

    // Options imposées
    const priceOptions = ["All", 10, 50, 100, 200, 500, 1500];

    filter.innerHTML = ""; // reset

    priceOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option === "All" ? "all" : option;
        opt.textContent = option === "All" ? "All" : option;
        filter.appendChild(opt);
    });

    // Event listener de filtrage
    filter.addEventListener('change', () => {
        const value = filter.value;

        let filtered = places;

        if (value !== "all") {
            const maxPrice = parseInt(value);
            filtered = places.filter(p => p.price <= maxPrice);
        }

        displayPlaces(filtered);
    });
}


// Afficher les places avec filtrage 
async function displayPlaces(places = null, maxPrice = null) {
    const container = document.getElementById('places-list');
    if (!container) return;

    container.innerHTML = '<p>Loading...</p>';

    try {
        // Utiliser allPlaces si aucun paramètre n'est fourni
        let toDisplay = places || allPlaces;

        if (toDisplay.length === 0) {
            container.innerHTML = '<p>No places yet...</p>';
            return;
        }

        // Appliquer le filtre de prix si fourni
        if (maxPrice && maxPrice > 0) {
            toDisplay = toDisplay.filter(place => place.price <= maxPrice);
        }

        if (toDisplay.length === 0) {
            container.innerHTML = '<p>No places match your criteria</p>';
            return;
        }

        container.innerHTML = '';

        // Afficher chaque place
        for (const place of toDisplay) {
            const reviews = allReviews[place.id] || [];
            const avgRating = reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                : null;

            const cardHTML = `
                <div class="place-card" data-id="${place.id}">
                    <h3>${place.title}</h3>
                    <p>${place.description}</p>
                    <div class="place-info">
                        <span class="price">${place.price}€ / night</span>
                        <span class="rating">${getStars(avgRating)} ${avgRating ? `(${avgRating})` : 'No reviews'}</span>
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

// Charger et afficher toutes les places
async function loadAndDisplayPlaces() {
    const container = document.getElementById('places-list');
    if (!container) return;

    container.innerHTML = '<p>Loading...</p>';

    try {
        allPlaces = await getAllPlaces();

        if (allPlaces.length === 0) {
            container.innerHTML = '<p>No places yet...</p>';
            return;
        }

        // Charger toutes les reviews
        await loadAllReviews(allPlaces);

        // Initialiser le filtre
        priceFilter(allPlaces);

        // Afficher toutes les places
        await displayPlaces(allPlaces);

    } catch (error) {
        container.innerHTML = `
            <div class="error">
                <p>Error: ${error.message}</p>
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
        const place = await getPlaceById(placeId);

        const hostElement = document.getElementById("place-host");
        const owner = await fetchUser(place.owner_id);

        if (owner && owner.first_name) {
            hostElement.textContent = `${owner.first_name} ${owner.last_name || ""}`;
        } else {
            hostElement.textContent = "Unknown host";
        }

        document.getElementById('place-title').textContent = place.title;
        document.getElementById('place-description').textContent = place.description;
        displayAmenities(place);
        document.getElementById('place-price').textContent = `${place.price}€ /night`;
        document.getElementById('place-location').textContent =
            (place.latitude && place.longitude) 
            ? `${place.latitude}, ${place.longitude}`
            : 'Unknown';

        const amenitiesList = document.getElementById("place-amenities");

        if (!place.amenities || place.amenities.length === 0) {
            amenitiesList.innerHTML = '<li>No amenities listed</li>';
        } else {
            amenitiesList.innerHTML = place.amenities
                .map(a => `<li>${a.name}</li>`)
                .join('');
        }

        await displayReviews(placeId);

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

// Afficher les logos des amenité
const amenitiesLogos = {
    wifi: "/static/images/icon_wifi.png",
    bedroom: "/static/images/icon_bed.png",
    bath: "/static/images/icon_bath.png"

};

function displayAmenities(place) {
    const list = document.getElementById("place-amenities");
    const icons = document.querySelector(".amenities-list");

    if (!list || !icons) return;

    // reset
    list.innerHTML = "";
    icons.innerHTML = "";

    place.amenities.forEach((a) => {
        // 1️⃣ Texte dans la liste
        const li = document.createElement("li");
        li.textContent = a.name;
        list.appendChild(li);

        // 2️⃣ Logo
        const key = a.name.toLowerCase();
        const logo = amenitiesLogos[key];

        if (logo) {
            const img = document.createElement("img");
            img.src = logo;
            img.alt = key;
            img.classList.add("amenity-icon");
            icons.appendChild(img);
        }
    });
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Scripts chargés, API:', API_URL);
    
    // Page d'accueil
    if (document.getElementById('places-list')) {
        await loadAndDisplayPlaces();  // ← Attendre que les places se chargent
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
        checkAuth();
        setupReviewForm();
    }

    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const homeBtn = document.getElementById('home-btn');

    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            window.location.href = '/index';
        });
    }

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