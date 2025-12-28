import React, { useEffect, useState } from "react";
import {
  Calendar,
  Plus,
  X,
  Trash2,
  Edit,
  AlertTriangle,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

type EventType = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
};

export default function CalendarApp() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      setEvents(data);
    } catch {
      setError("Failed to load events");
    }
  }

  // ✅ CORRECT & SAFE SUBMIT
  async function handleSubmit() {
    setError(null);

    if (
      !formData.title ||
      !formData.startDate ||
      !formData.startTime ||
      !formData.endDate ||
      !formData.endTime
    ) {
      setError("All fields are required");
      return;
    }

    const startTime = `${formData.startDate}T${formData.startTime}:00`;
    const endTime = `${formData.endDate}T${formData.endTime}:00`;

    const payload = {
      title: formData.title,
      startTime,
      endTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      description: "",
    };

    const url = editingEvent
      ? `${API_BASE}/events/${editingEvent.id}`
      : `${API_BASE}/events`;

    const method = editingEvent ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save event");
        return;
      }

      setShowForm(false);
      setEditingEvent(null);
      setFormData({
        title: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
      });

      fetchEvents();
    } catch {
      setError("Backend not reachable");
    }
  }

  async function deleteEvent(id: string) {
    await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" });
    fetchEvents();
  }

  function hasConflict(event: EventType) {
    return events.some(
      (e) =>
        e.id !== event.id &&
        new Date(e.startTime) < new Date(event.endTime) &&
        new Date(event.startTime) < new Date(e.endTime)
    );
  }

  function openEdit(event: EventType) {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      startDate: event.startTime.slice(0, 10),
      startTime: event.startTime.slice(11, 16),
      endDate: event.endTime.slice(0, 10),
      endTime: event.endTime.slice(11, 16),
    });
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="text-indigo-600" />
          Calendar Management System
        </h1>

        <button
          onClick={() => {
            setEditingEvent(null);
            setShowForm(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          New Event
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 text-red-600 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border mb-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold text-lg">
              {editingEvent ? "Edit Event" : "Create Event"}
            </h2>
            <button onClick={() => setShowForm(false)}>
              <X />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              className="border rounded p-2"
              placeholder="Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
            <input
              type="date"
              className="border rounded p-2"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
            />
            <input
              type="time"
              className="border rounded p-2"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
            />
            <input
              type="date"
              className="border rounded p-2"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
            />
            <input
              type="time"
              className="border rounded p-2"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
            />
          </div>

          <button
            onClick={handleSubmit}
            className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg"
          >
            Save
          </button>
        </div>
      )}

      {/* GRID */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <div className="grid grid-cols-[80px_repeat(7,1fr)]">
          <div />
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="p-3 text-center font-semibold bg-slate-50">
              {d}
            </div>
          ))}

          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="text-xs p-2 bg-slate-50">{hour}:00</div>

              {Array.from({ length: 7 }).map((_, day) => (
                <div key={day} className="border h-20 p-1">
                  {events
                    .filter(
                      (e) =>
                        new Date(e.startTime).getHours() === hour &&
                        new Date(e.startTime).getDay() === day
                    )
                    .map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-2 rounded-lg text-white ${
                          hasConflict(event)
                            ? "bg-rose-500"
                            : "bg-indigo-500"
                        }`}
                      >
                        <div className="font-semibold">{event.title}</div>
                        <div className="flex justify-end gap-2 mt-1">
                          <Edit size={14} onClick={() => openEdit(event)} />
                          <Trash2
                            size={14}
                            onClick={() => deleteEvent(event.id)}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
