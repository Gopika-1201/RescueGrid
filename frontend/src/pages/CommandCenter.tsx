import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Crosshair, 
  Route as RouteIcon, 
  ShieldAlert, 
  Radio, 
  CheckCircle,
  Eye,
  X
} from "lucide-react"
import LiveMap, { MapSurvivor, MapHazard } from "@/components/LiveMap"
import { Link } from "react-router-dom"

interface CriticalAlert {
  alert_id: string
  title: string
  survivor_id: string
  confidence: string
  risk_score: number
  status: string
  reason: string
  timestamp: string
}

export default function CommandCenter() {
  const [time, setTime] = useState("00:00:00")
  const [missionMode, setMissionMode] = useState<"REAL_AI" | "SIMULATION">("REAL_AI")
  
  // Real-time mission statistics
  const [survivorCount, setSurvivorCount] = useState<number>(5)
  const [criticalCount, setCriticalCount] = useState<number>(2)
  const [hazardCount, setHazardCount] = useState<number>(3)
  const [searchCoverage, setSearchCoverage] = useState<number>(64)
  
  // Active critical alerts
  const [activeAlerts, setActiveAlerts] = useState<CriticalAlert[]>([])
  
  // Real map survivors & hazards
  const [mapSurvivors, setMapSurvivors] = useState<MapSurvivor[]>([])
  const [mapHazards, setMapHazards] = useState<MapHazard[]>([])
  
  // Live AI Timeline Feed
  const [feedEvents, setFeedEvents] = useState<Array<{ id: string; time: string; text: string; type: "alert" | "detection" | "system" | "simulation" }>>([
    { id: "1", time: "10:47:19", text: "Safe Evacuation Route Alpha established", type: "system" },
    { id: "2", time: "10:48:02", text: "Hazard H-001 (Flood perimeter) marked active", type: "alert" },
    { id: "3", time: "10:49:15", text: "YOLOv8 Engine online - Real inference ready", type: "system" }
  ])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toTimeString().substring(0, 8))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Initial load from backend API
  const loadMissionData = async () => {
    try {
      const summaryRes = await fetch("http://localhost:8000/api/ai/ALPHA-7/summary")
      if (summaryRes.ok) {
        const summary = await summaryRes.json()
        setSurvivorCount(summary.survivors_detected || 0)
        setCriticalCount(summary.critical_survivors || 0)
        setSearchCoverage(Math.round(summary.area_covered || 64))
      }

      const survRes = await fetch("http://localhost:8000/api/ai/ALPHA-7/survivors")
      if (survRes.ok) {
        const survList = await survRes.json()
        if (survList && survList.length > 0) {
          const mapped: MapSurvivor[] = survList.map((s: any) => ({
            id: s.id,
            lat: s.location?.lat || (34.0522 + (s.tracking_id || 1) * 0.001),
            lng: s.location?.lng || (-118.2437 + (s.tracking_id || 1) * 0.001),
            confidence: s.confidence,
            risk_score: s.risk_score,
            priority: s.priority,
            status: s.status,
            is_real_ai: s.is_real_ai
          }))
          setMapSurvivors(mapped)
          setSurvivorCount(mapped.length)
          setCriticalCount(mapped.filter(m => m.priority === "CRITICAL").length)
        }
      }
    } catch (e) {
      console.warn("Could not load backend mission data:", e)
    }
  }

  useEffect(() => {
    loadMissionData()
  }, [])

  // Connect to WebSocket for real-time AI updates
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/live")

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const nowTime = new Date().toTimeString().substring(0, 8)

        if (data.type === "ai_progress") {
          setMissionMode("REAL_AI")
          if (data.survivors_count !== undefined) {
            setSurvivorCount(data.survivors_count)
          }
          if (data.hazards_count !== undefined) {
            setHazardCount(data.hazards_count)
          }

          if (data.survivors && data.survivors.length > 0) {
            const mapped: MapSurvivor[] = data.survivors.map((s: any, idx: number) => ({
              id: s.survivor_id,
              lat: s.location?.lat || (34.0522 + (idx + 1) * 0.001),
              lng: s.location?.lng || (-118.2437 + (idx + 1) * 0.001),
              confidence: s.confidence,
              risk_score: s.risk_score,
              priority: s.priority,
              status: s.status,
              is_real_ai: true
            }))
            setMapSurvivors(mapped)
            setCriticalCount(mapped.filter(m => m.priority === "CRITICAL").length)
          }
        } else if (data.type === "alert" && data.level === "CRITICAL") {
          // Push critical alert
          const newAlert: CriticalAlert = {
            alert_id: data.alert_id || `ALT-${Date.now()}`,
            title: data.title || `🚨 CRITICAL SURVIVOR DETECTED: ${data.survivor_id}`,
            survivor_id: data.survivor_id,
            confidence: data.confidence || "94%",
            risk_score: data.risk_score || 88,
            status: data.status || "PRIORITY",
            reason: data.reason || "Elevated environmental risk",
            timestamp: nowTime
          }
          
          setActiveAlerts(prev => [newAlert, ...prev.slice(0, 4)])
          
          setFeedEvents(prev => [
            {
              id: String(Date.now()),
              time: nowTime,
              text: `🚨 REAL AI ALERT: ${data.survivor_id} identified with CRITICAL RISK (${data.risk_score})`,
              type: "alert"
            },
            ...prev.slice(0, 19)
          ])
        } else if (data.type === "detection") {
          setFeedEvents(prev => [
            {
              id: String(Date.now()),
              time: nowTime,
              text: `REAL AI: ${data.detection.class_name.toUpperCase()} located [Conf: ${(data.detection.confidence * 100).toFixed(0)}%]`,
              type: "detection"
            },
            ...prev.slice(0, 19)
          ])
        } else if (data.type === "TELEMETRY_UPDATE") {
          // Ambient simulation message
        }
      } catch (err) {
        // Heartbeats or raw data
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  return (
    <div className="h-full flex flex-col gap-6">
      
      {/* Top Banner & Mode Toggle Indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">MISSION ALPHA-7</h2>
              <Badge 
                className={
                  missionMode === "REAL_AI"
                    ? "bg-emerald-600 text-white font-mono font-bold tracking-wider px-2 py-0.5 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                    : "bg-amber-600 text-white font-mono font-bold tracking-wider px-2 py-0.5"
                }
              >
                {missionMode === "REAL_AI" ? "REAL AI INFERENCE" : "SIMULATION MODE"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Sector 4 Flood Reconnaissance • Active Drone Telemetry Feed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setMissionMode("REAL_AI")}
              className={`px-3 py-1 rounded transition-colors ${
                missionMode === "REAL_AI" ? "bg-emerald-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              REAL AI
            </button>
            <button
              onClick={() => setMissionMode("SIMULATION")}
              className={`px-3 py-1 rounded transition-colors ${
                missionMode === "SIMULATION" ? "bg-amber-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              SIMULATION
            </button>
          </div>

          <Link to="/app/analysis">
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">
              <Eye className="w-4 h-4 mr-1.5" /> Open Vision Feed
            </Button>
          </Link>
        </div>
      </div>

      {/* Critical Alert Beacon Banner (if triggered) */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-950/80 border-2 border-red-500 rounded-xl p-4 shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-red-600 text-white animate-bounce mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-base">
                  {activeAlerts[0].title}
                </span>
                <Badge className="bg-red-600 text-white text-[10px] font-mono">
                  RISK SCORE: {activeAlerts[0].risk_score}/100
                </Badge>
              </div>
              <p className="text-xs text-red-200 mt-1">
                Confidence: <span className="font-bold">{activeAlerts[0].confidence}</span> • Status: <span className="font-bold">{activeAlerts[0].status}</span> • Reason: {activeAlerts[0].reason}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-300 hover:text-white hover:bg-red-900/50"
            onClick={() => setActiveAlerts(prev => prev.slice(1))}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Top Telemetry Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase">Mission Status</CardTitle>
            <Activity className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              ACTIVE
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">ELAPSED: {time}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase">Survivors Detected</CardTitle>
            <Users className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">{survivorCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-red-400 font-bold font-mono">{criticalCount}</span> CRITICAL PRIORITY
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase">Hazards Identified</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">{hazardCount}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="text-amber-400 font-bold font-mono">2</span> ACTIVE PERIMETERS
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 uppercase">Search Coverage</CardTitle>
            <Crosshair className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">{searchCoverage}%</div>
            <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${searchCoverage}%` }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area: Map + AI Priority Feed */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Main Leaflet Map Area */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-slate-800 flex flex-col bg-card/20 relative">
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-slate-900/80 border-slate-700 backdrop-blur-md text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Survivors ({mapSurvivors.length})
            </Badge>
            <Badge variant="outline" className="bg-slate-900/80 border-slate-700 backdrop-blur-md text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span> Hazards
            </Badge>
            <Badge variant="outline" className="bg-slate-900/80 border-slate-700 backdrop-blur-md text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2"></span> Rescue Teams
            </Badge>
          </div>
          
          <LiveMap survivors={mapSurvivors} />
        </div>

        {/* Right Sidebar - Critical Targets & Live AI Feed */}
        <div className="flex flex-col gap-6">
          
          {/* Critical Targets Panel */}
          <Card className="flex-1 bg-card/40 border-slate-800 backdrop-blur-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono font-bold uppercase text-slate-300">
                Critical Priority Targets
              </CardTitle>
              <Badge variant="outline" className="border-red-600 text-red-400 text-[10px]">
                ACTION REQ
              </Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[250px]">
              <div className="divide-y divide-slate-800 font-mono text-xs">
                {mapSurvivors.slice(0, 4).map((s) => (
                  <div key={s.id} className="p-3 hover:bg-slate-800/30 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-bold text-cyan-400">ID: {s.id}</div>
                      <Badge className={s.priority === "CRITICAL" ? "bg-red-600 text-white text-[10px]" : "bg-amber-600 text-white text-[10px]"}>
                        SCORE: {s.risk_score || 75}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-1.5 font-sans">
                      {s.priority === "CRITICAL" 
                        ? "Proximity to flood perimeter. High exposure." 
                        : "Stationary target. Access corridor safe."}
                    </p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">
                        <RouteIcon className="w-2.5 h-2.5 mr-1 text-cyan-400" /> Route Alpha
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">
                        Status: {s.status || "VERIFIED"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live AI Timeline Feed */}
          <Card className="h-1/2 bg-card/40 border-slate-800 backdrop-blur-sm flex flex-col">
            <CardHeader className="pb-2 pt-3 px-4 border-b border-slate-800">
              <CardTitle className="text-xs font-mono font-bold flex items-center gap-2 uppercase text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Live Intelligence Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-y-auto max-h-[220px]">
              <div className="space-y-2.5 font-mono text-[11px]">
                {feedEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2">
                    <span className="text-slate-500 text-[10px] whitespace-nowrap mt-0.5">{evt.time}</span>
                    <span className={
                      evt.type === "alert" 
                        ? "text-red-400 font-bold" 
                        : evt.type === "detection" 
                        ? "text-emerald-400" 
                        : "text-slate-300"
                    }>
                      {evt.text}
                    </span>
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
