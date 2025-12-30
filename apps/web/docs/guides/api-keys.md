# Managing API Keys

API keys authenticate your gateway with the athreei Platform. This guide covers creating, managing, and securing your API keys.

## Overview

API keys are used to:

- Authenticate gateway connections
- Control access to specific endpoints
- Track usage and attribution
- Enable/disable access without changing configs

## Key Format

athreei API keys follow this format:

```
atr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Prefix: `atr_` (athreei)
- Body: 32 random alphanumeric characters
- Total length: 36 characters

## Creating API Keys

### Via Dashboard

1. Log in to [athreei.com](https://athreei.com)
2. Navigate to **Settings > API Keys**
3. Click **Create API Key**
4. Configure the key:
   - **Name**: Descriptive name (e.g., "Laptop - Development")
   - **Endpoints**: Select which endpoints this key can access
   - **Expiration**: Optional expiration date
5. Click **Create**
6. **Copy the key immediately** - it won't be shown again!

### Via API

```bash
curl -X POST https://athreei.com/api/keys \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI Server Key",
    "endpoints": ["ci-endpoint"],
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

Response:

```json
{
  "id": "key_abc123",
  "name": "CI Server Key",
  "key": "atr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "endpoints": ["ci-endpoint"],
  "createdAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

## Key Permissions

### Endpoint Access

Each key can access one or more endpoints:

```json
{
  "name": "Development Key",
  "endpoints": ["dev-laptop", "dev-desktop"]
}
```

### Scope Levels

| Scope | Description |
|-------|-------------|
| `read` | View namespace config, read traces |
| `write` | Execute tools, send traces |
| `admin` | Modify config, manage keys |

Default scope is `read` + `write`. Admin scope must be explicitly granted.

## Using API Keys

### In Gateway Config

```json
{
  "apiKey": "atr_your_api_key_here",
  "endpoint": "my-endpoint"
}
```

### Via Environment Variable

```bash
export ATHREEI_API_KEY="atr_your_api_key_here"
athreei-gateway
```

The gateway checks for `ATHREEI_API_KEY` if no key is in the config file.

### In CI/CD Pipelines

```yaml
# GitHub Actions
env:
  ATHREEI_API_KEY: ${{ secrets.ATHREEI_API_KEY }}

steps:
  - name: Run Gateway
    run: athreei-gateway
```

## Key Rotation

Regular key rotation improves security. Here's how to rotate keys with zero downtime:

### Manual Rotation

1. **Create new key** with same permissions
2. **Update configs** to use new key
3. **Test connectivity** with new key
4. **Revoke old key** once confirmed working

### Automated Rotation

```bash
#!/bin/bash
# rotate-key.sh

# Create new key
NEW_KEY=$(curl -s -X POST https://athreei.com/api/keys \
  -H "Authorization: Bearer $MASTER_KEY" \
  -d '{"name": "Auto-rotated", "endpoints": ["my-endpoint"]}' \
  | jq -r '.key')

# Update config
jq --arg key "$NEW_KEY" '.apiKey = $key' ~/.athreei/config.json > tmp.json
mv tmp.json ~/.athreei/config.json

# Restart gateway
pkill athreei-gateway
athreei-gateway &

# Wait and verify
sleep 5
if curl -s localhost:3000/health | grep -q "ok"; then
  # Revoke old key
  curl -X DELETE "https://athreei.com/api/keys/$OLD_KEY_ID" \
    -H "Authorization: Bearer $MASTER_KEY"
  echo "Rotation complete"
else
  echo "Rotation failed, keeping old key"
fi
```

## Viewing Key Usage

### Dashboard

Navigate to **Settings > API Keys** and click on a key to see:

- Last used timestamp
- Total requests
- Requests by endpoint
- Error rate

### API

```bash
curl https://athreei.com/api/keys/key_abc123/stats \
  -H "Authorization: Bearer $MASTER_KEY"
```

Response:

```json
{
  "keyId": "key_abc123",
  "lastUsed": "2024-01-15T14:30:00Z",
  "totalRequests": 15420,
  "requestsByEndpoint": {
    "dev-laptop": 10000,
    "dev-desktop": 5420
  },
  "errorRate": 0.02
}
```

## Revoking Keys

### Via Dashboard

1. Go to **Settings > API Keys**
2. Find the key to revoke
3. Click the **...** menu
4. Select **Revoke**
5. Confirm the action

Revocation is immediate. All gateways using the key will fail authentication.

### Via API

```bash
curl -X DELETE https://athreei.com/api/keys/key_abc123 \
  -H "Authorization: Bearer $MASTER_KEY"
```

## Key Security Best Practices

### Do

- Use separate keys for each device/environment
- Set expiration dates for temporary access
- Rotate keys periodically (monthly recommended)
- Use environment variables in CI/CD
- Monitor key usage for anomalies

### Don't

- Share keys between team members
- Commit keys to version control
- Use admin-scope keys for regular operations
- Keep unused keys active
- Ignore key expiration warnings

### Detecting Compromised Keys

Signs a key may be compromised:

1. Unexpected usage patterns
2. Requests from unknown IPs
3. Access to endpoints not in use
4. Spike in error rates

If you suspect a key is compromised:

1. **Revoke immediately**
2. Create a new key
3. Update all configs
4. Review access logs
5. Report to security@athreei.com

## Emergency Key Revocation

If you need to revoke all keys immediately:

### Dashboard

1. Go to **Settings > Security**
2. Click **Emergency Revoke All Keys**
3. Confirm with your password

### API

```bash
curl -X POST https://athreei.com/api/keys/revoke-all \
  -H "Authorization: Bearer $MASTER_KEY" \
  -H "X-Confirm: revoke-all-keys"
```

This will:
- Revoke all API keys in your organization
- Disconnect all gateways
- Require new keys to be created

## Troubleshooting

### "Invalid API key"

1. Check for typos (copy/paste the full key)
2. Verify the key hasn't been revoked
3. Ensure no extra whitespace

### "Key expired"

1. Check expiration date in dashboard
2. Create a new key
3. Update your configuration

### "Insufficient permissions"

1. Verify key has access to the endpoint
2. Check key scope matches required operation
3. Create a key with appropriate permissions

## Next Steps

- [Team Collaboration](./team-collaboration.md)
- [Cloud Gateway Setup](./cloud-gateway.md)
- [Security Best Practices](../reference/security.md)
