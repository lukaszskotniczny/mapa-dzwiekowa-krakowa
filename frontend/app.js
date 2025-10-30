// Inicjalizacja mapy - Kraków, Rynek Główny
const map = L.map('map').setView([50.0614, 19.9366], 13);

// Dodanie warstwy mapy (kafelki OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Tablica do przechowywania markerów
let markers = [];
let allPlaces = [];
let currentFilter = 'all';

// Zmienne dla modala
const modal = document.getElementById('addPlaceModal');
const closeBtn = document.getElementsByClassName('close')[0];
const form = document.getElementById('addPlaceForm');
let currentLat, currentLng;

// Funkcja zwracająca kolor dla kategorii
function getCategoryColor(category) {
    const colors = {
        'bieganie': '#3498db',
        'randka': '#e74c3c',
        'nostalgiczne': '#9b59b6',
        'trening': '#2ecc71',
        'relaks': '#1abc9c',
        'impreza': '#f39c12',
        'inne': '#95a5a6'
    };
    return colors[category] || '#95a5a6';
}

// Funkcja tworząca niestandardową ikonę markera
function createColoredIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 25px; height: 25px; 
               border-radius: 50% 50% 50% 0; transform: rotate(-45deg); 
               border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
               <div style="width: 10px; height: 10px; background: white; 
               border-radius: 50%; position: absolute; top: 50%; left: 50%; 
               transform: translate(-50%, -50%);"></div></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 25]
    });
}

// Funkcja zwracająca ikonkę dla kategorii
function getCategoryIcon(category) {
    const icons = {
        'bieganie': '🏃',
        'randka': '❤️',
        'nostalgiczne': '😌',
        'trening': '💪',
        'relaks': '🧘',
        'impreza': '🎉',
        'inne': '📌'
    };
    return icons[category] || '📌';
}

// Funkcja pobierająca miejsca z backendu
async function loadPlaces() {
    try {
        const response = await fetch('http://localhost:5000/api/places');
        const places = await response.json();
        
        allPlaces = places;
        
        // Usuń stare markery
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        // Dodaj nowe markery
        places.forEach(place => {
            const color = getCategoryColor(place.category);
            const icon = createColoredIcon(color);
            
            const marker = L.marker([place.lat, place.lng], {icon: icon})
                .addTo(map)
                .bindPopup(`
                    <div style="min-width: 220px;">
                        <b style="font-size: 16px;">${place.songTitle}</b><br>
                        <i style="color: #666;">${place.artist}</i><br>
                        <span style="background: ${color}; color: white; padding: 3px 8px; 
                              border-radius: 5px; font-size: 12px; display: inline-block; 
                              margin-top: 5px;">${getCategoryIcon(place.category)} ${place.category}</span>
                        <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                        <button onclick="deletePlace(${place.id})" 
                                style="background: #e74c3c; color: white; border: none; 
                                       padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                       font-weight: bold;">
                            🗑️ Usuń miejsce
                        </button>
                    </div>
                `);
            markers.push(marker);
        });
        
        // Aktualizuj statystyki
        updateStats(places);
        
    } catch (error) {
        console.error('Błąd pobierania miejsc:', error);
    }
}

// Funkcja dodająca nowe miejsce
async function addPlace(lat, lng, songTitle, artist, category, description) {
    try {
        const response = await fetch('http://localhost:5000/api/places', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat: lat,
                lng: lng,
                songTitle: songTitle,
                artist: artist,
                category: category,
                description: description
            })
        });
        
        if (response.ok) {
            await loadPlaces();
            // Resetuj filtr do "Wszystkie"
            currentFilter = 'all';
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('.filter-btn').classList.add('active');
        }
    } catch (error) {
        console.error('Błąd dodawania miejsca:', error);
    }
}

// Obsługa kliknięcia na mapę
map.on('click', function(e) {
    currentLat = e.latlng.lat;
    currentLng = e.latlng.lng;
    modal.style.display = 'block';
});

// Zamknięcie modala po kliknięciu X
closeBtn.onclick = function() {
    modal.style.display = 'none';
    form.reset();
}

// Zamknięcie modala po kliknięciu poza nim
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        form.reset();
    }
}

// Obsługa formularza
form.onsubmit = function(e) {
    e.preventDefault();
    
    const songTitle = document.getElementById('songTitle').value;
    const artist = document.getElementById('artist').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    
    addPlace(currentLat, currentLng, songTitle, artist, category, description || 'Brak opisu');
    
    modal.style.display = 'none';
    form.reset();
}

// Funkcja usuwająca miejsce
async function deletePlace(placeId) {
    if (!confirm('Czy na pewno chcesz usunąć to miejsce?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:5000/api/places/${placeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadPlaces();
            alert('Miejsce zostało usunięte!');
        }
    } catch (error) {
        console.error('Błąd usuwania miejsca:', error);
        alert('Nie udało się usunąć miejsca');
    }
}

// Funkcja aktualizująca statystyki
function updateStats(places) {
    // Liczba miejsc
    document.getElementById('totalPlaces').textContent = places.length;
    
    // Najpopularniejszy artysta
    if (places.length > 0) {
        const artistCount = {};
        places.forEach(place => {
            artistCount[place.artist] = (artistCount[place.artist] || 0) + 1;
        });
        
        const topArtist = Object.keys(artistCount).reduce((a, b) => 
            artistCount[a] > artistCount[b] ? a : b
        );
        
        document.getElementById('topArtist').textContent = 
            `${topArtist} (${artistCount[topArtist]}x)`;
    } else {
        document.getElementById('topArtist').textContent = '-';
    }
    
    // Ostatnio dodane
    if (places.length > 0) {
        const lastPlace = places[places.length - 1];
        document.getElementById('lastAdded').textContent = 
            `${lastPlace.songTitle} - ${lastPlace.artist}`;
    } else {
        document.getElementById('lastAdded').textContent = '-';
    }
}

// Funkcja filtrująca miejsca według kategorii
function filterByCategory(category) {
    currentFilter = category;
    
    // Aktualizuj wygląd przycisków
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Usuń wszystkie markery z mapy
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Filtruj miejsca
    const filteredPlaces = category === 'all' 
        ? allPlaces 
        : allPlaces.filter(place => place.category === category);
    
    // Dodaj odfiltrowane markery
    filteredPlaces.forEach(place => {
        const color = getCategoryColor(place.category);
        const icon = createColoredIcon(color);
        
        const marker = L.marker([place.lat, place.lng], {icon: icon})
            .addTo(map)
            .bindPopup(`
                <div style="min-width: 220px;">
                    <b style="font-size: 16px;">${place.songTitle}</b><br>
                    <i style="color: #666;">${place.artist}</i><br>
                    <span style="background: ${color}; color: white; padding: 3px 8px; 
                          border-radius: 5px; font-size: 12px; display: inline-block; 
                          margin-top: 5px;">${getCategoryIcon(place.category)} ${place.category}</span>
                    <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                    <button onclick="deletePlace(${place.id})" 
                            style="background: #e74c3c; color: white; border: none; 
                                   padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                   font-weight: bold;">
                        🗑️ Usuń miejsce
                    </button>
                </div>
            `);
        markers.push(marker);
    });
    
    // Aktualizuj statystyki dla odfiltrowanych miejsc
    updateStats(filteredPlaces);
}

// Załaduj miejsca przy starcie
loadPlaces();