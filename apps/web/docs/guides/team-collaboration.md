# Team Collaboration

athreei enables teams to share MCP configurations, collaborate on namespaces, and manage access across your organization.

## Overview

Team collaboration in athreei provides:

- **Shared namespaces**: Common MCP server configurations
- **Role-based access**: Control who can do what
- **Centralized management**: Manage from the Platform dashboard
- **Audit logging**: Track all team activities
- **Per-user API keys**: Individual accountability

## Organizations

Everything in athreei belongs to an organization.

### Organization Structure

```
Organization
|-- Members (users with roles)
|-- Namespaces
|   |-- Servers
|   |-- Endpoints
|-- API Keys
|-- Settings
```

### Creating an Organization

New accounts automatically get a personal organization. To create a team organization:

1. Log in to [athreei.com](https://athreei.com)
2. Click your profile menu
3. Select **Create Organization**
4. Enter organization name
5. Choose a plan (Free, Team, Enterprise)

### Organization Settings

Navigate to **Organization > Settings** to configure:

- Organization name and avatar
- Billing and plan
- Security policies
- Audit log retention
- SSO configuration (Enterprise)

## Team Members

### Inviting Members

1. Go to **Organization > Members**
2. Click **Invite Member**
3. Enter their email address
4. Select a role
5. Click **Send Invite**

Invitees receive an email with a join link.

### Member Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Owner** | Full organization control | All permissions |
| **Admin** | Manage team and settings | Create namespaces, manage members, view billing |
| **Member** | Standard team member | Use namespaces, create endpoints |
| **Viewer** | Read-only access | View namespaces, read traces |

### Custom Roles (Enterprise)

Create custom roles with specific permissions:

```json
{
  "name": "Developer",
  "permissions": [
    "namespace:read",
    "namespace:write",
    "endpoint:create",
    "endpoint:delete",
    "trace:read",
    "apikey:create:own"
  ]
}
```

### Removing Members

1. Go to **Organization > Members**
2. Find the member
3. Click **...** menu
4. Select **Remove from organization**
5. Choose whether to transfer or delete their resources

## Namespace Collaboration

### Shared Namespaces

Namespaces can be accessed by multiple team members:

```
team-namespace/
|-- browser-server (shared)
|-- github-server (shared)
|-- endpoints/
    |-- alice-laptop (Alice's endpoint)
    |-- bob-desktop (Bob's endpoint)
    |-- staging-server (shared endpoint)
```

### Namespace Permissions

Control access at the namespace level:

| Permission | Description |
|------------|-------------|
| `view` | See namespace and configuration |
| `use` | Create endpoints, use servers |
| `edit` | Modify server configuration |
| `admin` | Delete namespace, manage permissions |

Assign permissions per member or role:

```json
{
  "namespace": "production",
  "permissions": {
    "alice@company.com": ["view", "use", "edit", "admin"],
    "bob@company.com": ["view", "use"],
    "role:developer": ["view", "use"],
    "role:viewer": ["view"]
  }
}
```

### Creating Team Namespaces

1. Go to **Namespaces**
2. Click **Create Namespace**
3. Select the organization (not personal)
4. Configure servers
5. Set permissions

## Endpoints and API Keys

### Personal vs Team Endpoints

- **Personal endpoints**: Only you can use them
- **Team endpoints**: Shared with team members

Creating a team endpoint:

1. Navigate to namespace
2. Click **Create Endpoint**
3. Toggle **Team Endpoint** on
4. Select who can access it

### API Key Management

Each team member should have their own API keys:

```
alice-laptop-key -> alice-laptop endpoint
bob-desktop-key -> bob-desktop endpoint
staging-key -> staging-server endpoint (shared)
```

**Best practice**: Create individual keys even for shared endpoints to track who did what.

## Audit Logging

### What's Logged

All actions are logged for accountability:

- Namespace changes
- Endpoint creation/deletion
- API key operations
- Member management
- Configuration updates
- Tool call summaries

### Viewing Audit Logs

1. Go to **Organization > Audit Log**
2. Filter by:
   - Date range
   - Member
   - Action type
   - Resource

### Audit Log Entry

```json
{
  "id": "log_xyz789",
  "timestamp": "2024-01-15T10:30:00Z",
  "actor": {
    "type": "user",
    "email": "alice@company.com"
  },
  "action": "namespace.server.create",
  "resource": {
    "type": "mcp-server",
    "id": "srv_abc123",
    "name": "github"
  },
  "details": {
    "command": "mcp-server-github",
    "namespace": "development"
  },
  "ip": "192.168.1.100"
}
```

### Exporting Audit Logs

For compliance or analysis:

```bash
curl https://athreei.com/api/org/audit-logs \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -d "start=2024-01-01&end=2024-01-31&format=csv" \
  > audit-january.csv
```

## Collaboration Workflows

### Development Team Workflow

1. **Shared development namespace**:
   - Common MCP servers (GitHub, Jira, browser)
   - Each developer creates personal endpoints
   - Traces visible to all for debugging

2. **Production namespace**:
   - Restricted to admins
   - CI/CD endpoints only
   - Stricter permissions

### Agency/Client Workflow

1. **One namespace per client**:
   - Client-specific servers
   - Isolated configurations
   - Separate billing (Enterprise)

2. **Shared internal namespace**:
   - Agency tools
   - Cross-client resources

### Example: Onboarding a New Developer

```bash
# 1. Admin invites new member
# (via dashboard or API)

# 2. New member joins and creates config
mkdir -p ~/.athreei
cat > ~/.athreei/config.json << 'EOF'
{
  "apiKey": "atr_new_developer_key",
  "endpoint": "new-dev-laptop"
}
EOF

# 3. Start gateway - inherits team namespace config
athreei-gateway
```

## Security Considerations

### Principle of Least Privilege

- Grant minimum permissions needed
- Use viewer role for stakeholders
- Create specific keys for specific purposes

### API Key Hygiene

- Individual keys per person
- Rotate keys when members leave
- Set expiration for contractors

### Sensitive Data

- Traces are encrypted per-user
- Team members see their own trace data
- Admins can view summary statistics only

### Offboarding Checklist

When a team member leaves:

1. Remove from organization
2. Revoke their API keys
3. Transfer any resources they own
4. Review their recent activity
5. Rotate any shared secrets they knew

## Single Sign-On (Enterprise)

### Supported Providers

- Okta
- Azure AD
- Google Workspace
- OneLogin
- Generic SAML 2.0
- OIDC

### Configuring SSO

1. Go to **Organization > Security > SSO**
2. Select your identity provider
3. Enter configuration details
4. Test the connection
5. Enable for all members

### SCIM Provisioning

Automatic user provisioning via SCIM:

```
Identity Provider -> SCIM -> athreei
                     |
                     +-> Create users
                     +-> Update attributes
                     +-> Deactivate on removal
```

## Troubleshooting

### "Permission denied"

1. Check your role in the organization
2. Verify namespace permissions
3. Ask an admin to grant access

### "Cannot see team namespace"

1. Confirm you're in the right organization
2. Check if namespace has viewer permission
3. Try switching organizations in dashboard

### "API key not working for team endpoint"

1. Verify key has endpoint access
2. Check endpoint is actually team-shared
3. Confirm namespace permissions

## Next Steps

- [API Keys Management](./api-keys.md)
- [Security Best Practices](../reference/security.md)
- [API Reference](../reference/api.md)
