"use client"

import * as React from "react"
import {
  Home,
  Server,
  Activity,
  Users,
  Settings,
  BookOpen,
  Store,
} from "lucide-react"

import { NavMain, type NavMainItem } from "./nav-main"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import { isLocalMode } from "@/lib/mode"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const getNavData = (): { main: NavMainItem[]; secondary: NavMainItem[] } => {
  if (isLocalMode()) {
    return {
      main: [
        { title: "Dashboard", url: "/dashboard", icon: Home },
        { title: "Traces", url: "/dashboard/traces", icon: Activity },
        { title: "Servers", url: "/dashboard/servers", icon: Server },
        { title: "Sessions", url: "/dashboard/sessions", icon: Users },
      ],
      secondary: [
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
      ],
    }
  }

  return {
    main: [
      { title: "Home", url: "/dashboard", icon: Home },
      {
        title: "MCP",
        url: "/dashboard/registry",
        icon: Server,
        items: [
          { title: "Registry", url: "/dashboard/registry" },
          { title: "My Servers", url: "/dashboard/mcp-servers" },
          { title: "Namespaces", url: "/dashboard/namespaces" },
          { title: "Endpoints", url: "/dashboard/endpoints" },
        ],
      },
      {
        title: "Marketplace",
        url: "/dashboard/marketplace",
        icon: Store,
        items: [
          { title: "Browse", url: "/dashboard/marketplace" },
          { title: "Installed Plugins", url: "/dashboard/plugins" },
        ],
      },
      {
        title: "AI Config",
        url: "/dashboard/skills",
        icon: BookOpen,
        items: [
          { title: "Skills", url: "/dashboard/skills" },
          { title: "Rules", url: "/dashboard/rules" },
          { title: "Analytics", url: "/dashboard/analytics" },
        ],
      },
    ],
    secondary: [
      { title: "Traces", url: "/dashboard/traces", icon: Activity },
      { title: "Team", url: "/dashboard/organizations", icon: Users },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        items: [
          { title: "General", url: "/dashboard/settings" },
          { title: "Marketplace", url: "/dashboard/settings/marketplace" },
        ],
      },
    ],
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navData = getNavData()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.main} />
        <NavMain items={navData.secondary} label="Platform" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
