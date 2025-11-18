# app/routes_front.py

from flask import render_template

def init_routes(app):
    """
    Définir toutes les routes front-end ici.
    """
    @app.route('/')
    def home():
        print("🏠 Route '/' appelée")  # Debug
        return render_template('index.html', title='List of Places')
    
    @app.route('/index')
    def index():
        print("🏠 Route '/index' appelée")  # Debug
        return render_template("index.html", title="List of Places")

    @app.route('/login')
    def login():
        print("🔐 Route '/login' appelée")  # Debug
        return render_template("login.html", title="Login Form")

    @app.route('/place')
    def place():
        print("📍 Route '/place' appelée")  # Debug
        return render_template("place.html", title="Place Details")

    @app.route('/add_review')
    def add_review():
        print("✍️ Route '/add_review' appelée")  # Debug
        return render_template("add_review.html", title="Add Review Form")
