import { useState, useEffect, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Route as RouteIcon, 
  Navigation, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Users, 
  RotateCw, 
  CheckCircle2, 
  Compass, 
  Radio, 
  ArrowRight,
  ShieldAlert
} from "lucide-react"

// Fix leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const survivorPinIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-[0_0_12px_rgba(239,68,68,0.9)] flex items-center justify-center text-[10px] font-black text-white animate-pulse">S</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const teamPinIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-6 h-6 bg-cyan-600 rounded-full border-2 border-white shadow-[0_0_12px_rgba(6,182,212,0.9)] flex items-center justify-center text-[9px] font-black text-white">RT</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

export default function Routes({ missionId = "ALPHA-7" }: { missionId?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [survivors, setSurvivors] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [hazards, setHazards] = useState<any[]>([])
  
  // Selection
  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string>(location.state?.targetSurvivorId || "P-001")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("TEAM-ALPHA")
  const [avoidHazards, setAvoidHazards] = useState<boolean>(true)
  const [isCalculating, setIsCalculating] = useState<boolean>(false)
  
  // Route data from A* backend
  const [routeData, setRouteData] = useState<any>(null)

  // Fetch initial entities
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [survRes, teamRes, hazRes] = await Promise.all([
          fetch(`http://localhost:8000/api/ai/${missionId}/survivors`),
          fetch(`http://localhost:8000/api/ai/${missionId}/teams`),
          fetch(`http://localhost:8000/api/ai/${missionId}/hazards`)
        ])

        if (survRes.ok) {
          const s = await survRes.json()
          setSurvivors(s)
          if (!location.state?.targetSurvivorId && s.length > 0) {
            setSelectedSurvivorId(s[0].id)
          }
        }
        if (teamRes.ok) {
          const t = await teamRes.json()
          setTeams(t.teams || [])
        }
        if (hazRes.ok) {
          const h = await hazRes.json()
          setHazards(h.hazards || [])
        }
      } catch (e) {
        console.warn("Failed fetching route entities:", e)
      }
    }

    fetchEntities()
  }, [missionId])

  // Calculate route with A* backend
  const calculateRoute = async () => {
    setIsCalculating(true)
    try {
      const res = await fetch(`http://localhost:8000/api/ai/${missionId}/routes/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survivor_id: selectedSurvivorId,
          team_id: selectedTeamId,
          avoid_hazards: avoidHazards
        })
      })

      if (res.ok) {
        const data = await res.json()
        setRouteData(data)
      }
    } catch (e) {
      console.error("Route calculation error:", e)
    } finally {
      setIsCalculating(false)
    }
  }

  // Trigger calculation when survivor or team changes
  useEffect(() => {
    if (selectedSurvivorId && selectedTeamId) {
      calculateRoute()
    }
  }, [selectedSurvivorId, selectedTeamId, avoidHazards])

  const currentSurvivor = survivors.find(s => s.id === selectedSurvivorId)
  const currentTeam = teams.find(t => t.id === selectedTeamId)

  const mapCenter: [number, number] = useMemo(() => {
    if (routeData?.coordinates && routeData.coordinates.length > 0) {
      const mid = Math.floor(routeData.coordinates.length / 2)
      return routeData.coordinates[mid]
    }
    return [34.0522, -118.2437]
  }, [routeData])

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center">
            <RouteIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">RESCUE ROUTE PLANNING ENGINE</h2>
              <Badge className="bg-cyan-600 text-white font-mono text-[10px] font-bold">
                A* RISK-AWARE PATHFINDER
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous obstacle & hazard evasion • Real-time emergency corridor optimization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={calculateRoute}
            disabled={isCalculating}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
          >
            <RotateCw className={`w-4 h-4 mr-1.5 ${isCalculating ? "animate-spin" : ""}`} />
            {isCalculating ? "Calculating..." : "Recalculate Route"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 text-slate-300"
            onClick={() => navigate("/app/map")}
          >
            <MapPin className="w-4 h-4 mr-1.5" /> Full Map
          </Button>
        </div>
      </div>

      {/* Main Grid: Control Panel + Route Map */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Left Column: Route Configuration & Analytics */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          
          {/* Target & Unit Selectors */}
          <Card className="bg-card/40 border-slate-800 p-4 font-mono text-xs space-y-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                Target Survivor
              </label>
              <select
                value={selectedSurvivorId}
                onChange={(e) => setSelectedSurvivorId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-bold focus:outline-none focus:border-cyan-500"
              >
                {survivors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — Risk: {s.risk_score} [{s.priority}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                Responding Rescue Asset
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-bold focus:outline-none focus:border-cyan-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type}) — {t.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded border border-slate-800">
              <span className="text-slate-300">Hazard Evasion Buffer</span>
              <button
                type="button"
                onClick={() => setAvoidHazards(!avoidHazards)}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  avoidHazards ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {avoidHazards ? "ENABLED" : "DIRECT LINE"}
              </button>
            </div>
          </Card>

          {/* Route Performance Card */}
          {routeData && (
            <Card className="bg-card/40 border-slate-800 p-4 font-mono text-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-sm">{routeData.route_id}</span>
                <Badge className={
                  routeData.is_safe ? "bg-emerald-600 text-white font-bold" : "bg-amber-600 text-white font-bold"
                }>
                  {routeData.is_safe ? "SECURE CORRIDOR" : "CAUTION ADVISED"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Transit Distance</div>
                  <div className="text-xl font-bold text-cyan-400 mt-1">{routeData.distance_km} km</div>
                </div>
                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Estimated ETA</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{routeData.eta_minutes} mins</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Hazard Evasion Analysis
                </div>
                {routeData.hazards_avoided && routeData.hazards_avoided.length > 0 && (
                  <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Safely Bypassed Hazards:
                    </div>
                    {routeData.hazards_avoided.map((h: string, i: number) => (
                      <div key={i} className="pl-5 text-slate-300">• {h}</div>
                    ))}
                  </div>
                )}

                {routeData.hazards_encountered && routeData.hazards_encountered.length > 0 && (
                  <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/50 text-amber-300 text-[11px]">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Proximity Warning:
                    </div>
                    <div className="mt-1 text-slate-300 pl-5">
                      Route passes near {routeData.hazards_encountered.join(", ")}. Ground caution required.
                    </div>
                  </div>
                )}
              </div>

              {/* Alternative Route Metrics */}
              {routeData.alternative_route && (
                <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-slate-300">
                    <span>Alternative Route B:</span>
                    <span>{routeData.alternative_route.distance_km} km ({routeData.alternative_route.eta_minutes} min)</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Direct vector with higher hazard exposure profile.
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/60">
                Notice: Pathfinding evaluates visual & perimeter obstacle models. Responder crews must verify localized flood levels prior to final ingress.
              </div>
            </Card>
          )}

        </div>

        {/* Right Column: Tactical Leaflet Map */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-slate-800 relative bg-[#0a192f] shadow-inner flex flex-col min-h-[450px]">
          
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: "100%", width: "100%", background: "#06101e" }}
            zoomControl={false}
          >
            {/* 100% Free OpenStreetMap Tiles without CARTO dependency or API keys */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="osm-emergency-tiles"
            />

            {/* Hazard Danger Circles */}
            {hazards.map((h) => (
              <Circle
                key={`h-circ-${h.id}`}
                center={[h.lat, h.lng]}
                radius={h.radius_meters || 150}
                pathOptions={{
                  fillColor: h.severity === "CRITICAL" ? "#ef4444" : "#f59e0b",
                  fillOpacity: 0.25,
                  color: h.severity === "CRITICAL" ? "#ef4444" : "#f59e0b",
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">{h.id}: {h.type}</div>
                  <div className="text-xs text-red-600 font-bold">SEVERITY: {h.severity}</div>
                  <div className="text-xs text-slate-600">Perimeter: {h.radius_meters}m</div>
                </Popup>
              </Circle>
            ))}

            {/* Primary Planned Safe Route Polyline */}
            {routeData?.coordinates && (
              <Polyline
                positions={routeData.coordinates}
                pathOptions={{
                  color: routeData.is_safe ? "#10b981" : "#06b6d4",
                  weight: 4,
                  opacity: 0.95
                }}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">{routeData.route_id}</div>
                  <div className="text-xs text-emerald-700 font-mono font-bold">
                    Safe Path: {routeData.distance_km} km ({routeData.eta_minutes} min)
                  </div>
                </Popup>
              </Polyline>
            )}

            {/* Alternative Route Polyline */}
            {routeData?.alternative_route?.coordinates && (
              <Polyline
                positions={routeData.alternative_route.coordinates}
                pathOptions={{
                  color: "#94a3b8",
                  weight: 2,
                  dashArray: "5, 8",
                  opacity: 0.6
                }}
              />
            )}

            {/* Unit Marker (Start) */}
            {currentTeam && (
              <Marker position={[currentTeam.lat, currentTeam.lng]} icon={teamPinIcon}>
                <Popup>
                  <div className="text-slate-900 font-bold">{currentTeam.name}</div>
                  <div className="text-xs text-cyan-700 font-mono">Dispatched Unit</div>
                </Popup>
              </Marker>
            )}

            {/* Target Survivor Marker (Destination) */}
            {currentSurvivor && (
              <Marker
                position={[
                  currentSurvivor.location?.lat || (34.0522 + ((currentSurvivor.tracking_id || 1) * 0.001)),
                  currentSurvivor.location?.lng || (-118.2437 + ((currentSurvivor.tracking_id || 1) * 0.001))
                ]}
                icon={survivorPinIcon}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">Target Survivor: {currentSurvivor.id}</div>
                  <div className="text-xs text-red-600 font-mono font-bold">
                    Priority: {currentSurvivor.priority} (Risk: {currentSurvivor.risk_score})
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Floating Route Status Banner */}
          {routeData && (
            <div className="absolute top-4 left-4 z-[400] bg-slate-950/85 border border-slate-800 p-2.5 rounded-lg backdrop-blur-md font-mono text-xs flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${routeData.is_safe ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`}></span>
              <div>
                <span className="text-white font-bold">{currentTeam?.name || "Unit"}</span>
                <span className="text-slate-400 mx-2">&rarr;</span>
                <span className="text-cyan-400 font-bold">{selectedSurvivorId}</span>
              </div>
              <Badge className="bg-slate-800 text-slate-200 text-[10px]">
                {routeData.distance_km} KM • {routeData.eta_minutes} MIN
              </Badge>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
