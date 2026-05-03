import React, { useState } from "react";

function App() {
  const [slots, setSlots] = useState([]);

  const salonId = "69ef87d145da8e866bf789fc";       // your salon
  const serviceId = "69ef884145da8e866bf78a01";     // your service
  const date = "2026-04-28";

  const getAvailability = async () => {
    const res = await fetch(
      `http://localhost:4000/api/salons/${salonId}/availability?date=${date}&service_id=${serviceId}`
    );

    const data = await res.json();
    setSlots(data.slots || []);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Salon Booking</h1>

      <button onClick={getAvailability}>
        Load Available Slots
      </button>

      <div style={{ marginTop: 20 }}>
        {slots.map((slot, index) => (
          <button
            key={index}
            style={{
              margin: 5,
              padding: 10,
              cursor: "pointer"
            }}
          >
            {slot.start_time}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;