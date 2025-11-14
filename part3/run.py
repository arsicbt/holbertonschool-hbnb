from app import create_app
import os

# Chemins vers la part4
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMPLATES_DIR = os.path.abspath(os.path.join(BASE_DIR, '../part4/templates/'))
STATIC_DIR = os.path.abspath(os.path.join(BASE_DIR, '../part4/static/'))

app = create_app(template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)

if __name__ == "__main__":
    app.run(debug=True)
