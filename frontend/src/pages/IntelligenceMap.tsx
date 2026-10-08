import { useState, useEffect, useMemo, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Polygon, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Layers, 
  Map as MapIcon, 
  Users, 
  AlertTriangle, 
  Route as RouteIcon, 
  Crosshair, 
  Radio, 
  ShieldCheck, 
  Search, 
  Compass, 
  Maximize2, 
  Filter, 
  Eye, 
  ChevronRight,
  Info
} from "lucide-react"

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

export interface GISSurvivor {
  id: string
  tracking_id?: number
  lat: number
  lng: number
  confidence: number
  risk_score: number
  priority: string
  status: string
  detection_count?: number
  reasons?: string[]
  first_frame?: number
  last_detected?: string
  is_real_ai?: boolean
}

export interface GISHazard {
  id: string
  type: string
  lat: number
  lng: number
  radius_meters: number
  severity: string
  status: string
  confidence?: number
  description?: string
  detected_at?: string
  is_real_ai?: boolean
  model_supported?: boolean
  model_status?: string
}

export interface GISTeam {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  status: string
  battery?: number
  capacity?: number
  assigned_survivor?: string | null
}

// Marker Icon Builders
const createSurvivorIcon = (priority: string) => {
  const isCritical = priority === "CRITICAL"
  const isHigh = priority === "HIGH"
  const color = isCritical ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.9)] animate-pulse" : isHigh ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"
  return L.divIcon({
    className: "bg-transparent",
    html: `<div class="w-6 h-6 ${color} rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white">S</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

const createHazardIcon = (severity: string) => {
  const isCritical = severity === "CRITICAL"
  const color = isCritical ? "bg-red-600" : "bg-amber-500"
  return L.divIcon({
    className: "bg-transparent",
    html: `<div class="w-6 h-6 ${color} rounded-sm border-2 border-white flex items-center justify-center text-[11px] font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.8)]">⚠</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

const createTeamIcon = (type: string) => {
  const badge = type === "DRONE" ? "DRN" : type === "BOAT" ? "BOAT" : "GRD"
  return L.divIcon({
    className: "bg-transparent",
    html: `<div class="px-1.5 py-0.5 bg-cyan-600 border border-white rounded shadow-[0_0_10px_rgba(6,182,212,0.8)] text-[9px] font-mono font-bold text-white whitespace-nowrap">${badge}</div>`,
    iconSize: [36, 18],
    iconAnchor: [18, 9]
  })
}

// Subcomponent to fit map bounds to active entities
function MapBoundsController({ targets }: { targets: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (targets.length > 0) {
      const bounds = L.latLngBounds(targets.map(t => L.latLng(t[0], t[1])))
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
    }
  }, [targets, map])
  return null
}

export default function IntelligenceMap({ missionId = "ALPHA-7" }: { missionId?: string }) {
  // Layer Toggles
  const [showSurvivors, setShowSurvivors] = useState<boolean>(true)
  const [showHazards, setShowHazards] = useState<boolean>(true)
  const [showTeams, setShowTeams] = useState<boolean>(true)
  const [showRoutes, setShowRoutes] = useState<boolean>(true)
  const [showCoverage, setShowCoverage] = useState<boolean>(true)

  // Map Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL")
  const [selectedEntity, setSelectedEntity] = useState<any>(null)

  // Data
  const [survivors, setSurvivors] = useState<GISSurvivor[]>([])
  const [hazards, setHazards] = useState<GISHazard[]>([])
  const [teams, setTeams] = useState<GISTeam[]>([])
  const [plannedRoute, setPlannedRoute] = useState<any>(null)
  const [isRealAi, setIsRealAi] = useState<boolean>(true)
  const [activeCenter, setActiveCenter] = useState<[number, number]>([34.0522, -118.2437])

  // Load backend data
  const fetchData = async () => {
    try {
      // 1. Survivors
      const survRes = await fetch(`http://localhost:8000/api/ai/${missionId}/survivors`)
      if (survRes.ok) {
        const data = await survRes.json()
        const mapped: GISSurvivor[] = data.map((s: any, idx: number) => ({
          id: s.id,
          tracking_id: s.tracking_id,
          lat: s.location?.lat || (34.0522 + ((s.tracking_id || idx + 1) * 0.001)),
          lng: s.location?.lng || (-118.2437 + ((s.tracking_id || idx + 1) * 0.001)),
          confidence: s.confidence || 0.9,
          risk_score: s.risk_score || 50,
          priority: s.priority || "MODERATE",
          status: s.status || "DETECTED",
          detection_count: s.detection_count || 1,
          reasons: s.reasons || [],
          is_real_ai: s.is_real_ai ?? true
        }))
        setSurvivors(mapped)
      }

      // 2. Hazards
      const hazRes = await fetch(`http://localhost:8000/api/ai/${missionId}/hazards`)
      if (hazRes.ok) {
        const hData = await hazRes.json()
        setHazards(hData.hazards || [])
      }

      // 3. Teams
      const teamRes = await fetch(`http://localhost:8000/api/ai/${missionId}/teams`)
      if (teamRes.ok) {
        const tData = await teamRes.json()
        setTeams(tData.teams || [])
      }

      // 4. Default Route
      const routeRes = await fetch(`http://localhost:8000/api/ai/${missionId}/routes/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survivor_id: "P-001", team_id: "TEAM-ALPHA", avoid_hazards: true })
      })
      if (routeRes.ok) {
        const rData = await routeRes.json()
        setPlannedRoute(rData)
      }
    } catch (e) {
      console.warn("Failed loading map data:", e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [missionId])

  // WebSocket live updates
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/live")
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "ai_progress" && data.survivors) {
          setIsRealAi(true)
          const mapped: GISSurvivor[] = data.survivors.map((s: any, idx: number) => ({
            id: s.survivor_id,
            tracking_id: s.tracking_id,
            lat: s.location?.lat || (34.0522 + ((idx + 1) * 0.001)),
            lng: s.location?.lng || (-118.2437 + ((idx + 1) * 0.001)),
            confidence: s.confidence,
            risk_score: s.risk_score,
            priority: s.priority,
            status: s.status,
            detection_count: s.detection_count,
            reasons: s.reasons,
            is_real_ai: true
          }))
          setSurvivors(mapped)
        }
      } catch (err) {}
    }
    return () => ws.close()
  }, [])

  // Filtered survivors
  const filteredSurvivors = useMemo(() => {
    return survivors.filter(s => {
      const matchesSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPriority = selectedPriority === "ALL" || s.priority === selectedPriority
      return matchesSearch && matchesPriority
    })
  }, [survivors, searchQuery, selectedPriority])

  // Sector Search Coverage Boundary (Polygon)
  const coveragePolygon: [number, number][] = [
    [34.0470, -118.2520],
    [34.0570, -118.2520],
    [34.0570, -118.2360],
    [34.0470, -118.2360]
  ]

  // Collect target coordinates for auto-fit bounds
  const allTargetPoints: [number, number][] = useMemo(() => {
    const points: [number, number][] = []
    if (showSurvivors) filteredSurvivors.forEach(s => points.push([s.lat, s.lng]))
    if (showHazards) hazards.forEach(h => points.push([h.lat, h.lng]))
    if (showTeams) teams.forEach(t => points.push([t.lat, t.lng]))
    return points
  }, [filteredSurvivors, hazards, teams, showSurvivors, showHazards, showTeams])

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Top GIS Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card/60 border border-slate-800 p-3 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">OPERATIONAL GIS INTELLIGENCE MAP</h2>
              <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold">
                {isRealAi ? "REAL AI" : "SIMULATION"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Sector 4 Flood Response • Live Multi-Agent Geospatial Positioning
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search ID (e.g. P-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-44"
            />
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ALL">ALL PRIORITIES</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MODERATE">MODERATE</option>
            <option value="LOW">LOW</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-800 bg-slate-900 text-slate-300 text-xs h-7"
            onClick={fetchData}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Map Body: Full-Screen GIS Map with Overlay Controls & Inspector */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[550px] relative">
        
        {/* Leaflet Map Canvas */}
        <div className="lg:col-span-3 rounded-xl overflow-hidden border border-slate-800 relative bg-[#0a192f] shadow-inner flex flex-col">
          
          {/* Layer Toggle Floating Widget */}
          <div className="absolute top-4 left-4 z-[400] flex flex-wrap gap-2">
            <button
              onClick={() => setShowSurvivors(!showSurvivors)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md border ${
                showSurvivors
                  ? "bg-slate-900/90 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  : "bg-slate-950/70 text-slate-500 border-slate-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showSurvivors ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}></span>
              Survivors ({filteredSurvivors.length})
            </button>

            <button
              onClick={() => setShowHazards(!showHazards)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md border ${
                showHazards
                  ? "bg-slate-900/90 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                  : "bg-slate-950/70 text-slate-500 border-slate-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-sm ${showHazards ? "bg-amber-400" : "bg-slate-600"}`}></span>
              Hazards ({hazards.length})
            </button>

            <button
              onClick={() => setShowTeams(!showTeams)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md border ${
                showTeams
                  ? "bg-slate-900/90 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "bg-slate-950/70 text-slate-500 border-slate-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showTeams ? "bg-cyan-400" : "bg-slate-600"}`}></span>
              Rescue Teams ({teams.length})
            </button>

            <button
              onClick={() => setShowRoutes(!showRoutes)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md border ${
                showRoutes
                  ? "bg-slate-900/90 text-blue-400 border-blue-500/50"
                  : "bg-slate-950/70 text-slate-500 border-slate-800"
              }`}
            >
              <RouteIcon className="w-3 h-3" />
              Rescue Routes
            </button>

            <button
              onClick={() => setShowCoverage(!showCoverage)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md border ${
                showCoverage
                  ? "bg-slate-900/90 text-purple-400 border-purple-500/50"
                  : "bg-slate-950/70 text-slate-500 border-slate-800"
              }`}
            >
              <Crosshair className="w-3 h-3" />
              Coverage Grid
            </button>
          </div>

          {/* Leaflet Container with Free OpenStreetMap Tiles */}
          <MapContainer
            center={activeCenter}
            zoom={14}
            style={{ height: "100%", width: "100%", background: "#06101e" }}
            zoomControl={false}
          >
            {/* Auto-fit to active items */}
            {allTargetPoints.length > 0 && <MapBoundsController targets={allTargetPoints} />}

            {/* 100% Free OpenStreetMap Tiles without CARTO dependency or API keys */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="osm-emergency-tiles"
            />

            {/* Search Coverage Polygon */}
            {showCoverage && (
              <Polygon
                positions={coveragePolygon}
                pathOptions={{
                  color: "#a855f7",
                  weight: 1.5,
                  dashArray: "4, 6",
                  fillColor: "#a855f7",
                  fillOpacity: 0.05
                }}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">SECTOR 4 SEARCH GRID</div>
                  <div className="text-xs text-purple-700 font-mono">Area Covered: 64%</div>
                  <div className="text-xs text-slate-600">Recon status: ACTIVE</div>
                </Popup>
              </Polygon>
            )}

            {/* Hazard Perimeters and Circles */}
            {showHazards && hazards.map((h) => (
              <Circle
                key={`circ-${h.id}`}
                center={[h.lat, h.lng]}
                radius={h.radius_meters || 150}
                pathOptions={{
                  fillColor: h.severity === "CRITICAL" ? "#ef4444" : "#f59e0b",
                  fillOpacity: 0.22,
                  color: h.severity === "CRITICAL" ? "#ef4444" : "#f59e0b",
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">{h.id}: {h.type}</div>
                  <div className={`text-xs font-bold ${h.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"}`}>
                    SEVERITY: {h.severity}
                  </div>
                  <div className="text-xs text-slate-600 font-mono">Radius: {h.radius_meters}m</div>
                  <div className="text-[10px] text-slate-500 mt-1">{h.description}</div>
                  <div className="text-[9px] font-bold text-slate-700 mt-1 uppercase">
                    {h.model_status}
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Hazard Markers */}
            {showHazards && hazards.map((h) => (
              <Marker
                key={`haz-${h.id}`}
                position={[h.lat, h.lng]}
                icon={createHazardIcon(h.severity)}
                eventHandlers={{
                  click: () => setSelectedEntity({ type: "hazard", data: h })
                }}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">{h.id}</div>
                  <div className="text-xs text-amber-700 font-semibold">{h.type}</div>
                  <div className="text-xs text-slate-500 font-mono">Perimeter: {h.radius_meters}m</div>
                  <div className="text-[10px] text-slate-600 mt-1">{h.description}</div>
                </Popup>
              </Marker>
            ))}

            {/* Rescue Routes */}
            {showRoutes && plannedRoute?.coordinates && (
              <>
                <Polyline
                  positions={plannedRoute.coordinates}
                  pathOptions={{
                    color: plannedRoute.is_safe ? "#10b981" : "#06b6d4",
                    weight: 3.5,
                    dashArray: plannedRoute.is_safe ? undefined : "6, 8",
                    opacity: 0.9
                  }}
                >
                  <Popup>
                    <div className="text-slate-900 font-bold">PRIMARY EVACUATION CORRIDOR</div>
                    <div className="text-xs text-emerald-700 font-mono">Distance: {plannedRoute.distance_km} km</div>
                    <div className="text-xs text-slate-600 font-mono">ETA: {plannedRoute.eta_minutes} min</div>
                    <div className="text-xs font-bold text-slate-700">Safety Status: {plannedRoute.is_safe ? "SECURE" : "CAUTION"}</div>
                  </Popup>
                </Polyline>

                {/* Alternative Path */}
                {plannedRoute.alternative_route?.coordinates && (
                  <Polyline
                    positions={plannedRoute.alternative_route.coordinates}
                    pathOptions={{
                      color: "#94a3b8",
                      weight: 2,
                      dashArray: "4, 6",
                      opacity: 0.6
                    }}
                  />
                )}
              </>
            )}

            {/* Rescue Team Markers */}
            {showTeams && teams.map((team) => (
              <Marker
                key={`team-${team.id}`}
                position={[team.lat, team.lng]}
                icon={createTeamIcon(team.type)}
                eventHandlers={{
                  click: () => setSelectedEntity({ type: "team", data: team })
                }}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">{team.name}</div>
                  <div className="text-xs text-cyan-700 font-mono">ID: {team.id}</div>
                  <div className="text-xs text-slate-600">Status: {team.status}</div>
                  {team.battery && <div className="text-xs text-slate-600 font-mono">Battery: {team.battery}%</div>}
                  {team.assigned_survivor && (
                    <div className="text-xs text-emerald-700 font-bold mt-1">Target: {team.assigned_survivor}</div>
                  )}
                </Popup>
              </Marker>
            ))}

            {/* Survivor Markers */}
            {showSurvivors && filteredSurvivors.map((s) => (
              <Marker
                key={`surv-${s.id}`}
                position={[s.lat, s.lng]}
                icon={createSurvivorIcon(s.priority)}
                eventHandlers={{
                  click: () => setSelectedEntity({ type: "survivor", data: s })
                }}
              >
                <Popup>
                  <div className="text-slate-900 font-bold">Survivor {s.id}</div>
                  <div className="flex items-center gap-1.5 mt-1 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white ${
                      s.priority === "CRITICAL" ? "bg-red-600" : s.priority === "HIGH" ? "bg-amber-600" : "bg-emerald-600"
                    }`}>
                      {s.priority}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      RISK {s.risk_score}/100
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-mono">
                    Confidence: {(s.confidence * 100).toFixed(0)}% • Status: {s.status}
                  </div>
                  {s.reasons && s.reasons.length > 0 && (
                    <div className="text-[10px] text-slate-500 mt-1 border-t pt-1">
                      {s.reasons[0]}
                    </div>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Map Legend Overlay (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-[400] bg-slate-950/85 border border-slate-800 p-2.5 rounded-lg backdrop-blur-md text-[11px] font-mono text-slate-300 shadow-xl pointer-events-auto flex flex-col gap-1.5">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Map Legend</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
              <span>Critical Survivor (Risk &gt; 75)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Verified Survivor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
              <span>Hazard Exclusion Perimeter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-emerald-400"></span>
              <span>Safe Evacuation Corridor</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Selected Object Inspector & Active Target List */}
        <div className="flex flex-col gap-4">
          
          {/* Target Inspector Card */}
          <Card className="bg-card/50 border-slate-800 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                Target Inspector
              </CardTitle>
              {selectedEntity && (
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </CardHeader>
            <CardContent className="p-4 flex-1">
              {selectedEntity ? (
                <div className="space-y-3 font-mono text-xs">
                  {selectedEntity.type === "survivor" && (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-base font-bold text-white">{selectedEntity.data.id}</div>
                          <div className="text-[10px] text-slate-400">Tracking: #{selectedEntity.data.tracking_id || "N/A"}</div>
                        </div>
                        <Badge className={
                          selectedEntity.data.priority === "CRITICAL" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                        }>
                          {selectedEntity.data.priority} ({selectedEntity.data.risk_score}/100)
                        </Badge>
                      </div>

                      <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Detection Conf:</span>
                          <span className="text-emerald-400 font-bold">{(selectedEntity.data.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Status:</span>
                          <span className="text-cyan-400">{selectedEntity.data.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Coordinates:</span>
                          <span className="text-slate-300 font-mono">{selectedEntity.data.lat.toFixed(4)}, {selectedEntity.data.lng.toFixed(4)}</span>
                        </div>
                      </div>

                      {selectedEntity.data.reasons && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Risk Factors:</div>
                          <ul className="text-[11px] text-slate-400 space-y-1 pl-2 border-l border-slate-800">
                            {selectedEntity.data.reasons.map((r: string, i: number) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {selectedEntity.type === "hazard" && (
                    <>
                      <div className="flex justify-between items-start">
                        <div className="text-base font-bold text-white">{selectedEntity.data.id}</div>
                        <Badge className="bg-amber-600 text-white">{selectedEntity.data.severity}</Badge>
                      </div>
                      <div className="text-xs text-amber-400 font-bold uppercase">{selectedEntity.data.type}</div>
                      <p className="text-slate-400 text-xs font-sans">{selectedEntity.data.description}</p>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Perimeter: {selectedEntity.data.radius_meters}m • Status: {selectedEntity.data.status}
                      </div>
                    </>
                  )}

                  {selectedEntity.type === "team" && (
                    <>
                      <div className="text-base font-bold text-white">{selectedEntity.data.name}</div>
                      <div className="text-cyan-400 text-xs">{selectedEntity.data.type} ASSET</div>
                      <div className="text-xs text-slate-300 font-mono">Status: {selectedEntity.data.status}</div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs font-mono">
                  Click any survivor, hazard, or rescue team marker on the map to inspect live telemetry.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Target Registry */}
          <Card className="flex-1 bg-card/50 border-slate-800 flex flex-col min-h-[220px]">
            <CardHeader className="py-3 px-4 border-b border-slate-800">
              <CardTitle className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
                <span>Active Targets ({filteredSurvivors.length})</span>
                <span className="text-[10px] text-slate-500 font-normal">Auto-Sync</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[260px]">
              <div className="divide-y divide-slate-800/80 font-mono text-xs">
                {filteredSurvivors.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedEntity({ type: "survivor", data: s })
                      setActiveCenter([s.lat, s.lng])
                    }}
                    className="p-3 hover:bg-slate-800/40 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${s.priority === "CRITICAL" ? "bg-red-500 animate-ping" : "bg-emerald-500"}`}></span>
                        {s.id}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Conf: {(s.confidence * 100).toFixed(0)}% • {s.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={s.priority === "CRITICAL" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300"}>
                        {s.risk_score}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
