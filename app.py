# Compatibilidade para inicializadores como gunicorn/uvicorn chamando 'app:app'
from main import app

if __name__ == "__main__":
    import uvicorn, os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)
