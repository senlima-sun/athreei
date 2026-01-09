import { encrypt, decrypt, type EncryptedData } from "@athreei/shared"

const CURRENT_KEY_VERSION = 1

function getEncryptionKey(): Uint8Array {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }

  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      "ENCRYPTION_KEY must be a valid 64-character hex string (32 bytes)"
    )
  }

  const key = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(keyHex.slice(i * 2, i * 2 + 2), 16)
  }

  return key
}

export function encryptEnv(env: Record<string, string>): string {
  const key = getEncryptionKey()
  const encrypted = encrypt(env, key, CURRENT_KEY_VERSION)
  return JSON.stringify(encrypted)
}

export function decryptEnv(encryptedJson: string): Record<string, string> {
  const key = getEncryptionKey()
  const encrypted: EncryptedData = JSON.parse(encryptedJson)
  return decrypt<Record<string, string>>(encrypted, key)
}

export function getCurrentKeyVersion(): number {
  return CURRENT_KEY_VERSION
}

export function isEncryptionConfigured(): boolean {
  const keyHex = process.env.ENCRYPTION_KEY
  return !!keyHex && keyHex.length === 64
}
