# Asiya House Coffee

## Run locally

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

Open http://127.0.0.1:5000. Reservation requests are stored in `reservations.db`.

For hosting, deploy as a Python web service with `gunicorn server:app` and set
`DATABASE_PATH` to a file on persistent storage. GitHub Pages cannot run this
backend, and an ephemeral host filesystem will not retain reservations.