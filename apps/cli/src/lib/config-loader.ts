import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
} from "fs"
import { join, dirname } from "path"
import { homedir } from "os"
import {
  configSchema,
  defaultConfig,
  CONFIG_VERSION,
  type Config,
} from "./config-schema"

export const CONFIG_FILE_NAME = "athreei.config.json"

export function getConfigPaths(): string[] {
  return [
    process.env.ATHREEI_CONFIG,
    join(process.cwd(), CONFIG_FILE_NAME),
    join(homedir(), ".athreei", CONFIG_FILE_NAME),
  ].filter(Boolean) as string[]
}

export function findConfig(): string | null {
  for (const path of getConfigPaths()) {
    if (existsSync(path)) {
      return path
    }
  }
  return null
}

export function loadConfig(
  path?: string
): { config: Config; path: string } | null {
  const configPath = path ?? findConfig()
  if (!configPath || !existsSync(configPath)) {
    return null
  }

  const raw = JSON.parse(readFileSync(configPath, "utf-8"))
  const config = configSchema.parse(raw)
  return { config, path: configPath }
}

export function loadConfigOrDefault(): { config: Config; path: string | null } {
  const result = loadConfig()
  if (result) return { ...result }
  return { config: defaultConfig, path: null }
}

export function writeConfig(config: Config, path: string): void {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, JSON.stringify(config, null, 2) + "\n", "utf-8")
  renameSync(tempPath, path)
}

export function getConfigValue(config: Config, key: string): unknown {
  const parts = key.split(".")
  let value: unknown = config
  for (const part of parts) {
    if (value === null || value === undefined) return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

export function setConfigValue(
  config: Config,
  key: string,
  value: unknown
): Config {
  const parts = key.split(".")
  const result = JSON.parse(JSON.stringify(config))
  let current: Record<string, unknown> = result

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current)) {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }

  current[parts[parts.length - 1]] = value
  return configSchema.parse(result)
}

export function getDefaultConfigPath(): string {
  return join(process.cwd(), CONFIG_FILE_NAME)
}

export function getHomeConfigPath(): string {
  return join(homedir(), ".athreei", CONFIG_FILE_NAME)
}

export { CONFIG_VERSION, defaultConfig, configSchema }
export type { Config }
