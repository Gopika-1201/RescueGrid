import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix leaflet icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

export interface MapSurvivor {
  id: string
  lat: number
  lng: number
  confidence?: number
  risk_score?: number
  priority?: string
  status?: string
  is_real_ai?: boolean
}

export interface MapHazard {
  id: string
  type: string
  lat: number
  lng: number
  radius_meters?: number
  severity?: string
}

export interface MapRescueTeam {
  id: string
  name: string
  lat: number
  lng: number
  status: string
}

interface LiveMapProps {
  survivors?: MapSurvivor[]
  hazards?: MapHazard[]
  rescueTeams?: MapRescueTeam[]
  center?: [number, number]
  zoom?: number
}

// Custom Marker Icons
const createSurvivorIcon = (priority?: string) => {
  const isCritical = priority === "CRITICAL"
  const bg = isCritical ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
  return L.divIcon({
    className: "bg-transparent",
    html: `<div class="w-5 h-5 ${bg} rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white animate-pulse">S</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

const hazardIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-6 h-6 bg-amber-500 rounded border-2 border-white shadow-[0_0_12px_rgba(245,158,11,0.9)] flex items-center justify-center text-[10px] font-black text-black">⚠</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const rescueTeamIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-5 h-5 bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(6,182,212,0.9)] flex items-center justify-center text-[9px] font-bold text-black">RT</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
})

export default function LiveMap({
  survivors = [],
  hazards = [],
  rescueTeams = [],
  center = [34.0522, -118.2437],
  zoom = 14
}: LiveMapProps) {

  // Default fallback data if none passed
  const activeSurvivors: MapSurvivor[] = survivors.length > 0 ? survivors : [
    { id: "P-001", lat: 34.053, lng: -118.245, confidence: 0.94, risk_score: 88, priority: "CRITICAL", status: "PRIORITY" },
    { id: "P-002", lat: 34.0515, lng: -118.241, confidence: 0.91, risk_score: 62, priority: "HIGH", status: "VERIFIED" },
    { id: "P-003", lat: 34.0545, lng: -118.248, confidence: 0.88, risk_score: 45, priority: "MODERATE", status: "MONITORING" }
  ]

  const activeHazards: MapHazard[] = hazards.length > 0 ? hazards : [
    { id: "HAZ-001", type: "FLOOD", lat: 34.0522, lng: -118.2437, radius_meters: 350, severity: "HIGH" },
    { id: "HAZ-002", type: "STRUCTURAL_DAMAGE", lat: 34.0505, lng: -118.242, radius_meters: 180, severity: "CRITICAL" }
  ]

  const activeTeams: MapRescueTeam[] = rescueTeams.length > 0 ? rescueTeams : [
    { id: "TEAM-ALPHA", name: "Drone Squad 1", lat: 34.055, lng: -118.240, status: "EN_ROUTE" },
    { id: "TEAM-BRAVO", name: "Ground Unit 4", lat: 34.048, lng: -118.246, status: "SEARCHING" }
  ]

  // Safe evacuation route line
  const safeRouteCoords: [number, number][] = [
    [34.048, -118.246],
    [34.050, -118.244],
    [34.0515, -118.241],
    [34.055, -118.240]
  ]

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: "100%", width: "100%", background: "#0a192f" }}
        zoomControl={false}
      >
        {/* Free OpenStreetMap tiles with no API key requirement */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="osm-emergency-tiles"
        />

        {/* Hazard Danger Circles */}
        {activeHazards.map((h) => (
          <Circle
            key={h.id}
            center={[h.lat, h.lng]}
            pathOptions={{
              fillColor: h.severity === "CRITICAL" ? "#ef4444" : "#f59e0b",
              fillOpacity: 0.25,
              color: h.severity === "CRITICAL" ? "#ef4444" : "#f59e0b",
              weight: 1.5
            }}
            radius={h.radius_meters || 200}
          >
            <Popup>
              <div className="text-slate-900 font-bold">{h.id}: {h.type}</div>
              <div className="text-red-600 text-xs font-semibold">SEVERITY: {h.severity}</div>
              <div className="text-slate-600 text-xs">Perimeter: {h.radius_meters}m</div>
            </Popup>
          </Circle>
        ))}

        {/* Safe Route Polyline */}
        <Polyline
          positions={safeRouteCoords}
          pathOptions={{
            color: "#06b6d4",
            weight: 3,
            dashArray: "6, 8",
            opacity: 0.8
          }}
        />

        {/* Hazard Markers */}
        {activeHazards.map((h) => (
          <Marker key={`marker-${h.id}`} position={[h.lat, h.lng]} icon={hazardIcon}>
            <Popup>
              <div className="text-slate-900 font-bold">{h.id}</div>
              <div className="text-amber-700 font-medium text-xs">{h.type}</div>
              <div className="text-slate-500 text-xs mt-1">Hazard Zone Center</div>
            </Popup>
          </Marker>
        ))}

        {/* Rescue Team Markers */}
        {activeTeams.map((team) => (
          <Marker key={team.id} position={[team.lat, team.lng]} icon={rescueTeamIcon}>
            <Popup>
              <div className="text-slate-900 font-bold">RESCUE ASSET: {team.name}</div>
              <div className="text-cyan-700 text-xs font-semibold">STATUS: {team.status}</div>
            </Popup>
          </Marker>
        ))}

        {/* Survivor Markers */}
        {activeSurvivors.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={createSurvivorIcon(s.priority)}>
            <Popup>
              <div className="text-slate-900 font-bold">Survivor {s.id}</div>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold text-white ${
                  s.priority === "CRITICAL" ? "bg-red-600" : s.priority === "HIGH" ? "bg-orange-500" : "bg-emerald-600"
                }`}>
                  {s.priority || "MODERATE"}
                </span>
                <span className="text-xs text-slate-600 font-mono">RISK: {s.risk_score || 0}/100</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Confidence: {s.confidence ? `${(s.confidence * 100).toFixed(0)}%` : "N/A"}
              </div>
              <div className="text-xs text-slate-500">
                Status: {s.status || "DETECTED"}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold mt-1">
                {s.is_real_ai ? "✓ REAL AI INFERENCE" : "SIMULATION"}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
