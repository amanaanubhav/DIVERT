import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { Ambulance, Flame, ShieldAlert, TrafficCone, AlertCircle, Crosshair, Navigation } from 'lucide-react';

// --- Informative Signal Card UI ---
const createSignalIcon = (sig) => {
  const isDiverted = sig.state === 'DIVERTED';
  const htmlString = `
    <div class="bg-white border border-gray-300 rounded shadow-lg overflow-hidden flex flex-col w-32">
      <div class="${isDiverted ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-white'} px-2 py-1 text-[10px] font-bold text-center uppercase tracking-wide">
        ${isDiverted ? 'LANE DIVERTED' : 'NORMAL TRAFFIC'}
      </div>
      <div class="p-2 flex flex-col items-center justify-center bg-gray-50">
        ${isDiverted
      ? `<span class="text-xs font-bold text-gray-800">${sig.approaching}</span>
             <span class="text-lg font-black text-red-600">ETA: ${sig.eta}</span>`
      : `<span class="text-xs text-gray-400">Clear</span>`
    }
      </div>
    </div>
  `;
  return L.divIcon({ className: '', html: htmlString, iconSize: [128, 60], iconAnchor: [64, 30] });
};

// --- Vehicle & Hazard Icons ---
const getIconProps = (type) => {
  if (type.includes('FIRE')) return { Icon: Flame, color: '#ea580c', bg: 'bg-orange-500' };
  if (type.includes('POLICE') || type.includes('CRIME')) return { Icon: ShieldAlert, color: '#2563eb', bg: 'bg-blue-600' };
  return { Icon: Ambulance, color: '#dc2626', bg: 'bg-red-600' };
};

const getVehicleIcon = (type) => {
  const { Icon, bg } = getIconProps(type);
  return L.divIcon({
    className: '',
    html: `<div class="${bg} p-1.5 rounded-full shadow-md border-2 border-white flex items-center justify-center text-white">${renderToString(<Icon size={18} />)}</div>`,
    iconSize: [30, 30], iconAnchor: [15, 15]
  });
};

const getHazardIcon = (type) => {
  const { Icon, bg } = getIconProps(type);
  return L.divIcon({
    className: '',
    html: `<div class="${bg} p-1 rounded-sm shadow-xl border border-white animate-bounce text-white flex items-center justify-center">${renderToString(<AlertCircle size={24} />)}</div>`,
    iconSize: [32, 32], iconAnchor: [16, 32]
  });
};

const targetIcon = L.divIcon({
  className: '',
  html: `<div class="text-blue-600 animate-pulse drop-shadow-lg">${renderToString(<Crosshair size={36} />)}</div>`,
  iconSize: [36, 36], iconAnchor: [18, 18]
});

// --- Map Click Handler Component ---
function MapInteraction({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function App() {
  const [data, setData] = useState({ signals: {}, fleet: {}, hazards: [] });
  const [clickLocation, setClickLocation] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/dashboard');
    ws.onmessage = (event) => setData(JSON.parse(event.data));
    return () => ws.close();
  }, []);

  const reportHazard = async (type) => {
    if (!clickLocation) return;
    await fetch('http://localhost:8000/api/hazard/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, lat: clickLocation.lat, lng: clickLocation.lng })
    });
    setClickLocation(null); // Clear target after dispatch
  };

  return (
    <div className="h-screen w-full flex bg-gray-100 font-sans text-gray-900 overflow-hidden">

      {/* LEFT SIDEBAR: Controls & Info */}
      <div className="w-96 bg-white border-r border-gray-200 shadow-2xl z-10 flex flex-col relative">
        <div className="p-6 bg-slate-800 text-white">
          <h1 className="text-2xl font-bold tracking-tight">AutoClear</h1>
          <p className="text-slate-400 text-sm mt-1">Command & Dispatch Center</p>
        </div>

        <div className="p-6 flex-grow overflow-y-auto">

          {/* DISPATCH CONTROL PANEL */}
          <div className="bg-white border-2 border-slate-200 rounded-lg p-4 mb-8 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Navigation size={18} className="text-blue-600" />
              Dispatch Operations
            </h2>

            <div className="mb-4">
              <p className="text-xs font-bold text-slate-500 mb-1">STEP 1: SET TARGET</p>
              {clickLocation ? (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-2 rounded flex justify-between items-center">
                  <span>Target Locked: {clickLocation.lat.toFixed(4)}, {clickLocation.lng.toFixed(4)}</span>
                  <button onClick={() => setClickLocation(null)} className="text-red-500 font-bold hover:underline">Clear</button>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs p-3 rounded">
                  Click anywhere on the map to set an emergency location.
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500 mb-2">STEP 2: DEPLOY UNIT</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => reportHazard('HEALTH')}
                  disabled={!clickLocation}
                  className="flex flex-col items-center p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Ambulance className="text-red-600 mb-1 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-[10px] font-bold text-red-800">MEDICAL</span>
                </button>
                <button
                  onClick={() => reportHazard('FIRE')}
                  disabled={!clickLocation}
                  className="flex flex-col items-center p-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Flame className="text-orange-600 mb-1 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-[10px] font-bold text-orange-800">FIRE</span>
                </button>
                <button
                  onClick={() => reportHazard('CRIME')}
                  disabled={!clickLocation}
                  className="flex flex-col items-center p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <ShieldAlert className="text-blue-600 mb-1 group-hover:scale-110 transition-transform" size={20} />
                  <span className="text-[10px] font-bold text-blue-800">POLICE</span>
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE FLEET TELEMETRY */}
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Live Telemetry ({Object.keys(data.fleet).length})</h2>
          <div className="space-y-3">
            {Object.entries(data.fleet).length === 0 && (
              <p className="text-xs text-slate-400 italic">No active units deployed.</p>
            )}
            {Object.entries(data.fleet).map(([id, v]) => (
              <div key={id} className="p-3 border border-slate-200 rounded shadow-sm bg-slate-50 relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${v.status === 'ON_SCENE' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <div className="flex justify-between items-center mb-1 pl-2">
                  <span className="font-bold text-sm text-slate-800">{id}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${v.status === 'ON_SCENE' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800 animate-pulse'}`}>
                    {v.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 pl-2">
                  COORDS: {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT AREA: Map */}
      <div className="flex-grow relative z-0">
        <MapContainer center={[22.5745, 88.3650]} zoom={15} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap contributors &copy; CARTO"
          />
          <MapInteraction onMapClick={setClickLocation} />

          {/* User's click target marker */}
          {clickLocation && (
            <Marker position={[clickLocation.lat, clickLocation.lng]} icon={targetIcon} />
          )}

          {/* Render Route Polylines */}
          {Object.values(data.fleet).map((v, idx) => (
            v.path && <Polyline key={`path-${idx}`} positions={v.path} color={getIconProps(v.type).color} weight={5} opacity={0.8} />
          ))}

          {/* Render Signals */}
          {Object.entries(data.signals).map(([id, sig]) => (
            <Marker key={id} position={[sig.lat, sig.lng]} icon={createSignalIcon(sig)} />
          ))}

          {/* Render Hazards */}
          {data.hazards.map(haz => (
            <Marker key={haz.id} position={[haz.lat, haz.lng]} icon={getHazardIcon(haz.type)} />
          ))}

          {/* Render Vehicles */}
          {Object.entries(data.fleet).map(([id, vehicle]) => (
            <Marker key={id} position={[vehicle.lat, vehicle.lng]} icon={getVehicleIcon(vehicle.type)} />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}