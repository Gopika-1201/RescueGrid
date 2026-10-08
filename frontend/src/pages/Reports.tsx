import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Share2, FileJson, FileIcon, Search, Calendar, ChevronDown } from "lucide-react"

export default function Reports() {
  const reports = [
    {
      id: "REP-2024-001",
      mission: "ALPHA-7",
      title: "Initial Assessment Report",
      date: "2024-10-24 10:45:00",
      status: "GENERATED",
      size: "2.4 MB"
    },
    {
      id: "REP-2024-002",
      mission: "ALPHA-7",
      title: "Sector 4 Damage Analysis",
      date: "2024-10-24 11:30:00",
      status: "GENERATED",
      size: "4.1 MB"
    },
    {
      id: "REP-2024-003",
      mission: "BRAVO-2",
      title: "Post-Mission Summary",
      date: "2024-10-23 18:00:00",
      status: "ARCHIVED",
      size: "1.8 MB"
    }
  ]

  return (
    <div className="h-full flex flex-col gap-6 p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Situation Reports</h2>
          <p className="text-muted-foreground">AI-generated mission summaries and operational intelligence.</p>
        </div>
        <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <FileText className="mr-2 h-4 w-4" /> GENERATE NEW REPORT
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Column - Report Library */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search reports..." 
                className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-cyan-500 text-white"
              />
            </div>
            <Button variant="outline" className="px-3 border-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {reports.map((report, idx) => (
              <div 
                key={report.id} 
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  idx === 0 
                    ? 'bg-slate-800/80 border-cyan-700' 
                    : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={idx === 0 ? "default" : "outline"} className={idx === 0 ? "bg-cyan-900/50 text-cyan-400 border-cyan-800" : "border-slate-700 text-slate-400"}>
                    {report.mission}
                  </Badge>
                  <span className="text-xs text-slate-500 font-mono">{report.date.split(' ')[0]}</span>
                </div>
                <h4 className={`font-medium mb-1 ${idx === 0 ? 'text-white' : 'text-slate-300'}`}>{report.title}</h4>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-slate-500">{report.id}</span>
                  <span className="text-xs text-slate-500">{report.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Report Viewer */}
        <div className="lg:col-span-2">
          <Card className="h-full bg-card/40 border-slate-800 flex flex-col">
            <CardHeader className="border-b border-slate-800 flex flex-row items-start justify-between pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-cyan-900/50 text-cyan-400 border border-cyan-800">ALPHA-7</Badge>
                  <span className="text-sm text-slate-400 font-mono">REP-2024-001</span>
                </div>
                <CardTitle className="text-xl text-white">Initial Assessment Report</CardTitle>
                <CardDescription>Generated on 2024-10-24 at 10:45:00 UTC</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="border-slate-700 text-slate-300 hover:text-white">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white gap-2">
                  <Download className="h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white gap-2">
                  <FileJson className="h-4 w-4" /> JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-y-auto bg-slate-950/50">
              {/* Document Preview */}
              <div className="max-w-3xl mx-auto my-8 bg-white text-slate-900 p-10 rounded shadow-lg min-h-[600px] font-serif">
                <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tight">MISSION SUMMARY</h1>
                    <p className="text-slate-500 font-sans text-sm mt-1">RESCUEGRID INTELLIGENCE PLATFORM</p>
                  </div>
                  <div className="text-right font-sans text-sm font-bold text-red-700">
                    CONFIDENTIAL - OPS TEAM ONLY
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 font-sans text-sm">
                  <div>
                    <p><span className="font-bold text-slate-500 w-32 inline-block">MISSION ID:</span> ALPHA-7</p>
                    <p><span className="font-bold text-slate-500 w-32 inline-block">DISASTER TYPE:</span> FLOOD RESPONSE</p>
                    <p><span className="font-bold text-slate-500 w-32 inline-block">AREA COVERED:</span> 7.4 km²</p>
                  </div>
                  <div>
                    <p><span className="font-bold text-slate-500 w-32 inline-block">START TIME:</span> 2024-10-24 08:00:00</p>
                    <p><span className="font-bold text-slate-500 w-32 inline-block">REPORT TIME:</span> 2024-10-24 10:45:00</p>
                    <p><span className="font-bold text-slate-500 w-32 inline-block">GENERATED BY:</span> AI COMMAND ENGINE</p>
                  </div>
                </div>

                <h2 className="text-lg font-bold border-b border-slate-300 mb-3 uppercase">Executive Summary</h2>
                <p className="mb-6 leading-relaxed text-justify">
                  Mission Alpha has analyzed 7.4 km² of affected terrain in Sector 4. A total of <strong>27 persons</strong> were detected, including <strong>6 high-priority cases</strong> requiring immediate medical attention or evacuation. <strong>19 distinct hazards</strong> were identified by the AI vision system. Severe flooding and secondary structural debris are the dominant environmental threats. Sector C-14 remains insufficiently searched due to poor visibility conditions and requires secondary drone deployment.
                </p>

                <h2 className="text-lg font-bold border-b border-slate-300 mb-3 uppercase">Detection Statistics</h2>
                <table className="w-full mb-6 text-sm font-sans">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left p-2 border border-slate-300">Category</th>
                      <th className="text-center p-2 border border-slate-300">Total Count</th>
                      <th className="text-center p-2 border border-slate-300">Critical Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-slate-300">Survivors</td>
                      <td className="text-center p-2 border border-slate-300">27</td>
                      <td className="text-center p-2 border border-slate-300 text-red-600 font-bold">6</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-300">Environmental Hazards</td>
                      <td className="text-center p-2 border border-slate-300">19</td>
                      <td className="text-center p-2 border border-slate-300 text-orange-600 font-bold">5</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-300">Blocked Rescue Routes</td>
                      <td className="text-center p-2 border border-slate-300">8</td>
                      <td className="text-center p-2 border border-slate-300">-</td>
                    </tr>
                  </tbody>
                </table>

                <h2 className="text-lg font-bold border-b border-slate-300 mb-3 uppercase">Recommended Actions</h2>
                <ul className="list-disc pl-5 space-y-2 mb-6">
                  <li><strong>Immediate Rescue:</strong> Dispatch Team R-02 to Survivor S-014 (Sector B-2). Severe flood risk escalating.</li>
                  <li><strong>Route Warning:</strong> Primary Route A is unnavigable due to structural debris. Divert all units to Safe Route B.</li>
                  <li><strong>Next Search Priority:</strong> Deploy secondary drone unit to Sector C-14 to investigate unsearched high-risk terrain.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
