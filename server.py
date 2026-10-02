import os
import sqlite3
from datetime import date, time

from flask import Flask, abort, jsonify, request, send_from_directory


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.environ.get(
    "DATABASE_PATH", os.path.join(BASE_DIR, "reservations.db")
)
app = Flask(__name__)


def initialize_database():
    database_directory = os.path.dirname(DATABASE_PATH)
    if database_directory:
        os.makedirs(database_directory, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                reservation_date TEXT NOT NULL,
                reservation_time TEXT NOT NULL,
                guests TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


initialize_database()


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/style.css")
def stylesheet():
    return send_from_directory(BASE_DIR, "style.css")


@app.get("/script.js")
def client_script():
    return send_from_directory(BASE_DIR, "script.js")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/api/reservations")
def create_reservation():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Please submit a valid reservation."), 400

    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    date_value = str(data.get("date", "")).strip()
    time_value = str(data.get("time", "")).strip()
    guests = str(data.get("guests", "")).strip()

    if not name or len(name) > 100:
        return jsonify(error="Enter a name no longer than 100 characters."), 400
    if not phone or len(phone) > 30:
        return jsonify(error="Enter a valid phone number."), 400
    if guests not in {"1", "2", "4", "6", "8", "10 or more"}:
        return jsonify(error="Choose a valid number of guests."), 400

    try:
        reservation_date = date.fromisoformat(date_value)
        reservation_time = time.fromisoformat(time_value)
    except ValueError:
        return jsonify(error="Enter a valid date and time."), 400

    if reservation_date < date.today():
        return jsonify(error="Choose today or a future date."), 400
    if not time(7, 0) <= reservation_time <= time(21, 30):
        return jsonify(error="Choose a time between 07:00 and 21:30."), 400

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute(
            """
            INSERT INTO reservations
                (name, phone, reservation_date, reservation_time, guests)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, phone, reservation_date.isoformat(),
             reservation_time.strftime("%H:%M"), guests),
        )

    return jsonify(message="Reservation request received. We will call to confirm."), 201


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)