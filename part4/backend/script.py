from app import create_app, db
from app.models.user import User
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.review import Review
import uuid

# Initialize Flask app and context
app = create_app()

with app.app_context():
    print("🔄 Initializing Flask context...")

    # === Create tables if they do not exist ===
    db.create_all()
    print("📦 Tables created (if missing).")

    # ===== 1️⃣ GET OR CREATE ADMIN =====
    admin = User.query.filter_by(email="admin@hbnb.com").first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            email="admin@hbnb.com",
            first_name="Super",
            last_name="Admin",
            is_admin=True
        )
        admin.password = "admin123"  # password setter hashes it
        db.session.add(admin)
        db.session.commit()
        print(f"✅ New admin created: {admin.email} (id={admin.id})")
    else:
        print(f"✅ Admin already exists: {admin.email} (id={admin.id})")

    # ===== CREATE 6 STANDARD USERS (7 users total avec l'admin) =====
    standard_users_data = [
        {"email": "rami.swe@example.com", "first_name": "Rami", "last_name": "SWE"},
        {"email": "marie.durand@example.com", "first_name": "Marie", "last_name": "Durand"},
        {"email": "paul.martin@example.com", "first_name": "Paul", "last_name": "Martin"},
        {"email": "laura.bernard@example.com", "first_name": "Laura", "last_name": "Bernard"},
        {"email": "luc.moreau@example.com", "first_name": "Luc", "last_name": "Moreau"},
        {"email": "emma.lefevre@example.com", "first_name": "Emma", "last_name": "Lefevre"},
    ]

    standard_users = []

    for data in standard_users_data:
        user = User.query.filter_by(email=data["email"]).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                is_admin=False
            )
            user.password = "admin123"
            db.session.add(user)
            db.session.flush()  # avoir user.id
            print(f"👤 Standard user created: {user.email} (id={user.id})")
        else:
            print(f"⚠️ User {user.email} already exists (id={user.id}).")
        standard_users.append(user)

    db.session.commit()
    print(f"✅ Standard users initialized ({len(standard_users)} users).")

    # ===== CREATE / GET AMENITIES (3 amenities) =====
    amenities_data = [
        {"name": "WiFi"},
        {"name": "Swimming Pool"},
        {"name": "Air Conditioning"},
    ]

    amenities_objects = {}

    for data in amenities_data:
        existing = Amenity.query.filter_by(name=data["name"]).first()
        if not existing:
            amenity = Amenity(
                id=str(uuid.uuid4()),
                name=data["name"]
            )
            db.session.add(amenity)
            db.session.flush()
            amenities_objects[data["name"]] = amenity
            print(f"➕ Amenity created: {data['name']} (id={amenity.id})")
        else:
            amenities_objects[data["name"]] = existing
            print(f"⚠️ Amenity '{data['name']}' already exists (id={existing.id}).")

    db.session.commit()
    print("✅ Amenities initialized.")

    # ===== CREATE 10 PLACES =====
    places_data = [
        {
            "title": "Appartement Paris Centre",
            "description": "Magnifique appartement au coeur de Paris",
            "price": 120.50,
            "latitude": 48.8566,
            "longitude": 2.3522,
        },
        {
            "title": "Studio Montmartre",
            "description": "Charmant studio avec vue sur le Sacré-Cœur",
            "price": 90.00,
            "latitude": 48.8867,
            "longitude": 2.3431,
        },
        {
            "title": "Loft Lyon Presqu'île",
            "description": "Loft moderne en plein centre de Lyon",
            "price": 110.00,
            "latitude": 45.7640,
            "longitude": 4.8357,
        },
        {
            "title": "Maison Bordeaux Chartrons",
            "description": "Maison familiale proche des quais",
            "price": 150.00,
            "latitude": 44.8540,
            "longitude": -0.5667,
        },
        {
            "title": "Villa Marseille Corniche",
            "description": "Vue mer, piscine et grande terrasse",
            "price": 220.00,
            "latitude": 43.2800,
            "longitude": 5.3700,
        },
        {
            "title": "Duplex Nantes Centre",
            "description": "Duplex cosy à deux pas du château",
            "price": 100.00,
            "latitude": 47.2184,
            "longitude": -1.5536,
        },
        {
            "title": "Chalet Annecy Lac",
            "description": "Chalet avec vue imprenable sur le lac d’Annecy",
            "price": 180.00,
            "latitude": 45.8992,
            "longitude": 6.1294,
        },
        {
            "title": "Appartement Rennes Gare",
            "description": "Appartement pratique proche de la gare",
            "price": 80.00,
            "latitude": 48.1030,
            "longitude": -1.6720,
        },
        {
            "title": "Studio Lille Vieux-Lille",
            "description": "Studio rénové dans le Vieux-Lille",
            "price": 85.00,
            "latitude": 50.6400,
            "longitude": 3.0632,
        },
        {
            "title": "Maison Toulouse Saint-Cyprien",
            "description": "Maison avec jardin à Toulouse",
            "price": 130.00,
            "latitude": 43.6000,
            "longitude": 1.4300,
        },
    ]

    created_places = []

    for idx, pdata in enumerate(places_data):
        place = Place.query.filter_by(title=pdata["title"]).first()
        if not place:
            # on répartit les users sur les places (rotation)
            user_for_place = standard_users[idx % len(standard_users)]

            place = Place(
                id=str(uuid.uuid4()),
                title=pdata["title"],
                description=pdata["description"],
                price=pdata["price"],
                latitude=pdata["latitude"],
                longitude=pdata["longitude"],
                owner_id=admin.id,           # propriétaire = admin
                user_id=user_for_place.id    # utilisateur lié à la place
            )
            db.session.add(place)
            db.session.flush()
            created_places.append(place)
            print(f"🏠 Place created: {place.title} (id={place.id}) "
                  f"for user {user_for_place.email}")
        else:
            created_places.append(place)
            print(f"⚠️ Place already exists: {place.title} (id={place.id})")

    db.session.commit()
    print(f"✅ Places initialized ({len(created_places)} places).")

    # ===== ATTACH 3 AMENITIES TO EACH PLACE =====
    try:
        wifi = amenities_objects.get("WiFi")
        pool = amenities_objects.get("Swimming Pool")
        ac = amenities_objects.get("Air Conditioning")
        all_amenities = [wifi, pool, ac]

        for place in created_places:
            for amenity in all_amenities:
                if amenity and amenity not in place.amenities:
                    place.amenities.append(amenity)
                    print(f"🔗 Linked amenity '{amenity.name}' to place '{place.title}'.")

        db.session.commit()
        print("✅ 3 amenities linked to each place.")
    except AttributeError:
        print("⚠️ Warning: Place.amenities relationship not configured. "
              "Check your Place model 'amenities' relationship definition.")

    # =====  CREATE REVIEWS =====
    review_texts = [
        "Excellent séjour, appartement très bien situé!",
        "Logement propre et bien équipé.",
        "Quartier calme, hôte très réactif.",
        "Très bonne expérience, je recommande.",
        "Bon rapport qualité/prix.",
        "Vue incroyable, literie confortable.",
        "Emplacement idéal pour visiter la ville.",
        "Logement conforme à l’annonce.",
        "Hôte sympathique et arrangeant.",
        "Séjour parfait, merci encore !",
    ]

    for idx, place in enumerate(created_places):
        user_for_review = standard_users[idx % len(standard_users)]
        existing_review = Review.query.filter_by(
            user_id=user_for_review.id,
            place_id=place.id
        ).first()

        if not existing_review:
            review = Review(
                id=str(uuid.uuid4()),
                text=review_texts[idx % len(review_texts)],
                rating=5,
                user_id=user_for_review.id,
                place_id=place.id
            )
            db.session.add(review)
            print(f"⭐ Review created for place '{place.title}' by {user_for_review.email}.")
        else:
            print(f"⚠️ Review already exists for {user_for_review.email} / {place.title}, skipped.")

    db.session.commit()
    print("✅ Reviews initialized.")

    # ===== 7️⃣ FINAL CHECK =====
    print("\n=== Summary ===")
    print("Admin count        :", User.query.filter_by(is_admin=True).count())
    print("Total users        :", User.query.count())
    print("Total amenities    :", Amenity.query.count())
    print("Total places       :", Place.query.count())
    print("Total reviews      :", Review.query.count())
    print("====================\n")

print("🌟 Script finished successfully.")
