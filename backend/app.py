from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from zoneinfo import ZoneInfo
import uuid
from typing import Dict, List

app = Flask(__name__)

# ✅ SINGLE, CORRECT CORS CONFIG (NO DUPLICATES)
CORS(
    app,
    origins=["http://localhost:5173"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ---------------- IN-MEMORY STORAGE ---------------- #
events_db: Dict[str, Dict] = {}


# ---------------- EVENT MODEL ---------------- #
class Event:
    def __init__(
        self,
        title: str,
        startTime: str,
        endTime: str,
        timezone: str = "UTC",
        description: str = "",
        event_id: str | None = None,
    ):
        self.id = event_id or str(uuid.uuid4())
        self.title = title
        self.description = description
        self.timezone = timezone

        self.start_time = self._parse_datetime(startTime, timezone)
        self.end_time = self._parse_datetime(endTime, timezone)

        if self.start_time >= self.end_time:
            raise ValueError("Start time must be before end time")

    def _parse_datetime(self, value: str, tz: str) -> datetime:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo(tz))
        return dt

    def overlaps(self, other: "Event") -> bool:
        return self.start_time < other.end_time and self.end_time > other.start_time

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "startTime": self.start_time.isoformat(),
            "endTime": self.end_time.isoformat(),
            "timezone": self.timezone,
        }


# ---------------- HELPERS ---------------- #
def find_conflicts(new_event: Event, exclude_id: str | None = None) -> List[Dict]:
    conflicts = []
    for eid, data in events_db.items():
        if eid == exclude_id:
            continue
        existing = Event(event_id=eid, **data)
        if new_event.overlaps(existing):
            conflicts.append(existing.to_dict())
    return conflicts


# ---------------- ROUTES ---------------- #

@app.route("/api/events", methods=["GET"])
def get_events():
    events = []
    for eid, data in events_db.items():
        event = Event(event_id=eid, **data)
        events.append(event.to_dict())

    events.sort(key=lambda e: e["startTime"])
    return jsonify(events), 200


@app.route("/api/events", methods=["POST"])
def create_event():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        for field in ["title", "startTime", "endTime"]:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        new_event = Event(
            title=data["title"],
            startTime=data["startTime"],
            endTime=data["endTime"],
            timezone=data.get("timezone", "UTC"),
            description=data.get("description", ""),
        )

        conflicts = find_conflicts(new_event)
        if conflicts:
            return jsonify({
                "error": "Event conflicts with existing events",
                "conflicts": conflicts
            }), 409

        events_db[new_event.id] = {
            "title": new_event.title,
            "description": new_event.description,
            "startTime": data["startTime"],
            "endTime": data["endTime"],
            "timezone": new_event.timezone,
        }

        return jsonify(new_event.to_dict()), 201

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/events/<event_id>", methods=["PUT"])
def update_event(event_id):
    if event_id not in events_db:
        return jsonify({"error": "Event not found"}), 404

    try:
        data = request.get_json()

        updated_event = Event(
            title=data["title"],
            startTime=data["startTime"],
            endTime=data["endTime"],
            timezone=data.get("timezone", "UTC"),
            description=data.get("description", ""),
            event_id=event_id,
        )

        conflicts = find_conflicts(updated_event, exclude_id=event_id)
        if conflicts:
            return jsonify({
                "error": "Updated event conflicts with existing events",
                "conflicts": conflicts
            }), 409

        events_db[event_id] = {
            "title": updated_event.title,
            "description": updated_event.description,
            "startTime": data["startTime"],
            "endTime": data["endTime"],
            "timezone": updated_event.timezone,
        }

        return jsonify(updated_event.to_dict()), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/events/<event_id>", methods=["DELETE"])
def delete_event(event_id):
    if event_id not in events_db:
        return jsonify({"error": "Event not found"}), 404

    del events_db[event_id]
    return "", 204


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "events": len(events_db)
    }), 200


# ---------------- RUN ---------------- #
if __name__ == "__main__":
    app.run(debug=True, port=5000)
