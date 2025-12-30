import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import { Dashboard } from "./pages/Dashboard"
import { AuditLogs } from "./pages/AuditLogs"
import { Permissions } from "./pages/Permissions"
import { Sessions } from "./pages/Sessions"
import { Settings } from "./pages/Settings"
import { Traces } from "./pages/Traces"
import { TraceDetail } from "./pages/TraceDetail"

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/traces" element={<Traces />} />
          <Route path="/traces/:uuid" element={<TraceDetail />} />
          <Route path="/logs" element={<AuditLogs />} />
          <Route path="/permissions" element={<Permissions />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
