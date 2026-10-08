import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ShieldAlert, MapPin, Radio, Activity, Camera, ArrowRight, Play } from "lucide-react"

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col font-sans overflow-x-hidden">
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/10 z-10 backdrop-blur-sm bg-background/80 fixed w-full top-0">
        <div className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-red-500 animate-pulse" />
          <span className="font-bold text-xl tracking-widest">RESCUE<span className="text-red-500">GRID</span></span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
          <a href="#platform" className="hover:text-white transition">Platform</a>
          <a href="#intelligence" className="hover:text-white transition">AI Intelligence</a>
          <a href="#impact" className="hover:text-white transition">Impact</a>
        </nav>
        <div className="flex gap-4">
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-white hidden sm:flex">
            Documentation
          </Button>
          <Link to="/app">
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold tracking-wide">
              SYSTEM LOGIN <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 mt-20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-40 px-8 flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.15) 0%, transparent 60%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '100% 100%, 40px 40px, 40px 40px'
          }}></div>
          
          <Badge className="mb-6 bg-cyan-900/40 text-cyan-400 border border-cyan-800 px-4 py-1 uppercase tracking-widest z-10">
            Emergency Response OS v2.0
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-8 z-10 leading-tight">
            TURN AERIAL DATA INTO <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">RESCUE INTELLIGENCE.</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mb-12 z-10 leading-relaxed">
            AI-powered disaster intelligence for faster survivor detection, hazard assessment, and safer emergency response. Automate drone data analysis in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 z-10">
            <Link to="/app/missions">
              <Button size="lg" className="h-14 px-8 text-lg bg-red-600 hover:bg-red-700 text-white border-0 shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                START MISSION
              </Button>
            </Link>
            <Link to="/app">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-cyan-700 text-cyan-400 hover:bg-cyan-950/50 hover:text-cyan-300">
                <Play className="mr-2 w-5 h-5" /> EXPLORE DEMO
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="platform" className="py-24 px-8 bg-slate-950/50 border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 uppercase tracking-wider">Core Capabilities</h2>
              <p className="text-slate-400">A complete operating system for disaster management.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Camera, title: "Autonomous Analysis", desc: "Process drone video streams in real-time using custom YOLO vision models to identify humans, vehicles, and structures." },
                { icon: ShieldAlert, title: "Multi-Hazard Correlation", desc: "Correlate survivor locations with detected hazards (fire, flood, debris) to calculate dynamic rescue priority scores." },
                { icon: MapPin, title: "Dynamic Risk Mapping", desc: "Generate live situational maps overlaying safe routes, blocked paths, and real-time search coverage heatmaps." },
              ].map((f, i) => (
                <div key={i} className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 hover:border-cyan-800 transition-colors">
                  <f.icon className="w-10 h-10 text-cyan-500 mb-6" />
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      
      <footer className="border-t border-white/10 py-12 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Radio className="h-4 w-4 text-slate-400" />
          <span className="font-bold tracking-widest">RESCUEGRID</span>
        </div>
        <p>Software-only prototype designed for the SIH AI Drone problem statement.</p>
      </footer>
    </div>
  )
}
// Placeholder component required since I added Badge locally inside it.
import { Badge } from "@/components/ui/badge"
