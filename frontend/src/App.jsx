import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToString } from 'react-dom/server';
import { Ambulance, Flame, ShieldAlert, AlertCircle, Crosshair, Navigation, Info, X, Activity, Zap } from 'lucide-react';

// --- Signal Icon UI ---
const createSignalIcon = (sig) => {
  const isDiverted = sig.state === 'DIVERTED';
  const htmlString = `
    <div class="glass overflow-hidden flex flex-col w-32 rounded-lg border-2 ${isDiverted ? 'border-red-500 pulse-red' : 'border-emerald-500/30'} shadow-lg">
      <div class="${isDiverted ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'} px-2 py-1 text-[9px] font-black text-center uppercase tracking-tighter flex justify-between items-center">
        <span>${isDiverted ? 'DIVERT' : 'OPEN'}</span>
        ${isDiverted ? `<span class="bg-white/20 px-1 py-0.5 rounded text-[8px]">${sig.lane || 'M'}</span>` : ''}
      </div>
      <div class="p-1.5 flex flex-col items-center justify-center bg-white/80">
        ${isDiverted
          ? `<span class="text-[9px] font-bold text-slate-700">${sig.approaching}</span>
             <span class="text-base font-black text-red-600 tracking-tighter">${sig.eta}</span>`
          : `<span class="text-[9px] text-slate-400 font-medium italic">Idle</span>`
        }
      </div>
    </div>
  `;
  return L.divIcon({ className: '', html: htmlString, iconSize: [128, 60], iconAnchor: [64, 30] });
};

// --- Vehicle & Hazard Icons ---
const getIconProps = (type) => {
  if (type.includes('FIRE')) return { Icon: Flame, color: '#f97316', bg: 'bg-orange-500' };
  if (type.includes('POLICE') || type.includes('CRIME')) return { Icon: ShieldAlert, color: '#2563eb', bg: 'bg-blue-600' };
  return { Icon: Ambulance, color: '#e11d48', bg: 'bg-rose-600' };
};

const getVehicleIcon = (type, lane, eta) => {
  const { Icon, bg } = getIconProps(type);
  return L.divIcon({
    className: 'float',
    html: `
      <div class="flex flex-col items-center">
        <div class="glass-light px-2 py-0.5 rounded-full border border-slate-200 shadow-sm mb-1 whitespace-nowrap">
           <span class="text-[8px] font-black text-slate-700 uppercase tracking-tighter">
             ${lane || 'M'} | ${eta || '--'}
           </span>
        </div>
        <div class="relative">
          <div class="${bg} p-2 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.3)] border-2 border-white flex items-center justify-center text-white scale-110">
            ${renderToString(<Icon size={18} />)}
          </div>
        </div>
      </div>
    `,
    iconSize: [40, 60], iconAnchor: [20, 50]
  });
};

const getHazardIcon = (type) => {
  const { bg } = getIconProps(type);
  return L.divIcon({
    className: '',
    html: `<div class="${bg} p-1.5 rounded-lg shadow-xl border-2 border-white animate-bounce text-white flex items-center justify-center">${renderToString(<AlertCircle size={24} />)}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 36]
  });
};

const targetIcon = L.divIcon({
  className: '',
  html: `<div class="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">${renderToString(<Crosshair size={42} />)}</div>`,
  iconSize: [42, 42], iconAnchor: [21, 21]
});

// --- Map Interaction ---
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
  const [showInfo, setShowInfo] = useState(false);

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
    setClickLocation(null);
  };

  const activeSignals = Object.entries(data.signals).filter(([id, sig]) => sig.active || sig.state === 'DIVERTED');

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* SIDEBAR: Normal Light Theme Style */}
      <div className="w-96 bg-white border-r border-slate-200 shadow-2xl z-20 flex flex-col">
        <div className="p-8 bg-slate-900 text-white border-b border-black">
          <div className="flex items-center gap-3">
            <div className="bg-rose-500 p-2 rounded-xl shadow-lg">
              <Zap size={24} className="fill-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">DIVERT</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Traffic Intelligence System</p>
            </div>
          </div>
        </div>

        <div className="p-6 flex-grow overflow-y-auto space-y-8 scrollbar-hide bg-slate-50/50">
          
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Navigation size={14} className="text-rose-500" />
              Dispatch Control
            </h2>

            <div className="mb-6">
              {clickLocation ? (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] p-3 rounded-xl flex justify-between items-center">
                  <span className="font-mono">TARGET: {clickLocation.lat.toFixed(4)}, {clickLocation.lng.toFixed(4)}</span>
                  <button onClick={() => setClickLocation(null)} className="text-rose-500 hover:text-rose-700"><X size={16}/></button>
                </div>
              ) : (
                <div className="bg-slate-100 text-slate-400 text-[11px] p-4 rounded-xl leading-relaxed italic border border-dashed border-slate-300">
                  Select coordinates on the map to begin vector preemption.
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'HEALTH', label: 'MEDICAL', icon: Ambulance, color: 'hover:bg-rose-50 border-rose-100 text-rose-600' },
                { id: 'FIRE', label: 'FIRE', icon: Flame, color: 'hover:bg-orange-50 border-orange-100 text-orange-600' },
                { id: 'POLICE', label: 'POLICE', icon: ShieldAlert, color: 'hover:bg-blue-50 border-blue-100 text-blue-600' }
              ].map(unit => (
                <button
                  key={unit.id}
                  onClick={() => reportHazard(unit.id)}
                  disabled={!clickLocation}
                  className={`flex flex-col items-center p-3 rounded-xl border transition-all disabled:opacity-30 group ${unit.color}`}
                >
                  <unit.icon className="mb-2 group-hover:scale-110 transition-transform" size={22} />
                  <span className="text-[9px] font-black tracking-widest">{unit.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" />
                Live Fleet
              </h2>
              <span className="text-[10px] font-bold text-slate-400">{Object.keys(data.fleet).length} UNITS</span>
            </div>
            
            <div className="space-y-3">
              {Object.entries(data.fleet).length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-10">No units currently dispatched.</p>
              )}
              {Object.entries(data.fleet).map(([id, v]) => (
                <div key={id} className="bg-white border border-slate-200 p-4 rounded-xl relative overflow-hidden group shadow-sm">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${v.status === 'ON_SCENE' ? 'bg-emerald-500' : 'bg-rose-600 animate-pulse'}`}></div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-sm uppercase text-slate-800 tracking-tight">{id}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase border ${v.status === 'ON_SCENE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {v.status}
                      </span>
                      <span className="text-[9px] font-black text-slate-400">LANE: {v.lane || 'M'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <Navigation size={10} /> {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <button 
            onClick={() => setShowInfo(true)}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200"
          >
            <Info size={14} /> System architecture
          </button>
        </div>
      </div>

      <div className="flex-grow relative z-0">
        <MapContainer center={[22.5745, 88.3650]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
          />
          <MapInteraction onMapClick={setClickLocation} />

          {clickLocation && <Marker position={[clickLocation.lat, clickLocation.lng]} icon={targetIcon} />}

          {Object.values(data.fleet).map((v, idx) => (
            v.path && <Polyline key={`path-${idx}`} positions={v.path} color={getIconProps(v.type).color} weight={5} opacity={0.4} dashArray="5, 8" />
          ))}

          {activeSignals.map(([id, sig]) => (
            <Marker key={id} position={[sig.lat, sig.lng]} icon={createSignalIcon(sig)} zIndexOffset={500} />
          ))}

          {data.hazards.map(haz => (
            <Marker key={haz.id} position={[haz.lat, haz.lng]} icon={getHazardIcon(haz.type)} />
          ))}

          {Object.entries(data.fleet).map(([id, vehicle]) => (
            <Marker key={id} position={[vehicle.lat, vehicle.lng]} icon={getVehicleIcon(vehicle.type, vehicle.lane, vehicle.eta)} zIndexOffset={1000} />
          ))}
        </MapContainer>
        
        {/* LEGEND overlay */}
        <div className="absolute bottom-8 right-8 z-10 bg-white p-4 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-2">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Standard Flow</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 pulse-red"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lane Reserved</span>
           </div>
        </div>
      </div>

      {/* INFO modal - Simple & Normal */}
      {showInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 transition-all">
          <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black tracking-tight text-slate-800">System architecture</h2>
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-rose-500"><X size={24} /></button>
            </div>
            <div className="p-8 text-sm text-slate-600 space-y-6">
              <section>
                <h3 className="font-black text-rose-500 uppercase tracking-widest text-[10px] mb-2">Project Vision</h3>
                <p>DIVERT utilizes dynamic L/R/M lane preemption to clear paths for emergency vehicles minutes before arrival, reducing response times by up to 40%.</p>
              </section>
              <section>
                <h3 className="font-black text-emerald-500 uppercase tracking-widest text-[10px] mb-2">Technical Flow</h3>
                <ul className="list-disc pl-5 space-y-2">
                   <li><strong>Pathfinding:</strong> OSRM integration for real-street routing.</li>
                   <li><strong>Lane Preemption:</strong> Automatic reservation of Left, Right, or Middle lanes at upcoming intersections.</li>
                   <li><strong>ETA Prediction:</strong> Real-time estimation based on street distance and congestion factors.</li>
                </ul>
              </section>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">&copy; 2026 Emergency Systems Framework</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}