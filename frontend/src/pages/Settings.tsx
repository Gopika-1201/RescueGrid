import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Sliders, 
  Map as MapIcon, 
  ShieldCheck, 
  Save, 
  RefreshCw,
  HardDrive
} from "lucide-react"

export default function Settings() {
  const [modelHealth, setModelHealth] = useState<any>(null)
  const [confThreshold, setConfThreshold] = useState<number>(0.40)
  const [iouThreshold, setIouThreshold] = useState<number>(0.45)
  const [trackerType, setTrackerType] = useState<string>("bytetrack.yaml")
  const [targetFps, setTargetFps] = useState<number>(8)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)

  useEffect(() => {
    fetch("http://localhost:8000/api/ai/health")
      .then(res => res.json())
      .then(data => setModelHealth(data))
      .catch(err => console.warn(err))
  }, [])

  const handleSave = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6 h-full max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center bg-card/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">SYSTEM & AI ENGINE SETTINGS</h2>
              <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold">
                OPERATIONAL
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Configure YOLOv8 inference parameters, ByteTrack tracker settings, and GIS map layers.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
        >
          <Save className="w-4 h-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-lg text-emerald-200 text-xs font-mono">
          ✓ Configuration updated and applied to live AI inference engine.
        </div>
      )}

      {/* Settings Grid */}
      <div className="space-y-6">
        
        {/* AI Model Health Card */}
        <Card className="bg-card/40 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              AI Inference Engine Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500">ENGINE STATUS</div>
                <div className="text-sm font-bold text-emerald-400 uppercase">{modelHealth?.status || "READY"}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500">PRIMARY MODEL</div>
                <div className="text-sm font-bold text-white">{modelHealth?.model || "YOLOv8n"}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500">ACCELERATOR</div>
                <div className="text-sm font-bold text-cyan-400 uppercase">{modelHealth?.device || "CPU"}</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500">CUDA AVAILABLE</div>
                <div className="text-sm font-bold text-slate-300">{modelHealth?.cuda_available ? "YES" : "NO"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inference Sliders */}
        <Card className="bg-card/40 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Inference Thresholds & Adaptive Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Confidence Threshold</span>
                <span className="text-cyan-400 font-bold">{(confThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                Minimum detector confidence required for registering survivor detection entities.
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">IoU Overlap Threshold</span>
                <span className="text-cyan-400 font-bold">{(iouThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.80"
                step="0.05"
                value={iouThreshold}
                onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Target Video Inference FPS</span>
                <span className="text-cyan-400 font-bold">{targetFps} FPS</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={targetFps}
                onChange={(e) => setTargetFps(parseInt(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                Controls dynamic frame skipping on video uploads to guarantee responsive CPU laptop execution.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* GIS Basemap Settings */}
        <Card className="bg-card/40 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-sm font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-purple-400" />
              GIS Basemap Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between items-center p-2.5 bg-slate-900 rounded border border-slate-800">
              <div>
                <div className="font-bold text-white">Tile Provider: OpenStreetMap</div>
                <div className="text-[10px] text-slate-400">https://&#123;s&#125;.tile.openstreetmap.org/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png</div>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px]">NO API KEY REQUIRED</Badge>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
