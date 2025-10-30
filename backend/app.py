from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Konfiguracja bazy danych
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mapa_krakowa.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Model bazy danych - jak wygląda "miejsce"
class Place(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    song_title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), default='inne')
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
        category=data.get('category', 'inne')
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)