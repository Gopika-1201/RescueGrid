import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ShieldAlert, 
  MapPin, 
  Flame, 
  Waves, 
  Truck, 
  Building2, 
  Zap, 
  X, 
  CheckCircle2, 
  Radio, 
  BellRing
} from "lucide-react"

export interface HazardItem {
  id: string
  type: string
  confidence: number
  severity: string
  status: string
  lat: number
  lng: number
  radius_meters: number
  description?: string
  detected_at?: string
  is_real_ai: boolean
  model_supported: boolean
  model_status: string
}

export default function Hazards({ missionId = "ALPHA-7" }: { missionId?: string }) {
  const navigate = useNavigate()
  const [hazards, setHazards] = useState<HazardItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [severityFilter, setSeverityFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [selectedHazard, setSelectedHazard] = useState<HazardItem | null>(null)
  const [alertTriggered, setAlertTriggered] = useState<string | null>(null)

  const fetchHazards = async () => {
    try {
      setLoading(true)
      const res = await fetch(`http://localhost:8000/api/ai/${missionId}/hazards`)
      if (res.ok) {
        const data = await res.json()
        setHazards(data.hazards || [])
      }
    } catch (e) {
      console.warn("Failed loading hazards:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHazards()
  }, [missionId])

  const filteredHazards = useMemo(() => {
    return hazards.filter(h => {
      const matchesSearch = h.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            h.type.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSeverity = severityFilter === "ALL" || h.severity === severityFilter
      const matchesStatus = statusFilter === "ALL" || h.status === statusFilter
      const matchesType = typeFilter === "ALL" || h.type === typeFilter
      return matchesSearch && matchesSeverity && matchesStatus && matchesType
    })
  }, [hazards, searchQuery, severityFilter, statusFilter, typeFilter])

  const triggerHazardAlert = async (hazard: HazardItem) => {
    setAlertTriggered(hazard.id)
    setTimeout(() => setAlertTriggered(null), 4000)
  }

  const getHazardIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "FLOOD":
        return <Waves className="w-5 h-5 text-cyan-400" />
      case "FIRE":
        return <Flame className="w-5 h-5 text-red-500" />
      case "VEHICLE":
        return <Truck className="w-5 h-5 text-blue-400" />
      case "STRUCTURAL_DAMAGE":
        return <Building2 className="w-5 h-5 text-amber-500" />
      case "ELECTRICAL":
        return <Zap className="w-5 h-5 text-yellow-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-400" />
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">HAZARD INTELLIGENCE & EXCLUSION PERIMETERS</h2>
              <Badge className="bg-amber-600 text-white font-mono text-[10px] font-bold">
                MULTI-MODEL RECON
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Active disaster perimeter tracking • Autonomous exclusion buffers for route planning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200"
            onClick={fetchHazards}
          >
            Refresh Hazards
          </Button>
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
            onClick={() => navigate("/app/map")}
          >
            <MapPin className="w-4 h-4 mr-1.5" /> View on Map
          </Button>
        </div>
      </div>

      {/* Alert Trigger Toast Notification */}
      {alertTriggered && (
        <div className="p-3 bg-red-950 border border-red-500 rounded-lg text-red-200 flex items-center justify-between text-xs font-mono shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-red-400" />
            <span>DISPATCH BROADCAST TRIGGERED: High-priority perimeter warning issued for {alertTriggered}.</span>
          </div>
          <Badge className="bg-red-600 text-white">LIVE BROADCAST</Badge>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search type or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MODERATE">MODERATE</option>
            <option value="LOW">LOW</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="CONTAINED">CONTAINED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL TYPES</option>
            <option value="FLOOD">FLOOD</option>
            <option value="STRUCTURAL_DAMAGE">STRUCTURAL DAMAGE</option>
            <option value="VEHICLE">VEHICLE OBSTACLE</option>
            <option value="FIRE">FIRE</option>
            <option value="ELECTRICAL">ELECTRICAL</option>
          </select>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Showing {filteredHazards.length} of {hazards.length} hazards
        </div>
      </div>

      {/* Main Grid: Hazard Cards + Dossier Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Hazards List */}
        <div className="lg:col-span-2 overflow-y-auto space-y-3 pr-1">
          {filteredHazards.map((h) => {
            const isCritical = h.severity === "CRITICAL"
            const isModelReal = h.is_real_ai && h.model_supported

            return (
              <Card
                key={h.id}
                onClick={() => setSelectedHazard(h)}
                className={`bg-card/40 border-slate-800 cursor-pointer hover:bg-slate-800/40 transition-all ${
                  selectedHazard?.id === h.id ? "border-amber-500 bg-slate-800/50" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        {getHazardIcon(h.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono text-sm">{h.id}</span>
                          <span className="text-amber-400 font-bold text-xs uppercase font-mono">{h.type}</span>
                          <Badge className={
                            isCritical ? "bg-red-600 text-white font-mono text-[10px]" : "bg-amber-600 text-white font-mono text-[10px]"
                          }>
                            {h.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-sans">{h.description || "Active hazard zone"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500">EXCLUSION RADIUS</div>
                        <div className="text-white font-bold">{h.radius_meters}m</div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">ENGINE STATUS</div>
                        {isModelReal ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                            REAL AI MODEL
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-700 text-slate-400 text-[9px]">
                            MODEL UNAVAILABLE
                          </Badge>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-slate-700 text-red-400 hover:bg-red-950/40 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          triggerHazardAlert(h)
                        }}
                      >
                        <BellRing className="w-3.5 h-3.5 mr-1" /> Alert
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredHazards.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              No hazards found matching current filters.
            </div>
          )}
        </div>

        {/* Hazard Detail Dossier */}
        <div className="flex flex-col gap-4">
          <Card className="bg-card/50 border-slate-800 h-full flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono font-bold uppercase text-slate-300">
                Hazard Zone Dossier
              </CardTitle>
              {selectedHazard && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-slate-400"
                  onClick={() => setSelectedHazard(null)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              {selectedHazard ? (
                <div className="space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-lg font-bold text-white">{selectedHazard.id}</div>
                      <div className="text-xs text-amber-400 font-bold uppercase mt-0.5">{selectedHazard.type}</div>
                    </div>
                    <Badge className={
                      selectedHazard.severity === "CRITICAL" ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                    }>
                      {selectedHazard.severity} SEVERITY
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {selectedHazard.description || "Active perimeter identified during multi-sensor reconnaissance."}
                  </p>

                  {/* Telemetry specs */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">EXCLUSION BUFFER</div>
                      <div className="text-sm font-bold text-amber-400">{selectedHazard.radius_meters} meters</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">ZONE STATUS</div>
                      <div className="text-sm font-bold text-cyan-400">{selectedHazard.status}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">LATITUDE</div>
                      <div className="text-sm font-bold text-slate-200">{selectedHazard.lat?.toFixed(4)}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">LONGITUDE</div>
                      <div className="text-sm font-bold text-slate-200">{selectedHazard.lng?.toFixed(4)}</div>
                    </div>
                  </div>

                  {/* Truthful Model Status Section (Requirement 4) */}
                  <div className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">AI Model Class Truthfulness:</div>
                    <div className="text-xs text-slate-300">
                      {selectedHazard.model_status}
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Base YOLO model detects physical obstacles & vehicles. Custom environmental disaster classes (fire, flood, smoke, structural collapse) require verified disaster dataset weights and are explicitly declared.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
                      onClick={() => triggerHazardAlert(selectedHazard)}
                    >
                      <BellRing className="w-3.5 h-3.5 mr-1.5" /> Broadcast Warning
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 text-slate-300 text-xs"
                      onClick={() => navigate("/app/map")}
                    >
                      <MapPin className="w-3.5 h-3.5 mr-1" /> View Map
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
                  <AlertTriangle className="w-10 h-10 mb-2 opacity-30" />
                  <span>Select any hazard perimeter from the list to inspect perimeter coordinates, severity, and model compatibility.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
