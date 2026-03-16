import asyncio
import json
import math
import httpx
from redis.asyncio import Redis

redis_client = Redis.from_url("redis://redis:6379", decode_responses=True)

# Fixed stations where vehicles spawn
STATIONS = {
    "HEALTH": {"lat": 22.5700, "lng": 88.3600, "type": "AMBULANCE"},
    "FIRE": {"lat": 22.5800, "lng": 88.3700, "type": "FIRE_BRIGADE"},
    "CRIME": {"lat": 22.5750, "lng": 88.3550, "type": "POLICE"}
}

# Fixed traffic signals scattered in the area
SIGNALS = {
    f"SIG_{i}": {"lat": lat, "lng": lng, "state": "NORMAL", "approaching": None, "eta": None}
    for i, (lat, lng) in enumerate([
        (22.5726, 88.3639), (22.5740, 88.3650), (22.5765, 88.3675), 
        (22.5770, 88.3620), (22.5730, 88.3680), (22.5780, 88.3650)
    ])
}

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000 # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

async def fetch_osrm_route(start_lat, start_lng, end_lat, end_lng):
    """Fetches real street routing geometries from OSRM"""
    url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?geometries=geojson"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=10.0)
        data = response.json()
        if data["code"] == "Ok":
            # OSRM returns [lng, lat], we need [lat, lng]
            return [[p[1], p[0]] for p in data["routes"][0]["geometry"]["coordinates"]]
    return [[start_lat, start_lng], [end_lat, end_lng]] # Fallback straight line

async def init_redis_state():
    await redis_client.set("traffic_signals", json.dumps(SIGNALS))
    await redis_client.set("ev_fleet", json.dumps({}))
    await redis_client.set("hazards", json.dumps([]))

async def dispatch_vehicle(hazard_id: str, hazard_type: str, haz_lat: float, haz_lng: float):
    # 1. Register Hazard
    hazards_str = await redis_client.get("hazards")
    hazards = json.loads(hazards_str) if hazards_str else []
    hazards.append({"id": hazard_id, "type": hazard_type, "lat": haz_lat, "lng": haz_lng})
    await redis_client.set("hazards", json.dumps(hazards))

    # 2. Find station and get real street route
    station = STATIONS[hazard_type]
    v_id = f"{station['type']}-{hazard_id[-4:]}"
    route_coords = await fetch_osrm_route(station["lat"], station["lng"], haz_lat, haz_lng)
    
    # 3. Initialize Vehicle
    fleet_str = await redis_client.get("ev_fleet")
    fleet = json.loads(fleet_str) if fleet_str else {}
    fleet[v_id] = {"type": station["type"], "lat": route_coords[0][0], "lng": route_coords[0][1], "status": "DISPATCHED", "path": route_coords}
    await redis_client.set("ev_fleet", json.dumps(fleet))

    # 4. Movement & Signal Proximity Loop
    speed_mps = 15 # ~54 km/h
    
    for i in range(len(route_coords) - 1):
        start_pt = route_coords[i]
        end_pt = route_coords[i+1]
        dist = haversine_distance(start_pt[0], start_pt[1], end_pt[0], end_pt[1])
        steps = max(1, int(dist / (speed_mps * 0.5))) # 0.5s intervals
        
        current_lat, current_lng = start_pt[0], start_pt[1]
        
        for step in range(steps):
            current_lat += (end_pt[0] - current_lat) / (steps - step)
            current_lng += (end_pt[1] - current_lng) / (steps - step)
            
            # Update Vehicle Position
            fleet_str = await redis_client.get("ev_fleet")
            fleet = json.loads(fleet_str)
            if v_id in fleet:
                fleet[v_id]["lat"] = current_lat
                fleet[v_id]["lng"] = current_lng
                await redis_client.set("ev_fleet", json.dumps(fleet))
            
            # Check Signal Proximity (< 600 meters)
            signals_str = await redis_client.get("traffic_signals")
            signals = json.loads(signals_str)
            for sig_id, sig_data in signals.items():
                sig_dist = haversine_distance(current_lat, current_lng, sig_data["lat"], sig_data["lng"])
                if sig_dist < 600:
                    eta_seconds = int(sig_dist / speed_mps)
                    signals[sig_id].update({
                        "state": "DIVERTED", 
                        "approaching": station["type"], 
                        "eta": f"{eta_seconds}s"
                    })
                elif signals[sig_id]["approaching"] == station["type"]:
                    # Vehicle passed or moved away
                    signals[sig_id].update({"state": "NORMAL", "approaching": None, "eta": None})
            
            await redis_client.set("traffic_signals", json.dumps(signals))
            await asyncio.sleep(0.5)

    # Arrived at destination
    fleet_str = await redis_client.get("ev_fleet")
    fleet = json.loads(fleet_str)
    if v_id in fleet:
        fleet[v_id]["status"] = "ON_SCENE"
        await redis_client.set("ev_fleet", json.dumps(fleet))