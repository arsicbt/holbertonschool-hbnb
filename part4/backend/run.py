from app import create_app
import os

# Chemins vers la part4
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
TEMPLATES_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend/templates'))
STATIC_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend/static'))

# 🔍 DEBUG : Afficher les chemins
print(f"\n📁 BASE_DIR: {BASE_DIR}")
print(f"📁 TEMPLATES_DIR: {TEMPLATES_DIR}")
print(f"📁 STATIC_DIR: {STATIC_DIR}")
print(f"✅ TEMPLATES existe? {os.path.exists(TEMPLATES_DIR)}")
print(f"✅ STATIC existe? {os.path.exists(STATIC_DIR)}")

# Lister les fichiers dans static
if os.path.exists(STATIC_DIR):
    print(f"\n📂 Contenu de {STATIC_DIR}:")
    for root, dirs, files in os.walk(STATIC_DIR):
        level = root.replace(STATIC_DIR, '').count(os.sep)
        indent = ' ' * 2 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 2 * (level + 1)
        for file in files:
            print(f"{subindent}{file}")


app = create_app(template_folder=TEMPLATES_DIR, static_folder=STATIC_DIR)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)

