/**
 * @athreei/cli - Type definitions
 */

export interface ServerConfig {
  name: string
  url: string
  token: string // encrypted:base64... format
}

export interface Config {
  servers: ServerConfig[]
}

export interface AddOptions {
  name?: string
  url?: string
  token?: string
}

export interface VerifyResult {
  name: string
  url: string
  success: boolean
  error?: string
  tools?: string[]
}
