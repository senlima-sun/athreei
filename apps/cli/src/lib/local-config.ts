import {
  loadLocalConfigSync,
  saveConfigSync,
  getConfigPath,
  configFileExists,
  createEmptyLocalConfig,
  type ServerConfig,
  type LocalConfig,
} from "@athreei/shared"

export function listLocalServers(): ServerConfig[] {
  if (!configFileExists()) {
    return []
  }

  const config = loadLocalConfigSync()
  return config.servers
}

export function getLocalServer(name: string): ServerConfig | undefined {
  const servers = listLocalServers()
  return servers.find((s) => s.name === name)
}

export function localServerExists(name: string): boolean {
  return getLocalServer(name) !== undefined
}

export function addLocalServer(server: ServerConfig): boolean {
  let config: LocalConfig

  if (configFileExists()) {
    config = loadLocalConfigSync()
  } else {
    config = createEmptyLocalConfig()
  }

  const existingIndex = config.servers.findIndex((s) => s.name === server.name)
  const isNew = existingIndex < 0

  if (isNew) {
    config.servers.push(server)
  } else {
    config.servers[existingIndex] = server
  }

  saveConfigSync(config)
  return isNew
}

export function updateLocalServer(
  name: string,
  updates: Partial<ServerConfig>
): boolean {
  if (!configFileExists()) {
    return false
  }

  const config = loadLocalConfigSync()
  const index = config.servers.findIndex((s) => s.name === name)

  if (index < 0) {
    return false
  }

  config.servers[index] = {
    ...config.servers[index],
    ...updates,
    name,
  }

  saveConfigSync(config)
  return true
}

export function removeLocalServer(name: string): boolean {
  if (!configFileExists()) {
    return false
  }

  const config = loadLocalConfigSync()
  const initialLength = config.servers.length
  config.servers = config.servers.filter((s) => s.name !== name)

  if (config.servers.length === initialLength) {
    return false
  }

  saveConfigSync(config)
  return true
}

export function setLocalServers(servers: ServerConfig[]): void {
  const config: LocalConfig = { servers }
  saveConfigSync(config)
}

export function clearLocalServers(): void {
  setLocalServers([])
}

export function getLocalConfigPath(): string {
  return getConfigPath()
}

export function hasLocalConfig(): boolean {
  return configFileExists()
}

export function getLocalServerCount(): number {
  return listLocalServers().length
}
