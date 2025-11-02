from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

app = Flask(__name__)
CORS(app)

# Konfiguracja bazy danych
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mapa_krakowa.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Konfiguracja Spotify
SPOTIFY_CLIENT_ID = 'b7425618a418495bb07c3e75ae48e17b'
SPOTIFY_CLIENT_SECRET = '31a4eadb660541cd8fd9ea5227ee59c1'

spotify_credentials = SpotifyClientCredentials(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET
)
spotify = spotipy.Spotify(client_credentials_manager=spotify_credentials)

# Model bazy danych
class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    song_title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), default='inne')
    spotify_url = db.Column(db.String(500))
    album_image = db.Column(db.String(500))
    preview_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'lat': self.lat,
            'lng': self.lng,
            'songTitle': self.song_title,
            'artist': self.artist,
            'description': self.description,
            'category': self.category,
            'spotifyUrl': self.spotify_url,
            'albumImage': self.album_image,
            'previewUrl': self.preview_url,
            'createdAt': self.created_at.isoformat()
        }

# Tworzenie tabel w bazie
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return "Witaj w Mapie Dźwiękowej Krakowa! 🎵"

@app.route('/api/places', methods=['GET'])
def get_places():
    places = Place.query.all()
    return jsonify([place.to_dict() for place in places])

@app.route('/api/places', methods=['POST'])
def add_place():
    data = request.json
    
    new_place = Place(
        lat=data['lat'],
        lng=data['lng'],
        song_title=data['songTitle'],
        artist=data['artist'],
        description=data.get('description', ''),
        category=data.get('category', 'inne'),
        spotify_url=data.get('spotifyUrl'),
        album_image=data.get('albumImage'),
        preview_url=data.get('previewUrl')
    )
    
    db.session.add(new_place)
    db.session.commit()
    
    return jsonify({"message": "Miejsce dodane!", "place": new_place.to_dict()}), 201

@app.route('/api/places/<int:place_id>', methods=['DELETE'])
def delete_place(place_id):
    place = Place.query.get_or_404(place_id)
    db.session.delete(place)
    db.session.commit()
    return jsonify({"message": "Miejsce usunięte!"}), 200

@app.route('/api/spotify/search', methods=['GET'])
def spotify_search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    
    try:
        results = spotify.search(q=query, type='track', limit=10)
        tracks = []
        
        for item in results['tracks']['items']:
            track = {
                'id': item['id'],
                'name': item['name'],
                'artist': item['artists'][0]['name'],
                'album': item['album']['name'],
                'image': item['album']['images'][0]['url'] if item['album']['images'] else None,
                'preview_url': item['preview_url'],
                'spotify_url': item['external_urls']['spotify']
            }
            tracks.append(track)
        
        return jsonify(tracks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)