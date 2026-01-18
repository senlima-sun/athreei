import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import * as crypto from "crypto"

export interface StoredCredentials {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  provider: string
  userId?: string
  organizationId?: string
}

export interface ProfileState {
  activeProfile: string
  activeOrg: Record<string, string> // profile -> orgId
}

export interface CredentialStore {
  get(key: string): Promise<StoredCredentials | null>
  set(key: string, credentials: StoredCredentials): Promise<void>
  delete(key: string): Promise<void>
  list(): Promise<string[]>
  getState(): Promise<ProfileState>
  setState(state: ProfileState): Promise<void>
  getActiveProfile(): Promise<string>
  setActiveProfile(profile: string): Promise<void>
  getActiveOrg(profile?: string): Promise<string | undefined>
  setActiveOrg(orgId: string, profile?: string): Promise<void>
}

export class FileCredentialStore implements CredentialStore {
  private readonly configDir: string
  private readonly credentialsFile: string
  private readonly stateFile: string
  private readonly encryptionKey: Buffer

  constructor() {
    this.configDir = path.join(os.homedir(), ".athreei")
    this.credentialsFile = path.join(this.configDir, "credentials.enc")
    this.stateFile = path.join(this.configDir, "state.json")
    this.ensureConfigDir()
    this.encryptionKey = this.getOrCreateEncryptionKey()
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { mode: 0o700 })
    }
  }

  private getOrCreateEncryptionKey(): Buffer {
    const keyFile = path.join(this.configDir, ".key")

    if (fs.existsSync(keyFile)) {
      return Buffer.from(fs.readFileSync(keyFile, "utf-8"), "hex")
    }

    const key = crypto.randomBytes(32)
    fs.writeFileSync(keyFile, key.toString("hex"), { mode: 0o600 })
    return key
  }

  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-gcm", this.encryptionKey, iv)
    let encrypted = cipher.update(data, "utf8", "hex")
    encrypted += cipher.final("hex")
    const authTag = cipher.getAuthTag()
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
  }

  private decrypt(data: string): string {
    const [ivHex, authTagHex, encrypted] = data.split(":")
    const iv = Buffer.from(ivHex ?? "", "hex")
    const authTag = Buffer.from(authTagHex ?? "", "hex")
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      iv
    )
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted ?? "", "hex", "utf8")
    decrypted += decipher.final("utf8")
    return decrypted
  }

  private readCredentials(): Record<string, StoredCredentials> {
    if (!fs.existsSync(this.credentialsFile)) return {}
    try {
      const encrypted = fs.readFileSync(this.credentialsFile, "utf-8")
      return JSON.parse(this.decrypt(encrypted))
    } catch {
      return {}
    }
  }

  private writeCredentials(
    credentials: Record<string, StoredCredentials>
  ): void {
    const encrypted = this.encrypt(JSON.stringify(credentials))
    fs.writeFileSync(this.credentialsFile, encrypted, { mode: 0o600 })
  }

  async get(key: string): Promise<StoredCredentials | null> {
    return this.readCredentials()[key] || null
  }

  async set(key: string, credential: StoredCredentials): Promise<void> {
    const credentials = this.readCredentials()
    credentials[key] = credential
    this.writeCredentials(credentials)
  }

  async delete(key: string): Promise<void> {
    const credentials = this.readCredentials()
    delete credentials[key]
    this.writeCredentials(credentials)
  }

  async list(): Promise<string[]> {
    return Object.keys(this.readCredentials())
  }

  async getState(): Promise<ProfileState> {
    if (!fs.existsSync(this.stateFile)) {
      return { activeProfile: "default", activeOrg: {} }
    }
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, "utf-8"))
    } catch {
      return { activeProfile: "default", activeOrg: {} }
    }
  }

  async setState(state: ProfileState): Promise<void> {
    fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), {
      mode: 0o600,
    })
  }

  async getActiveProfile(): Promise<string> {
    const state = await this.getState()
    return state.activeProfile
  }

  async setActiveProfile(profile: string): Promise<void> {
    const state = await this.getState()
    state.activeProfile = profile
    await this.setState(state)
  }

  async getActiveOrg(profile?: string): Promise<string | undefined> {
    const state = await this.getState()
    const p = profile ?? state.activeProfile
    return state.activeOrg[p]
  }

  async setActiveOrg(orgId: string, profile?: string): Promise<void> {
    const state = await this.getState()
    const p = profile ?? state.activeProfile
    state.activeOrg[p] = orgId
    await this.setState(state)
  }
}

export function createCredentialStore(): CredentialStore {
  return new FileCredentialStore()
}
