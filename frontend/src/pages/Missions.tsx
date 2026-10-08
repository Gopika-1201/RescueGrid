import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { ShieldAlert, Map, FileVideo, Cpu, Play } from "lucide-react"

export default function Missions() {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  
  const handleStartMission = async () => {
    if (!file) return;
    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const response = await fetch("http://localhost:8000/api/ai/ALPHA-7/analyze", {
        method: "POST",
        body: formData
      })
      const data = await response.json()
      // URL could be formed locally since the file is local to the backend, but for the demo, we can just use an object URL
      const objUrl = URL.createObjectURL(file)
      navigate(`/app/analysis`, { state: { fileUrl: objUrl } })
    } catch (e) {
      console.error(e)
    } finally {
      setIsUploading(false)
    }
  }
  
  return (
    <div className="h-full flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mission Control</h2>
          <p className="text-muted-foreground">Manage active operations and launch new deployments.</p>
        </div>
        <Button variant="default" className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <ShieldAlert className="mr-2 h-4 w-4" /> NEW MISSION DEPLOYMENT
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column - Active Missions */}
        <div className="xl:col-span-1 flex flex-col gap-4">
          <h3 className="font-semibold text-lg text-slate-300">Active Deployments</h3>
          
          <Card className="bg-card/40 border-cyan-800 backdrop-blur-sm cursor-pointer hover:bg-slate-800/50 transition-all border-l-4 border-l-cyan-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-white">ALPHA-7</CardTitle>
                <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded">ACTIVE</div>
              </div>
              <CardDescription>Flood Response - Sector 4</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Coverage: 64%</span>
                <span>Survivors: 27</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[64%]"></div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/40 border-slate-800 backdrop-blur-sm opacity-60">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-white">BRAVO-2</CardTitle>
                <div className="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs font-bold rounded">CONCLUDED</div>
              </div>
              <CardDescription>Industrial Fire - Sector 9</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Right Column - New Mission Wizard */}
        <div className="xl:col-span-2">
          <Card className="bg-card/40 border-slate-800 h-full flex flex-col">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-cyan-500" />
                Initialize New Mission
              </CardTitle>
              <CardDescription>Configure parameters for autonomous drone deployment</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 p-6 flex flex-col justify-center">
              
              {/* Stepper */}
              <div className="flex justify-between items-center mb-12 relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-800 -z-10 -translate-y-1/2 rounded-full"></div>
                
                {[
                  { num: 1, icon: ShieldAlert, label: "Disaster Info" },
                  { num: 2, icon: Map, label: "Region" },
                  { num: 3, icon: FileVideo, label: "Media Source" },
                  { num: 4, icon: Cpu, label: "AI Engine" }
                ].map((s) => (
                  <div key={s.num} className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 ${
                      step >= s.num ? 'bg-cyan-900 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                    } transition-colors z-10`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-semibold ${step >= s.num ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-800 min-h-[250px]">
                {step === 1 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white mb-4">Disaster Classification</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {['Flood / Tsunami', 'Earthquake', 'Wildfire', 'Structural Collapse'].map(t => (
                        <div key={t} className="p-4 border border-slate-700 rounded bg-slate-800/50 hover:bg-slate-700 cursor-pointer transition-colors text-center font-medium">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-4 flex flex-col items-center justify-center h-full">
                    <Map className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-slate-400">Map selection component will load here...</p>
                    <Button variant="outline">Draw Boundary Polygon</Button>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-4 flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-700 rounded-lg p-8 relative">
                    <FileVideo className="w-16 h-16 text-slate-500 mb-2" />
                    <h4 className="text-lg text-white font-medium">Upload Drone Footage</h4>
                    <p className="text-sm text-slate-400 text-center max-w-sm">
                      Upload pre-recorded aerial footage or connect to a live RTMP drone stream.
                    </p>
                    {file && <div className="text-green-400 font-bold mt-2">Selected: {file.name}</div>}
                    <div className="flex gap-4 mt-4">
                      <input 
                        type="file" 
                        accept="video/mp4,video/quicktime,video/x-msvideo,image/jpeg,image/png" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={e => setFile(e.target.files?.[0] || null)}
                      />
                      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Browse Files</Button>
                      <Button variant="outline">Connect Live Stream</Button>
                    </div>
                  </div>
                )}
                {step === 4 && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white mb-4">AI Engine Configuration</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                        <div>
                          <p className="font-medium text-white">YOLOv8 Detection Model</p>
                          <p className="text-xs text-slate-400">People, Vehicles, Standard Hazards</p>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700">
                        <div>
                          <p className="font-medium text-white">Custom Flood Risk Classifier</p>
                          <p className="text-xs text-slate-400">Water segmentation and depth estimation</p>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-800 rounded border border-slate-700 opacity-50">
                        <div>
                          <p className="font-medium text-white">Thermal Imaging Processing</p>
                          <p className="text-xs text-slate-400">Requires IR sensor data</p>
                        </div>
                        <div className="text-xs font-bold text-red-500">UNAVAILABLE</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                Previous Step
              </Button>
              
              {step < 4 ? (
                <Button onClick={() => setStep(Math.min(4, step + 1))}>
                  Next Step
                </Button>
              ) : (
                <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleStartMission} disabled={isUploading || !file}>
                  <Play className="w-4 h-4" /> {isUploading ? "STARTING AI..." : "INITIATE MISSION"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
