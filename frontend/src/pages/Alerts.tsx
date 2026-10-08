import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ShieldAlert, 
  AlertTriangle, 
  BellRing, 
  CheckCircle2, 
  Route as RouteIcon, 
  MapPin, 
  Clock, 
  Radio, 
  Filter,
  X
} from "lucide-react"

export interface SmartAlert {
  id: string
  level: "CRITICAL" | "WARNING" | "INFO"
  title: string
  survivor_id?: string | null
  risk_score?: number
  status?: string
  reason: string
  location?: { lat: number; lng: number } | null
  timestamp?: string
  is_real_ai?: boolean
  acknowledged?: boolean
}

export default function Alerts({ missionId = "ALPHA-7" }: { missionId?: string }) {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<SmartAlert[]>([])
  const [filterLevel, setFilterLevel] = useState<string>("ALL")

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/ai/${missionId}/alerts`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch (e) {
      console.warn("Failed fetching alerts:", e)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [missionId])

  // WebSocket live alert feed
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/live")
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "alert") {
          setAlerts(prev => [
            {
              id: data.alert_id || `ALT-${Date.now()}`,
              level: data.level || "CRITICAL",
              title: data.title,
              survivor_id: data.survivor_id,
              risk_score: data.risk_score,
              status: data.status,
              reason: data.reason,
              location: data.location,
              timestamp: data.timestamp || new Date().toISOString(),
              is_real_ai: true
            },
            ...prev
          ])
        }
      } catch (err) {}
    }
    return () => ws.close()
  }, [])

  const filteredAlerts = alerts.filter(a => {
    if (filterLevel === "ALL") return true
    return a.level === filterLevel
  })

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const acknowledgeAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-800 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">SMART EMERGENCY ALERTS</h2>
              <Badge className="bg-red-600 text-white font-mono text-[10px] font-bold">
                REAL-TIME MONITOR
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous hazard detection triggers • Critical survivor priority alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200"
            onClick={fetchAlerts}
          >
            Refresh Alerts
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

      {/* Filter and stats */}
      <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Filter Level:</span>
          {["ALL", "CRITICAL", "WARNING"].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                filterLevel === lvl ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <span className="text-slate-400">
          Active Alerts: <span className="text-white font-bold">{filteredAlerts.length}</span>
        </span>
      </div>

      {/* Alert Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredAlerts.map(alert => {
          const isCritical = alert.level === "CRITICAL"

          return (
            <Card
              key={alert.id}
              className={`border transition-all ${
                alert.acknowledged
                  ? "bg-card/20 border-slate-800 opacity-70"
                  : isCritical
                  ? "bg-red-950/30 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : "bg-amber-950/20 border-amber-500/60"
              }`}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg ${
                    isCritical ? "bg-red-600 text-white animate-pulse" : "bg-amber-600 text-white"
                  }`}>
                    {isCritical ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-sm">{alert.title}</span>
                      <Badge className={isCritical ? "bg-red-600 text-white text-[10px]" : "bg-amber-600 text-white text-[10px]"}>
                        {alert.level}
                      </Badge>
                      {alert.acknowledged && (
                        <Badge variant="outline" className="border-emerald-600 text-emerald-400 text-[10px]">
                          ACKNOWLEDGED
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-sans">{alert.reason}</p>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Alert ID: {alert.id} • {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : "Just now"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {alert.survivor_id && (
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                      onClick={() => navigate("/app/routes", { state: { targetSurvivorId: alert.survivor_id } })}
                    >
                      <RouteIcon className="w-3.5 h-3.5 mr-1" /> Route Team
                    </Button>
                  )}
                  {!alert.acknowledged && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-700 text-emerald-400 hover:bg-slate-800 text-xs"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ack
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredAlerts.length === 0 && (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            No active alerts matching the selected filter.
          </div>
        )}
      </div>
    </div>
  )
}
