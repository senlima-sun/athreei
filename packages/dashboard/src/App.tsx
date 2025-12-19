import { h } from "preact"
import Router from "preact-router"
import { Layout } from "./components/Layout"
import { Dashboard } from "./pages/Dashboard"
import { AuditLogs } from "./pages/AuditLogs"
import { Permissions } from "./pages/Permissions"
import { Sessions } from "./pages/Sessions"
import { Settings } from "./pages/Settings"

export function App() {
  return (
    <Layout>
      <Router>
        <Dashboard path="/" />
        <AuditLogs path="/logs" />
        <Permissions path="/permissions" />
        <Sessions path="/sessions" />
        <Settings path="/settings" />
      </Router>
    </Layout>
  )
}
