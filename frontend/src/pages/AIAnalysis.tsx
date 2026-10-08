import { useState, useRef, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Play, 
  Pause, 
  AlertTriangle, 
  Users, 
  Upload, 
  ShieldCheck, 
  Cpu, 
  Crosshair, 
  Activity, 
  RefreshCw,
  Eye,
  Layers
} from "lucide-react"

interface BBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface DetectionItem {
  detection_id: string
  class_name: string
  mapped_type: string
  confidence: number
  bbox: BBox
  frame: number
  timestamp: number
  tracking_id?: number
  survivor_id?: string
}

interface SurvivorItem {
  survivor_id: string
  tracking_id: number
  risk_score: number
  priority: string
  status: string
  reasons: string[]
  confidence: number
  detection_count: number
  first_detected?: string
  last_detected?: string
  location?: { lat: number; lng: number }
  has_gps?: boolean
}

export default function AIAnalysis({ missionId = "ALPHA-7" }: { missionId?: string }) {
  const location = useLocation()
  const [fileUrl, setFileUrl] = useState<string>(location.state?.fileUrl || "")
  const [isImage, setIsImage] = useState<boolean>(false)
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [frame, setFrame] = useState<number>(0)
  const [totalFrames, setTotalFrames] = useState<number>(0)
  const [fps, setFps] = useState<number>(0)
  
  // Real inference results
  const [detections, setDetections] = useState<DetectionItem[]>([])
  const [survivors, setSurvivors] = useState<SurvivorItem[]>([])
  const [hazardsCount, setHazardsCount] = useState<number>(0)
  const [trackedCount, setTrackedCount] = useState<number>(0)
  
  // Configurable thresholds
  const [confThreshold, setConfThreshold] = useState<number>(0.40)
  const [iouThreshold, setIouThreshold] = useState<number>(0.45)
  
  // Model Health state
  const [modelHealth, setModelHealth] = useState<any>(null)
  
  // Video playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Display dimensions for responsive bbox projection
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 })
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 450 })

  // Fetch AI Health
  const checkHealth = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/ai/health")
      if (res.ok) {
        const data = await res.json()
        setModelHealth(data)
      }
    } catch (e) {
      console.warn("AI health check failed:", e)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  // Listen to WebSocket for live real YOLO updates
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/live")
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "ai_progress" && (data.mission_id === missionId || !data.mission_id)) {
          setProgress(data.progress ?? 0)
          setFrame(data.frame ?? 0)
          setTotalFrames(data.total_frames ?? 0)
          setFps(data.fps ?? 0)
          setDetections(data.detections || [])
          setSurvivors(data.survivors || [])
          setHazardsCount(data.hazards_count ?? 0)
          setTrackedCount(data.tracked_count ?? 0)
          setIsProcessing(data.progress < 100)
        } else if (data.type === "ai_complete") {
          setIsProcessing(false)
          setProgress(100)
        }
      } catch (err) {
        // Non-json or heartbeats
      }
    }

    return () => {
      ws.close()
    }
  }, [missionId])

  // Track container resize to keep bounding boxes pixel-perfect
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }
    updateSize()
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [])

  // Update media resolution on load
  const onVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setNaturalDimensions({
        width: videoRef.current.videoWidth || 1920,
        height: videoRef.current.videoHeight || 1080
      })
    }
  }

  const onImageLoaded = () => {
    if (imageRef.current) {
      setNaturalDimensions({
        width: imageRef.current.naturalWidth || 1920,
        height: imageRef.current.naturalHeight || 1080
      })
    }
  }

  // Upload and analyze file
  const handleFileUpload = async (uploadedFile: File) => {
    if (!uploadedFile) return
    const isImg = uploadedFile.type.startsWith("image/")
    setIsImage(isImg)
    
    const localUrl = URL.createObjectURL(uploadedFile)
    setFileUrl(localUrl)
    setIsProcessing(true)
    setProgress(0)
    setFrame(0)
    setDetections([])
    setSurvivors([])

    const formData = new FormData()
    formData.append("file", uploadedFile)
    formData.append("conf_threshold", confThreshold.toString())
    formData.append("iou_threshold", iouThreshold.toString())

    try {
      const res = await fetch(`http://localhost:8000/api/ai/${missionId}/analyze`, {
        method: "POST",
        body: formData
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Inference failed: ${err.detail || "Server error"}`)
        setIsProcessing(false)
      }
    } catch (e) {
      console.error("Upload error:", e)
      setIsProcessing(false)
    }
  }

  // Load sample test media for instant verification
  const loadSampleMedia = async (type: "image" | "video") => {
    try {
      const filename = type === "image" ? "test_image.jpg" : "test_survivors.mp4"
      const res = await fetch(`/${filename}`)
      const blob = await res.blob()
      const sampleFile = new File([blob], filename, { type: type === "image" ? "image/jpeg" : "video/mp4" })
      handleFileUpload(sampleFile)
    } catch (e) {
      console.error("Failed to load sample media:", e)
    }
  }

  // Calculate box bounding positions adjusted for letterboxing/contain
  const renderBoundingBoxes = useMemo(() => {
    const { width: nw, height: nh } = naturalDimensions
    const { width: cw, height: ch } = containerDimensions

    if (nw === 0 || nh === 0 || cw === 0 || ch === 0) return null

    // Determine scale and offset for object-contain
    const naturalAspect = nw / nh
    const containerAspect = cw / ch

    let renderW = cw
    let renderH = ch
    let offsetX = 0
    let offsetY = 0

    if (containerAspect > naturalAspect) {
      renderW = ch * naturalAspect
      offsetX = (cw - renderW) / 2
    } else {
      renderH = cw / naturalAspect
      offsetY = (ch - renderH) / 2
    }

    const scaleX = renderW / nw
    const scaleY = renderH / nh

    return detections.map((det) => {
      const left = offsetX + det.bbox.x1 * scaleX
      const top = offsetY + det.bbox.y1 * scaleY
      const width = (det.bbox.x2 - det.bbox.x1) * scaleX
      const height = (det.bbox.y2 - det.bbox.y1) * scaleY

      const isPerson = det.class_name === "person"
      const isVehicle = det.mapped_type === "vehicle"
      const isHazard = det.mapped_type === "hazard"

      const borderColor = isHazard 
        ? "border-amber-500 bg-amber-500/15" 
        : isVehicle 
        ? "border-cyan-400 bg-cyan-400/15" 
        : "border-emerald-500 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.3)]"

      const badgeColor = isHazard
        ? "bg-amber-600"
        : isVehicle
        ? "bg-cyan-600"
        : "bg-emerald-600"

      const displayLabel = det.survivor_id 
        ? `${det.survivor_id} (${(det.confidence * 100).toFixed(0)}%)`
        : `${det.class_name.toUpperCase()} ${(det.confidence * 100).toFixed(0)}%`

      return (
        <div
          key={det.detection_id}
          className={`absolute border-2 rounded-sm transition-all duration-75 pointer-events-none ${borderColor}`}
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${Math.max(12, width)}px`,
            height: `${Math.max(12, height)}px`
          }}
        >
          <div className={`${badgeColor} text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-t absolute -top-5 left-0 whitespace-nowrap shadow-md`}>
            {displayLabel}
          </div>
        </div>
      )
    })
  }, [detections, naturalDimensions, containerDimensions])

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-cyan-400" />
              AI INFERENCE & VISION ENGINE
            </h2>
            <Badge className="bg-emerald-600 text-white font-mono font-bold tracking-wider px-2 py-0.5 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]">
              REAL AI
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            End-to-end Ultralytics YOLOv8 real-time object detection, ByteTrack survivor tracking, and multi-factor risk inference.
          </p>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-400">Device:</span>
            <span className="text-cyan-400 font-mono font-bold uppercase">
              {modelHealth?.device || "CPU"}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Model:</span>
            <span className="text-emerald-400 font-mono font-bold">
              {modelHealth?.model || "YOLOv8n"}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2 text-cyan-400" />
            Upload Media
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.avi,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
            }}
          />
        </div>
      </div>

      {/* Main Grid: Video Player + Analytics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Visual Stream & Canvas Overlay */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          <Card className="bg-card/50 border-slate-800 overflow-hidden flex flex-col flex-1 relative min-h-[460px]">
            <div 
              ref={containerRef}
              className="relative w-full flex-1 bg-black flex items-center justify-center overflow-hidden"
            >
              {fileUrl ? (
                isImage ? (
                  <img
                    ref={imageRef}
                    src={fileUrl}
                    alt="AI Source"
                    className="w-full h-full object-contain pointer-events-none"
                    onLoad={onImageLoaded}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={fileUrl}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    loop
                    playsInline
                    onLoadedMetadata={onVideoLoadedMetadata}
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                    <Crosshair className="w-8 h-8 text-cyan-500 animate-spin" />
                  </div>
                  <h4 className="text-lg font-semibold text-slate-300">No Media Loaded</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    Upload an MP4, MOV, or JPG from drone reconnaissance to start real YOLO inference and tracking.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload Video or Image
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => loadSampleMedia("video")}
                      className="border-slate-700 hover:bg-slate-800 text-cyan-400"
                    >
                      <Play className="w-4 h-4 mr-2 text-cyan-400" /> Test Sample Video
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => loadSampleMedia("image")}
                      className="border-slate-700 hover:bg-slate-800 text-emerald-400"
                    >
                      <Eye className="w-4 h-4 mr-2 text-emerald-400" /> Test Sample Image
                    </Button>
                  </div>
                </div>
              )}

              {/* Dynamic Overlay Bounding Boxes */}
              {fileUrl && renderBoundingBoxes}

              {/* Watermark badge */}
              {fileUrl && (
                <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                  <Badge className="bg-black/70 border border-slate-700 text-emerald-400 backdrop-blur-md font-mono text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    YOLOv8 LIVE INFERENCE
                  </Badge>
                  {isProcessing && (
                    <Badge className="bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-[10px]">
                      PROCESSING {fps > 0 ? `${fps} FPS` : ""}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Video Controls Bar */}
            {fileUrl && !isImage && (
              <div className="h-12 bg-slate-950/90 border-t border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) videoRef.current.pause()
                        else videoRef.current.play()
                        setIsPlaying(!isPlaying)
                      }
                    }}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="font-mono text-slate-300">
                    Source: {naturalDimensions.width}x{naturalDimensions.height}
                  </span>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span>FRAME: {frame} / {totalFrames || "LIVE"}</span>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    ByteTrack Active
                  </Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Processing Status & Metrics Panel */}
          <Card className="bg-card/40 border-slate-800 p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                  AI ANALYSIS PIPELINE STATUS
                </span>
              </div>
              <span className="font-mono font-bold text-sm text-cyan-400">
                {progress.toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-900 border border-slate-800 h-2.5 rounded-full overflow-hidden mb-4">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-medium">People Detected</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  {survivors.length}
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Hazards Detected</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {hazardsCount}
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Tracked Objects</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                  {trackedCount || survivors.length}
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400 uppercase font-medium">Inference Speed</div>
                <div className="text-xl font-bold font-mono text-slate-200 mt-0.5">
                  {fps > 0 ? `${fps} FPS` : "READY"}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Detection Feed & Survivor Intelligence */}
        <div className="flex flex-col gap-4 min-h-0">
          
          {/* Live Object Detection Feed */}
          <Card className="flex-1 bg-card/40 border-slate-800 flex flex-col min-h-[220px]">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono font-bold flex items-center gap-2 uppercase text-slate-300">
                <Eye className="w-4 h-4 text-cyan-400" />
                Raw Detections ({detections.length})
              </CardTitle>
              <Badge variant="outline" className="text-[9px] border-slate-700 font-mono text-slate-400">
                CONF &gt; {(confThreshold * 100).toFixed(0)}%
              </Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[240px]">
              <div className="divide-y divide-slate-800/60 font-mono text-xs">
                {detections.map((det) => (
                  <div key={det.detection_id} className="p-2.5 hover:bg-slate-800/30 flex justify-between items-center transition-colors">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold">{det.survivor_id || det.detection_id}</span>
                        <span className="text-[10px] text-slate-500">[{det.mapped_type}]</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {det.class_name.toUpperCase()} • Frame {det.frame} ({det.timestamp.toFixed(1)}s)
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-slate-800 border border-slate-700 text-emerald-400 font-bold">
                        {(det.confidence * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                {detections.length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No detections in current frame.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Survivor Intelligence Layer & Risk Engine */}
          <Card className="flex-1 bg-card/40 border-slate-800 flex flex-col min-h-[300px]">
            <CardHeader className="py-3 px-4 border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-mono font-bold flex items-center gap-2 uppercase text-slate-300">
                <Users className="w-4 h-4 text-emerald-400" />
                Survivor Intelligence ({survivors.length})
              </CardTitle>
              <span className="text-[10px] font-mono text-slate-400">
                ByteTrack Persistence
              </span>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[320px]">
              <div className="divide-y divide-slate-800">
                {survivors.map((surv) => {
                  const isCritical = surv.priority === "CRITICAL"
                  const isHigh = surv.priority === "HIGH"

                  return (
                    <div key={surv.survivor_id} className="p-3 hover:bg-slate-800/30 transition-colors">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-sm text-white">
                            {surv.survivor_id}
                          </span>
                          <Badge 
                            variant="outline"
                            className={`text-[9px] font-bold ${
                              surv.status === "VERIFIED"
                                ? "border-emerald-600 text-emerald-400 bg-emerald-950/30"
                                : surv.status === "PRIORITY"
                                ? "border-red-600 text-red-400 bg-red-950/30"
                                : "border-slate-700 text-slate-400"
                            }`}
                          >
                            {surv.status}
                          </Badge>
                        </div>

                        <Badge 
                          className={`font-mono text-xs font-bold ${
                            isCritical 
                              ? "bg-red-600 text-white animate-pulse" 
                              : isHigh 
                              ? "bg-amber-600 text-white" 
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          RISK {surv.risk_score}
                        </Badge>
                      </div>

                      {/* Contributing Factors */}
                      <div className="mt-2 pl-2 border-l border-slate-700/60">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                          Risk Factors
                        </p>
                        <ul className="text-[11px] text-slate-400 space-y-0.5">
                          {surv.reasons && surv.reasons.map((r, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Footer telemetry */}
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 pt-1 border-t border-slate-800/50">
                        <span>Confidence: {(surv.confidence * 100).toFixed(0)}%</span>
                        <span>Tracked Frames: {surv.detection_count}</span>
                      </div>
                    </div>
                  )
                })}

                {survivors.length === 0 && (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No survivors identified yet. Upload media above to initiate intelligence extraction.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
