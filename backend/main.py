from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import uuid
from services import init_redis_state, dispatch_vehicle, redis_client

app = FastAPI()

# --- THE FIX: Add CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from your React frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allows POST, GET, etc.
    allow_headers=["*"],
)
# ------------------------------------

class HazardReport(BaseModel):
    type: str # HEALTH, FIRE, CRIME
    lat: float
    lng: float

@app.on_event("startup")
async def startup_event():
    await init_redis_state()

@app.post("/api/hazard/report")
async def report_hazard(hazard: HazardReport):
    h_id = f"HAZ-{uuid.uuid4().hex[:6].upper()}"
    asyncio.create_task(dispatch_vehicle(h_id, hazard.type, hazard.lat, hazard.lng))
    return {"status": "success", "hazard_id": h_id, "message": f"{hazard.type} unit dispatched."}

@app.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            signals = await redis_client.get("traffic_signals")
            fleet = await redis_client.get("ev_fleet")
            hazards = await redis_client.get("hazards")
            
            await websocket.send_json({
                "signals": json.loads(signals) if signals else {},
                "fleet": json.loads(fleet) if fleet else {},
                "hazards": json.loads(hazards) if hazards else []
            })
            await asyncio.sleep(0.5)
    except Exception as e:
        print(f"Client disconnected: {e}")