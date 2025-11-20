scriptjs-v1


const API_URL = 'http://localhost:5000/part3/api/v1';

// ------------------------------
// --- Récupération des lieux ---
async function getPlaces() {
    try {
        const response = await fetch(`${API_URL}/places`);
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const places = await response.json();
        console.log('Fetching places:', places);
        displayPlaces(places);
    } catch (error) {
        console.log('An error occurred:', error);
    }
}

// ---------------------------
// --- Affichage des lieux ---
function displayPlaces(places) {
    const container = document.getElementById('places-container');
    if (!container) return;

    container.innerHTML = '';

    places.forEach(place => {
        const placeCard = `
            <div class="place-card">
                <h3>${place.title}</h3>
                <p>${place.description}</p>
                <p class="price">${place.price}€/nuit</p>
                <button onclick="viewPlace('${place.id}')">View details</button>
            </div>
        `;
        container.innerHTML += placeCard;
    });
}

// ---------------------------
// ---- Détails des lieux ----
async function viewPlace(placeId) {
    try {
        const response = await fetch(`${API_URL}/places/${placeId}`);
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const place = await response.json();

        localStorage.setItem('currentPlace', JSON.stringify(place));
        window.location.href = `/place?id=${placeId}`;
    } catch (error) {
        console.log('Error:', error);
    }
}

// ---------------------------
// --- Espace de connexion ---
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) throw new Error('Incorrect identifiers');
        
        const data = await response.json();
        localStorage.setItem('token', data.access_token);

        window.location.href = '/';
    } catch (error) {
        alert('Login error: ' + error.message);
    }
}

// -------------------------------
// --- Formulaire de connexion ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login(
                document.getElementById('email').value,
                document.getElementById('password').value
            );
        });
    }

    if (document.getElementById('places-container')) {
        getPlaces();
    }
});
