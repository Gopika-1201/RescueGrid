import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import MainLayout from "@/layouts/MainLayout"
import CommandCenter from "@/pages/CommandCenter"
import Missions from "@/pages/Missions"
import Reports from "@/pages/Reports"
import Landing from "@/pages/Landing"
import AIAnalysis from "@/pages/AIAnalysis"
import IntelligenceMap from "@/pages/IntelligenceMap"
import Survivors from "@/pages/Survivors"
import Hazards from "@/pages/Hazards"
import RoutesPage from "@/pages/Routes"
import Alerts from "@/pages/Alerts"
import Settings from "@/pages/Settings"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<MainLayout />}>
          <Route index element={<CommandCenter />} />
          <Route path="analysis" element={<AIAnalysis />} />
          <Route path="missions" element={<Missions />} />
          <Route path="map" element={<IntelligenceMap />} />
          <Route path="survivors" element={<Survivors />} />
          <Route path="hazards" element={<Hazards />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
