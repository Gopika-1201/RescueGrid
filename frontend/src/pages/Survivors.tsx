import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Search, 
  Filter, 
  ArrowUpDown, 
  MapPin, 
  Route as RouteIcon, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Radio, 
  Eye, 
  X, 
  AlertTriangle,
  Activity,
  Layers
} from "lucide-react"

export interface SurvivorDetail {
  id: string
  tracking_id?: number
  confidence: number
  risk_score: number
  priority: string
  status: string
  detection_count: number
  first_frame?: number
  last_frame?: number
  location?: { lat: number; lng: number } | null
  has_gps?: boolean
  reasons: string[]
  is_real_ai?: boolean
  assigned_team?: string | null
}

export default function Survivors({ missionId = "ALPHA-7" }: { missionId?: string }) {
  const navigate = useNavigate()
  const [survivors, setSurvivors] = useState<SurvivorDetail[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<"risk_desc" | "risk_asc" | "time_desc">("risk_desc")
  const [selectedSurvivor, setSelectedSurvivor] = useState<SurvivorDetail | null>(null)

  const fetchSurvivors = async () => {
    try {
      setLoading(true)
      const res = await fetch(`http://localhost:8000/api/ai/${missionId}/survivors`)
      if (res.ok) {
        const data = await res.json()
        setSurvivors(data)
      }
    } catch (e) {
      console.warn("Failed fetching survivors:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSurvivors()
  }, [missionId])

  // WebSocket for real-time additions
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/live")
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "ai_progress" && data.survivors) {
          setSurvivors(data.survivors.map((s: any) => ({
            id: s.survivor_id,
            tracking_id: s.tracking_id,
            confidence: s.confidence,
            risk_score: s.risk_score,
            priority: s.priority,
            status: s.status,
            detection_count: s.detection_count,
            location: s.location,
            has_gps: s.has_gps,
            reasons: s.reasons || [],
            is_real_ai: true
          })))
        }
      } catch (err) {}
    }
    return () => ws.close()
  }, [])

  // Filtering and Sorting
  const filteredSurvivors = useMemo(() => {
    return survivors
      .filter((s) => {
        const matchesSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === "ALL" || s.status === statusFilter
        const matchesPriority = priorityFilter === "ALL" || s.priority === priorityFilter
        return matchesSearch && matchesStatus && matchesPriority
      })
      .sort((a, b) => {
        if (sortBy === "risk_desc") return b.risk_score - a.risk_score
        if (sortBy === "risk_asc") return a.risk_score - b.risk_score
        return b.detection_count - a.detection_count
      })
  }, [survivors, searchQuery, statusFilter, priorityFilter, sortBy])

  // Quick stats
  const criticalCount = survivors.filter(s => s.priority === "CRITICAL").length
  const verifiedCount = survivors.filter(s => s.status === "VERIFIED").length

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">SURVIVOR INTELLIGENCE REGISTRY</h2>
              <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold">
                BYTE-TRACK REAL AI
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Active mission survivor tracking • Multi-factor risk engine scores (0–100)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200"
            onClick={fetchSurvivors}
          >
            Refresh Registry
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-slate-800 p-3.5">
          <div className="text-xs text-slate-400 uppercase font-mono">Total Survivors</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">{survivors.length}</div>
          <p className="text-[10px] text-slate-500 mt-1">Unique ByteTrack Entities</p>
        </Card>
        <Card className="bg-card/40 border-slate-800 p-3.5">
          <div className="text-xs text-slate-400 uppercase font-mono">Critical Priority</div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-1">{criticalCount}</div>
          <p className="text-[10px] text-red-500/80 mt-1">Immediate Extraction Req</p>
        </Card>
        <Card className="bg-card/40 border-slate-800 p-3.5">
          <div className="text-xs text-slate-400 uppercase font-mono">Verified Presence</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{verifiedCount}</div>
          <p className="text-[10px] text-slate-500 mt-1">Confirmed across &ge; 3 frames</p>
        </Card>
        <Card className="bg-card/40 border-slate-800 p-3.5">
          <div className="text-xs text-slate-400 uppercase font-mono">Sensors / Detection</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">YOLOv8</div>
          <p className="text-[10px] text-slate-500 mt-1">Active Visual Pipeline</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by ID (e.g. P-001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 w-full text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="DETECTED">DETECTED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PRIORITY">PRIORITY</option>
            <option value="MONITORING">MONITORING</option>
            <option value="RESCUED">RESCUED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL PRIORITIES</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MODERATE">MODERATE</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="risk_desc">Highest Risk Score</option>
            <option value="risk_asc">Lowest Risk Score</option>
            <option value="time_desc">Most Detections</option>
          </select>
        </div>
      </div>

      {/* Survivors Table Grid & Detail Modal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        
        {/* Table List (2 Cols) */}
        <div className="lg:col-span-2 overflow-y-auto rounded-xl border border-slate-800 bg-card/40">
          <div className="divide-y divide-slate-800/80 font-mono text-xs">
            {filteredSurvivors.map((s) => {
              const isCritical = s.priority === "CRITICAL"
              const isHigh = s.priority === "HIGH"

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSurvivor(s)}
                  className={`p-4 hover:bg-slate-800/40 cursor-pointer transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                    selectedSurvivor?.id === s.id ? "bg-slate-800/60 border-l-4 border-cyan-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white ${
                      isCritical ? "bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : isHigh ? "bg-amber-600" : "bg-emerald-600"
                    }`}>
                      S
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{s.id}</span>
                        <Badge variant="outline" className={`text-[9px] ${
                          s.status === "VERIFIED" ? "border-emerald-600 text-emerald-400" : "border-slate-700 text-slate-400"
                        }`}>
                          {s.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-sans">
                        {s.reasons && s.reasons.length > 0 ? s.reasons[0] : "Base perimeter exposure"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">RISK SCORE</div>
                      <Badge className={`font-mono text-xs ${
                        isCritical ? "bg-red-600 text-white" : isHigh ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                      }`}>
                        {s.risk_score} / 100
                      </Badge>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">CONFIDENCE</div>
                      <span className="text-xs text-emerald-400 font-bold">
                        {(s.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-cyan-400 hover:bg-slate-800"
                        title="Route to Survivor"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate("/app/routes", { state: { targetSurvivorId: s.id } })
                        }}
                      >
                        <RouteIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-800"
                        title="View on Map"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate("/app/map")
                        }}
                      >
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredSurvivors.length === 0 && !loading && (
              <div className="p-12 text-center text-slate-500">
                No survivors match the selected query and filters.
              </div>
            )}
          </div>
        </div>

        {/* Detail Inspector Drawer (1 Col) */}
        <div className="flex flex-col gap-4">
          <Card className="bg-card/50 border-slate-800 h-full flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono font-bold uppercase text-slate-300">
                Survivor Intelligence Dossier
              </CardTitle>
              {selectedSurvivor && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-slate-400"
                  onClick={() => setSelectedSurvivor(null)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              {selectedSurvivor ? (
                <div className="space-y-4 font-mono text-xs">
                  {/* Survivor Summary Header */}
                  <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-xl font-bold text-white">{selectedSurvivor.id}</div>
                      <div className="text-[10px] text-slate-400">ByteTrack ID: #{selectedSurvivor.tracking_id || "1"}</div>
                    </div>
                    <Badge className={
                      selectedSurvivor.priority === "CRITICAL" ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                    }>
                      {selectedSurvivor.priority} ({selectedSurvivor.risk_score}/100)
                    </Badge>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">DETECTION CONFIDENCE</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {(selectedSurvivor.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">CURRENT STATUS</div>
                      <div className="text-sm font-bold text-cyan-400">
                        {selectedSurvivor.status}
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">SIGHTING FRAMES</div>
                      <div className="text-sm font-bold text-slate-200">
                        {selectedSurvivor.detection_count}
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-500 text-[10px]">GPS AVAILABILITY</div>
                      <div className="text-sm font-bold text-slate-200">
                        {selectedSurvivor.has_gps ? "METADATA VALID" : "ESTIMATED GRID"}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Factor Contributing Factors */}
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                      Contributing Risk Factors (Transparent Score)
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-slate-300">
                      {selectedSurvivor.reasons && selectedSurvivor.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1"></span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Notice: No medical claims */}
                  <div className="p-2.5 bg-slate-900/40 rounded border border-slate-800/80 text-[10px] text-slate-500 italic">
                    Note: Risk scores evaluate physical exposure, spatial proximity, and persistence. Visual sensor data does not assert medical conditions or internal injuries.
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs"
                      onClick={() => navigate("/app/routes", { state: { targetSurvivorId: selectedSurvivor.id } })}
                    >
                      <RouteIcon className="w-3.5 h-3.5 mr-1.5" /> Plan Safe Route
                    </Button>
                    <Button
                      variant="outline"
                      className="border-slate-700 text-slate-300 text-xs"
                      onClick={() => navigate("/app/map")}
                    >
                      <MapPin className="w-3.5 h-3.5 mr-1" /> Map
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs">
                  <Users className="w-10 h-10 mb-2 opacity-30" />
                  <span>Select any survivor record from the registry to view detailed multi-factor telemetry.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
