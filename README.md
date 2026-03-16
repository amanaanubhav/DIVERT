# DIVERT: Dynamic Intelligent Vehicle Emergency Routing & Traffic

DIVERT is a state-of-the-art, real-time preemptive traffic management system designed to assist emergency vehicles (Ambulances, Fire Trucks, Police) in navigating through congested urban environments. By leveraging GPS tracking, OSRM street routing, and ML-powered ETA prediction, DIVERT dynamically clears lanes and synchronizes traffic signals ahead of an emergency vehicle's arrival.

![DIVERT Dashboard](https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=1200&q=80) 

## 🚀 Key Features

- **Preemptive Signal Control**: Traffic signals automatically switch to a "DIVERTED" state as emergency vehicles approach, reserving a dedicated lane.
- **Real-Street Routing**: Uses OSRM (Open Source Routing Machine) to calculate the fastest path using actual road networks.
- **ML-Powered ETAs**: Predicts arrival times more accurately by considering distance, vehicle type, and historical congestion data.
- **Real-Time Visualization**: A premium, high-performance dashboard built with React and Leaflet for monitoring the entire city's emergency fleet.
- **Multi-Unit Intelligence**: Supports simultaneous dispatch of Medical (Ambulance), Fire, and Police units.

## 🛠 Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, React-Leaflet.
- **Backend**: FastAPI (Python), WebSockets for real-time telemetry.
- **Data Layer**: Redis for high-speed state management and real-time updates.
- **Routing**: OSRM API for street-level navigation.
- **ML Engine**: Scikit-Learn (Random Forest) for ETA prediction.

## 📦 Getting Started

### Prerequisites

- Node.js & npm
- Python 3.10+
- Redis Server (local or via Docker)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/divert.git
   cd divert
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Environment**:
   Ensure Redis is running on `localhost:6379`.

## 🚦 How it Works

1. **Dispatch**: A command center operator selects a location on the map and chooses the emergency unit type.
2. **Pathfinding**: The system fetches the optimal street route from OSRM.
3. **Tracking**: The vehicle's GPS position is updated via WebSockets every 500ms.
4. **Preemption**: When a vehicle is within 600m of a signal, the signal triggers its "DIVERTED" state, notifying public vehicles to clear the lane.
5. **Recovery**: Once the vehicle passes, the signal reverts to "NORMAL" traffic flow.

## 🔮 Future Scope

- **V2X Communication**: Direct vehicle-to-signal low-latency communication.
- **Public Notification**: Mobile app alerts for civilian drivers in the path of the emergency vehicle.
- **Edge AI**: Localized AI at traffic signals to optimize lane clearance based on computer vision.

---
*Developed for a safer, faster, and more efficient urban emergency response.*
