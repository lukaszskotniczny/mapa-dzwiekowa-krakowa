// Inicjalizacja mapy
const map = L.map('map', {
    attributionControl: false  // Wyłącz kontrolkę attribution
}).setView([50.0614, 19.9366], 13);

let markers = [];
let allPlaces = [];
let currentFilter = 'all';

const modal = document.getElementById('addPlaceModal');
const closeBtn = document.getElementsByClassName('close')[0];
const form = document.getElementById('addPlaceForm');
let currentLat, currentLng;

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

async function loadPlaces() {
    console.log('=== START loadPlaces() ===');
    try {
        console.log('Próba połączenia z backendem...');
        // Spróbuj załadować z backendu (jeśli działa lokalnie)
        const response = await fetch('http://localhost:5000/api/places');
        if (!response.ok) throw new Error('Backend niedostępny');
        const places = await response.json();
        
        allPlaces = places;
        
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        places.forEach(place => {
            const color = getCategoryColor(place.category);
            const icon = createColoredIcon(color);
            
            const marker = L.marker([place.lat, place.lng], {icon: icon})
                .addTo(map)
                .bindPopup(`
                    <div style="min-width: 260px;">
                        ${place.albumImage ? `<img src="${place.albumImage}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
                        
                        <b style="font-size: 16px;">${place.songTitle}</b><br>
                        <i style="color: #666;">${place.artist}</i><br>
                        
                        <span style="background: ${color}; color: white; padding: 3px 8px; 
                              border-radius: 5px; font-size: 12px; display: inline-block; 
                              margin-top: 5px; margin-bottom: 8px;">${getCategoryIcon(place.category)} ${place.category}</span>
                        
                        <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                        
                        ${place.previewUrl ? `
                            <audio controls style="width: 100%; margin-bottom: 10px;">
                                <source src="${place.previewUrl}" type="audio/mpeg">
                            </audio>
                        ` : '<p style="color: #999; font-size: 12px; margin-bottom: 10px;">Brak preview</p>'}
                        
                        ${place.spotifyUrl ? `
                            <a href="${place.spotifyUrl}" target="_blank" 
                               style="display: inline-block; background: #1DB954; color: white; 
                                      padding: 8px 15px; border-radius: 5px; text-decoration: none; 
                                      font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                                🎵 Otwórz w Spotify
                            </a>
                        ` : ''}
                        
                        <button onclick="deletePlace(${place.id})" 
                                style="background: #e74c3c; color: white; border: none; 
                                       padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                       font-weight: bold; display: block; width: 100%;">
                            🗑️ Usuń miejsce
                        </button>
                    </div>
                `);
            markers.push(marker);
        });
        
        updateStats(places);
        
   } catch (error) {
    console.log('=== CATCH - Backend niedostępny ===');
    console.log('Error:', error);
        console.log('Backend niedostępny - tryb demo');
        allPlaces = [];
        updateStats([]);
    }
     updateStats(allPlaces);
    console.log('=== KONIEC loadPlaces(), allPlaces.length:', allPlaces.length); // ← DODAJ
}


async function addPlace(lat, lng, songTitle, artist, category, description, spotifyUrl, albumImage, previewUrl) {
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
                description: description,
                spotifyUrl: spotifyUrl,
                albumImage: albumImage,
                previewUrl: previewUrl
            })
        });
        if (response.ok) {
            showToast('🎉 Miejsce dodane pomyślnie!', '✅');
            
            loadPlaces();
            
            map.flyTo([lat, lng], 15, {
                duration: 1.5,
                easeLinearity: 0.5
            });
            
            setTimeout(() => {
                markers.forEach(marker => {
                    const markerLatLng = marker.getLatLng();
                    if (Math.abs(markerLatLng.lat - lat) < 0.0001 && 
                        Math.abs(markerLatLng.lng - lng) < 0.0001) {
                        marker.openPopup();
                        
                        const el = marker.getElement();
                        if (el) {
                            el.classList.add('marker-pulse');
                            setTimeout(() => el.classList.remove('marker-pulse'), 2000);
                        }
                    }
                });
            }, 1600);
            
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

map.on('click', function(e) {
    currentLat = e.latlng.lat;
    currentLng = e.latlng.lng;
    modal.style.display = 'block';
});

closeBtn.onclick = function() {
    modal.style.display = 'none';
    form.reset();
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
        form.reset();
    }
}
    


form.onsubmit = function(e) {
    e.preventDefault();
    
    const songTitle = document.getElementById('songTitle').value;
    const artist = document.getElementById('artist').value;
    const category = document.getElementById('category').value;
    const description = document.getElementById('description').value;
    const spotifyUrl = document.getElementById('spotifyUrl').value;
    const albumImage = document.getElementById('albumImage').value;
    const previewUrl = document.getElementById('previewUrl').value;
    
    addPlace(currentLat, currentLng, songTitle, artist, category, description || 'Brak opisu', spotifyUrl, albumImage, previewUrl);
    
    modal.style.display = 'none';
    form.reset();
}

async function deletePlace(placeId) {
    if (!confirm('Czy na pewno chcesz usunąć to miejsce?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:5000/api/places/${placeId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadPlaces();
            showToast('🗑️ Miejsce zostało usunięte', '✅');
        }
    } catch (error) {
        console.error('Błąd usuwania miejsca:', error);
        showToast('❌ Nie udało się usunąć miejsca', '⚠️');
    }
}

function updateStats(places) {
    document.getElementById('totalPlaces').textContent = places.length;
    
    if (places.length === 0) {
        document.getElementById('topCategory').textContent = '-';
        document.getElementById('topArtists').innerHTML = '<div style="text-align: center; color: #999;">Brak danych</div>';
        return;
    }
    
    const categoryCount = {};
    places.forEach(place => {
        categoryCount[place.category] = (categoryCount[place.category] || 0) + 1;
    });
    
    const topCategory = Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b
    );
    
    document.getElementById('topCategory').textContent = 
        `${getCategoryIcon(topCategory)} ${topCategory} (${categoryCount[topCategory]}x)`;
    
    const artistCount = {};
    places.forEach(place => {
        artistCount[place.artist] = (artistCount[place.artist] || 0) + 1;
    });
    
    const sortedArtists = Object.entries(artistCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sortedArtists.length > 0) {
        const topArtistsHTML = sortedArtists.map((artist, index) => `
            <div class="top-artist-item">
                <span class="top-artist-name">${index + 1}. ${artist[0]}</span>
                <span class="top-artist-count">${artist[1]} ${artist[1] === 1 ? 'miejsce' : 'miejsca'}</span>
            </div>
        `).join('');
        
        document.getElementById('topArtists').innerHTML = topArtistsHTML;
    } else {
        document.getElementById('topArtists').innerHTML = '<div style="text-align: center; color: #999;">Brak danych</div>';
    }
    updateFilterCounts(places);
}
function updateFilterCounts(places) {
    const categoryCount = {};
    
    places.forEach(place => {
        categoryCount[place.category] = (categoryCount[place.category] || 0) + 1;
    });
    
    // Aktualizuj każdy przycisk filtra
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const category = btn.getAttribute('onclick').match(/'([^']+)'/)[1];
        const count = category === 'all' ? places.length : (categoryCount[category] || 0);
        
        // Znajdź tekst przycisku i dodaj licznik
        const btnText = btn.textContent.split('(')[0].trim();
        btn.textContent = `${btnText} (${count})`;
    });
}

function filterByCategory(category) {
    currentFilter = category;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    const filteredPlaces = category === 'all' 
        ? allPlaces 
        : allPlaces.filter(place => place.category === category);
    
    filteredPlaces.forEach(place => {
        const color = getCategoryColor(place.category);
        const icon = createColoredIcon(color);
        
        const marker = L.marker([place.lat, place.lng], {icon: icon})
            .addTo(map)
            .bindPopup(`
                <div style="min-width: 260px;">
                    ${place.albumImage ? `<img src="${place.albumImage}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
                    
                    <b style="font-size: 16px;">${place.songTitle}</b><br>
                    <i style="color: #666;">${place.artist}</i><br>
                    
                    <span style="background: ${color}; color: white; padding: 3px 8px; 
                          border-radius: 5px; font-size: 12px; display: inline-block; 
                          margin-top: 5px; margin-bottom: 8px;">${getCategoryIcon(place.category)} ${place.category}</span>
                    
                    <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                    
                    ${place.previewUrl ? `
                        <audio controls style="width: 100%; margin-bottom: 10px;">
                            <source src="${place.previewUrl}" type="audio/mpeg">
                        </audio>
                    ` : '<p style="color: #999; font-size: 12px; margin-bottom: 10px;">Brak preview</p>'}
                    
                    ${place.spotifyUrl ? `
                        <a href="${place.spotifyUrl}" target="_blank" 
                           style="display: inline-block; background: #1DB954; color: white; 
                                  padding: 8px 15px; border-radius: 5px; text-decoration: none; 
                                  font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                            🎵 Otwórz w Spotify
                        </a>
                    ` : ''}
                    
                    <button onclick="deletePlace(${place.id})" 
                            style="background: #e74c3c; color: white; border: none; 
                                   padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                   font-weight: bold; display: block; width: 100%;">
                        🗑️ Usuń miejsce
                    </button>
                </div>
            `);
        markers.push(marker);
    });
    
    updateStats(filteredPlaces);
}

// ===== SPOTIFY INTEGRATION =====

let spotifySearchTimeout;
const spotifySearchInput = document.getElementById('spotifySearch');
const spotifyResults = document.getElementById('spotifyResults');

spotifySearchInput.addEventListener('input', function(e) {
    clearTimeout(spotifySearchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        spotifyResults.classList.remove('show');
        spotifyResults.innerHTML = '';
        return;
    }
    
    spotifySearchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/spotify/search?q=${encodeURIComponent(query)}`);
            const tracks = await response.json();
            
            displaySpotifyResults(tracks);
        } catch (error) {
            console.error('Błąd wyszukiwania Spotify:', error);
        }
    }, 500);
});

function displaySpotifyResults(tracks) {
    if (tracks.length === 0) {
        spotifyResults.innerHTML = '<div style="padding: 12px; text-align: center; color: #666;">Nie znaleziono utworów</div>';
        spotifyResults.classList.add('show');
        return;
    }
    
    spotifyResults.innerHTML = tracks.map(track => `
        <div class="spotify-result-item" onclick="selectSpotifyTrack('${track.id}', '${escapeHtml(track.name)}', '${escapeHtml(track.artist)}', '${track.spotify_url}', '${track.image || ''}', '${track.preview_url || ''}')">
            ${track.image ? `<img src="${track.image}" class="spotify-result-image" alt="Album cover">` : '<div class="spotify-result-image" style="background: #ddd;"></div>'}
            <div class="spotify-result-info">
                <div class="spotify-result-title">${track.name}</div>
                <div class="spotify-result-artist">${track.artist}</div>
            </div>
        </div>
    `).join('');
    
    spotifyResults.classList.add('show');
}

function selectSpotifyTrack(id, name, artist, spotifyUrl, image, previewUrl) {
    document.getElementById('songTitle').value = `${name} - ${artist}`;
    document.getElementById('artist').value = artist;
    document.getElementById('spotifyUrl').value = spotifyUrl;
    document.getElementById('albumImage').value = image;
    document.getElementById('previewUrl').value = previewUrl;
    
    spotifyResults.classList.remove('show');
    spotifyResults.innerHTML = '';
    spotifySearchInput.value = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '\\\'');
}

loadPlaces();
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.querySelector('.theme-icon');

// Sprawdź zapisany motyw w localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
}

// Przełącznik motywu
const lightLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
    maxZoom: 19
});

const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    maxZoom: 19
});

// Ustaw domyślną warstwę
if (savedTheme === 'dark') {
    darkLayer.addTo(map);
} else {
    lightLayer.addTo(map);
}

// Przełącznik motywu
themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
        // Zmień mapę na ciemną
        map.removeLayer(lightLayer);
        darkLayer.addTo(map);
    } else {
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
        // Zmień mapę na jasną
        map.removeLayer(darkLayer);
        lightLayer.addTo(map);
    }
});
// ===== WYSZUKIWARKA MIEJSC =====

const placeSearchInput = document.getElementById('placeSearch');
let searchTimeout;

placeSearchInput.addEventListener('input', function(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length === 0) {
        // Pokaż wszystkie miejsca
        loadPlaces();
        return;
    }
    
    searchTimeout = setTimeout(() => {
        const filteredPlaces = allPlaces.filter(place => 
            place.songTitle.toLowerCase().includes(query) ||
            place.artist.toLowerCase().includes(query) ||
            place.description.toLowerCase().includes(query)
        );
        
        // Usuń wszystkie markery
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        if (filteredPlaces.length === 0) {
            alert('Nie znaleziono miejsc spełniających kryteria');
            return;
        }
        
        // Dodaj tylko znalezione markery
        filteredPlaces.forEach(place => {
            const color = getCategoryColor(place.category);
            const icon = createColoredIcon(color);
            
            const marker = L.marker([place.lat, place.lng], {icon: icon})
                .addTo(map)
                .bindPopup(`
                    <div style="min-width: 260px;">
                        ${place.albumImage ? `<img src="${place.albumImage}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;">` : ''}
                        
                        <b style="font-size: 16px;">${place.songTitle}</b><br>
                        <i style="color: #666;">${place.artist}</i><br>
                        
                        <span style="background: ${color}; color: white; padding: 3px 8px; 
                              border-radius: 5px; font-size: 12px; display: inline-block; 
                              margin-top: 5px; margin-bottom: 8px;">${getCategoryIcon(place.category)} ${place.category}</span>
                        
                        <p style="margin-top: 8px; margin-bottom: 10px;">${place.description}</p>
                        
                        ${place.previewUrl ? `
                            <audio controls style="width: 100%; margin-bottom: 10px;">
                                <source src="${place.previewUrl}" type="audio/mpeg">
                            </audio>
                        ` : '<p style="color: #999; font-size: 12px; margin-bottom: 10px;">Brak preview</p>'}
                        
                        ${place.spotifyUrl ? `
                            <a href="${place.spotifyUrl}" target="_blank" 
                               style="display: inline-block; background: #1DB954; color: white; 
                                      padding: 8px 15px; border-radius: 5px; text-decoration: none; 
                                      font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                                🎵 Otwórz w Spotify
                            </a>
                        ` : ''}
                        
                        <button onclick="deletePlace(${place.id})" 
                                style="background: #e74c3c; color: white; border: none; 
                                       padding: 8px 15px; border-radius: 5px; cursor: pointer;
                                       font-weight: bold; display: block; width: 100%;">
                            🗑️ Usuń miejsce
                        </button>
                    </div>
                `);
            markers.push(marker);
        });
        
        // Wycentruj mapę na znalezionych miejscach
        if (filteredPlaces.length === 1) {
            map.flyTo([filteredPlaces[0].lat, filteredPlaces[0].lng], 15, {duration: 1});
        } else {
            const bounds = L.latLngBounds(filteredPlaces.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, {padding: [50, 50]});
        }
        
        updateStats(filteredPlaces);
    }, 500);
});

// ===== LOSOWE MIEJSCE =====



function randomPlace() {
    if (allPlaces.length === 0) {
        alert('Brak miejsc na mapie!');
        return;
    }
    
    // Pokaż modal z kostką
    const diceModal = document.getElementById('diceModal');
    diceModal.classList.add('show');
    
    // Poczekaj na animację (2 sekundy)
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * allPlaces.length);
        const place = allPlaces[randomIndex];
        
        // Ukryj modal
        diceModal.classList.remove('show');
        
        // Przesuń do miejsca i otwórz popup
        map.flyTo([place.lat, place.lng], 16, {
            duration: 1.5,
            easeLinearity: 0.5
        });
        
        setTimeout(() => {
            markers.forEach(marker => {
                const markerLatLng = marker.getLatLng();
                if (Math.abs(markerLatLng.lat - place.lat) < 0.0001 && 
                    Math.abs(markerLatLng.lng - place.lng) < 0.0001) {
                    marker.openPopup();
                    
                    const el = marker.getElement();
                    if (el) {
                        el.classList.add('marker-pulse');
                        setTimeout(() => el.classList.remove('marker-pulse'), 2000);
                    }
                }
            });
        }, 1500);
    }, 2000);
}
// ===== TOAST NOTIFICATIONS =====

function showToast(message, icon = '✅', duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.querySelector('.toast-message');
    const toastIcon = document.querySelector('.toast-icon');
    
    toastIcon.textContent = icon;
    toastMessage.textContent = message;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}
loadPlaces();
    
    
