interface NavItem {
  title: string
  path: string
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    path: '/docs/getting-started',
    children: [
      { title: 'Quick Start', path: '/docs/getting-started/quick-start' },
      { title: 'Concepts', path: '/docs/getting-started/concepts' },
    ],
  },
  {
    title: 'Guides',
    path: '/docs/guides',
    children: [
      { title: 'Local Gateway', path: '/docs/guides/local-gateway' },
      { title: 'Cloud Gateway', path: '/docs/guides/cloud-gateway' },
      { title: 'API Keys', path: '/docs/guides/api-keys' },
      { title: 'Team Collaboration', path: '/docs/guides/team-collaboration' },
    ],
  },
  {
    title: 'Reference',
    path: '/docs/reference',
    children: [
      { title: 'API', path: '/docs/reference/api' },
      { title: 'MCP Configuration', path: '/docs/reference/mcp-config' },
      { title: 'Troubleshooting', path: '/docs/reference/troubleshooting' },
    ],
  },
]

interface DocsSidebarProps {
  currentPath: string
}

export function DocsSidebar({ currentPath }: DocsSidebarProps) {
  return (
    <nav class="docs-sidebar">
      <div class="sidebar-header">
        <a href="/docs" class="sidebar-logo">
          athreei docs
        </a>
      </div>
      <ul class="nav-list">
        {navigation.map((section) => (
          <li key={section.path} class="nav-section">
            <span class="nav-section-title">{section.title}</span>
            {section.children && (
              <ul class="nav-children">
                {section.children.map((item) => (
                  <li key={item.path}>
                    <a
                      href={item.path}
                      class={`nav-link ${currentPath === item.path ? 'active' : ''}`}
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
