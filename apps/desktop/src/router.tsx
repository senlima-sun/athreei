import { createBrowserRouter } from "react-router-dom"
import { Layout } from "./components/layout"
import { HomePage } from "./pages/home"
import { MemoriesPage } from "./pages/memories"
import { MemoryDetailPage } from "./pages/memory-detail"
import { SpacesPage } from "./pages/spaces"
import { SpaceDetailPage } from "./pages/space-detail"
import { WorkspacesPage } from "./pages/workspaces"
import { WorkspaceDetailPage } from "./pages/workspace-detail"
import { SettingsPage } from "./pages/settings"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "memories", element: <MemoriesPage /> },
      { path: "memories/:id", element: <MemoryDetailPage /> },
      { path: "spaces", element: <SpacesPage /> },
      { path: "spaces/:id", element: <SpaceDetailPage /> },
      { path: "workspaces", element: <WorkspacesPage /> },
      { path: "workspaces/:id", element: <WorkspaceDetailPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
])
