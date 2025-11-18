from flask import Flask, render_template
from flask_restx import Api
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
import os
from flask_cors import CORS


# Initialisation
jwt = JWTManager()
bcrypt = Bcrypt()
db = SQLAlchemy()


def create_app(template_folder=None, static_folder=None):

    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hbnb.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'super-secret-key'
    app.config['JWT_SECRET_KEY'] = app.config['SECRET_KEY']

    # Initialisation des extensions
    jwt.init_app(app)
    db.init_app(app)
    bcrypt.init_app(app)

    # Initialisation de l'API
    api = Api(app, prefix="/api/v1", version='1.0', title='HBnB API',
        description='HBnB Application API', 
        doc='/api/v1/doc')  # Doc accessible sur http://localhost:5000/api/v1/doc

    # Import des namespaces RESTX
    from app.API.v1.users import api as users_ns
    from app.API.v1.place import api as places_ns
    from app.API.v1.amenity import api as amenities_ns
    from app.API.v1.review import api as reviews_ns
    from app.API.v1.auth import api as auth_ns
    from app.API.v1.admin import api as admin_ns
    from app.API.v1.debug import api as debug_ns

    # Enregistrement des namespaces
    api.add_namespace(users_ns, path='/users')
    api.add_namespace(places_ns, path='/places')
    api.add_namespace(amenities_ns, path='/amenities')
    api.add_namespace(reviews_ns, path='/reviews')
    api.add_namespace(auth_ns, path='/auth')
    api.add_namespace(admin_ns, path='/admin')
    api.add_namespace(debug_ns, path='/debug') 

    print("✅ API chargée")
    
    # --- CORS : APRÈS l'API pour éviter les conflits ---
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5500", "http://127.0.0.1:5500"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True # autorisation du JWT 
        }
    })
    print("✅ CORS activé")

    # --- Charger les routes front ---
    from app.routes_front import init_routes
    init_routes(app)
    print("✅ Routes front chargées")

    # Afficher toutes les routes pour debug
    print("\n🔍 Routes enregistrées :")
    for rule in app.url_map.iter_rules():
        methods = ','.join(rule.methods - {'HEAD', 'OPTIONS'})
        print(f"  {methods:20s} {rule.rule:40s} → {rule.endpoint}")

    return app
