import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:4000/api";
const today = new Date().toISOString().slice(0, 10);

function App() {
  const [salons, setSalons] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSalon, setSelectedSalon] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSalons();
  }, []);

  const filteredSalons = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return salons;
    }

    return salons.filter((salon) => {
      const name = salon.name?.toLowerCase() || "";
      const address = salon.address?.toLowerCase() || "";
      return name.includes(text) || address.includes(text);
    });
  }, [salons, search]);

  const loadSalons = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/salons`);
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMessage(data.message || "Could not load salons");
        return;
      }

      setSalons(data);
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const selectSalon = async (salon) => {
    setSelectedSalon(salon);
    setSelectedServiceId("");
    setServices([]);
    setSlots([]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/services/salon/${salon._id}`);
      const data = await res.json().catch(() => []);

      if (!res.ok) {
        setMessage(data.message || "Could not load services");
        return;
      }

      setServices(data);
      if (data.length === 0) {
        setMessage("No services added for this salon yet");
      }
    } catch (error) {
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async (serviceId = selectedServiceId, bookingDate = date) => {
    if (!selectedSalon || !serviceId) {
      setSlots([]);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const url = `${API_BASE}/salons/${selectedSalon._id}/availability?date=${bookingDate}&service_id=${serviceId}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSlots([]);
        setMessage(data.message || "Could not load available slots");
        return;
      }

      setSlots(data.slots || []);
      if ((data.slots || []).length === 0) {
        setMessage("No available slots for this service and date");
      }
    } catch (error) {
      setSlots([]);
      setMessage("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = async (event) => {
    const serviceId = event.target.value;
    setSelectedServiceId(serviceId);
    setSlots([]);
    await loadAvailability(serviceId);
  };

  const handleDateChange = async (event) => {
    setDate(event.target.value);
    setSlots([]);

    if (selectedServiceId) {
      await loadAvailability(selectedServiceId, event.target.value);
    }
  };

  const bookSlot = async (slot) => {
    const token = prompt("Paste customer token");

    if (token === null) {
      return;
    }

    if (!token.trim()) {
      alert("Customer token is required");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`
        },
        body: JSON.stringify({
          salon_id: selectedSalon._id,
          service_id: selectedServiceId,
          date,
          start_time: slot.start_time
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || "Booking failed");
        return;
      }

      alert("Booking confirmed");
      await loadAvailability(selectedServiceId);
    } catch (error) {
      alert("Could not connect to the booking server");
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <h1 style={styles.title}>Salon Booking</h1>
        <p style={styles.subtitle}>Find a salon, choose a service, and book an available slot.</p>
      </section>

      <section style={styles.panel}>
        <label style={styles.label} htmlFor="salon-search">Search salons</label>
        <input
          id="salon-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by salon name or location"
          style={styles.input}
        />

        <div style={styles.salonList}>
          {filteredSalons.map((salon) => {
            const active = selectedSalon?._id === salon._id;

            return (
              <button
                key={salon._id}
                onClick={() => selectSalon(salon)}
                style={{
                  ...styles.salonCard,
                  ...(active ? styles.activeSalonCard : {})
                }}
              >
                <strong style={styles.salonName}>{salon.name}</strong>
                <span style={styles.salonText}>{salon.address}</span>
                <span style={styles.salonText}>{salon.phone}</span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedSalon && (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>{selectedSalon.name}</h2>

          <label style={styles.label} htmlFor="booking-date">Date</label>
          <input
            id="booking-date"
            type="date"
            value={date}
            onChange={handleDateChange}
            style={styles.input}
          />

          <label style={styles.label} htmlFor="service-select">Service</label>
          <select
            id="service-select"
            value={selectedServiceId}
            onChange={handleServiceChange}
            style={styles.input}
          >
            <option value="">Choose a service</option>
            {services.map((service) => (
              <option key={service._id} value={service._id}>
                {service.name} - Rs. {service.price} ({service.duration} min)
              </option>
            ))}
          </select>

          <div style={styles.slotGrid}>
            {slots.map((slot) => (
              <button
                key={`${slot.start_time}-${slot.end_time}`}
                onClick={() => bookSlot(slot)}
                style={styles.slotButton}
              >
                {slot.start_time} - {slot.end_time}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading && <p style={styles.message}>Loading...</p>}
      {message && <p style={styles.message}>{message}</p>}
    </main>
  );
}

const styles = {
  page: {
    maxWidth: 720,
    margin: "0 auto",
    padding: 16,
    fontFamily: "Arial, sans-serif",
    color: "#172026"
  },
  header: {
    marginBottom: 16
  },
  title: {
    margin: "0 0 6px",
    fontSize: 28
  },
  subtitle: {
    margin: 0,
    color: "#5c6670",
    lineHeight: 1.4
  },
  panel: {
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    background: "#ffffff"
  },
  label: {
    display: "block",
    margin: "12px 0 6px",
    fontWeight: 700
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #c7d0d9",
    borderRadius: 6,
    fontSize: 16,
    background: "#ffffff"
  },
  salonList: {
    display: "grid",
    gap: 10,
    marginTop: 12
  },
  salonCard: {
    display: "grid",
    gap: 4,
    width: "100%",
    padding: 12,
    textAlign: "left",
    border: "1px solid #d9e1e8",
    borderRadius: 8,
    background: "#f9fbfc",
    cursor: "pointer"
  },
  activeSalonCard: {
    borderColor: "#0f766e",
    background: "#eefaf8"
  },
  salonName: {
    fontSize: 17
  },
  salonText: {
    color: "#52606d",
    lineHeight: 1.35
  },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: 20
  },
  slotGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginTop: 14
  },
  slotButton: {
    padding: 12,
    border: "1px solid #0f766e",
    borderRadius: 6,
    background: "#0f766e",
    color: "#ffffff",
    fontSize: 15,
    cursor: "pointer"
  },
  message: {
    margin: "12px 0",
    color: "#5c6670"
  }
};

export default App;
