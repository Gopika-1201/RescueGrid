import { Outlet, Link, useLocation } from "react-router-dom"
import { LayoutDashboard, Map, Users, AlertTriangle, Route, ShieldAlert, FileText, Settings, Radio, Cpu } from "lucide-react"

const navItems = [
  { name: "Command Center", path: "/app", icon: LayoutDashboard },
  { name: "AI Vision Analysis", path: "/app/analysis", icon: Cpu },
  { name: "Missions", path: "/app/missions", icon: Radio },
  { name: "Intelligence Map", path: "/app/map", icon: Map },
  { name: "Survivors", path: "/app/survivors", icon: Users },
  { name: "Hazards", path: "/app/hazards", icon: AlertTriangle },
  { name: "Routes", path: "/app/routes", icon: Route },
  { name: "Alerts", path: "/app/alerts", icon: ShieldAlert },
  { name: "Reports", path: "/app/reports", icon: FileText },
  { name: "Settings", path: "/app/settings", icon: Settings },
]

export default function MainLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-red-500 animate-pulse" />
            <span className="font-bold text-lg tracking-wider text-white">RESCUE<span className="text-red-500">GRID</span></span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      isActive 
                        ? "bg-accent text-accent-foreground font-medium" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              OP
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Cmdr. O. Prime</span>
              <span className="text-xs text-muted-foreground">System Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-live animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Live Telemetry</span>
            </div>
            <div className="h-4 w-[1px] bg-border" />
            <span className="text-sm font-medium">MISSION: <span className="text-white">ALPHA-7 (FLOOD RESPONSE)</span></span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">AI Engine</span>
              <span className="text-sm font-medium text-safe">ONLINE</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Connectivity</span>
              <span className="text-sm font-medium text-safe">SECURE</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Sys Time</span>
              <span className="text-sm font-medium text-cyan-400 font-mono">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
