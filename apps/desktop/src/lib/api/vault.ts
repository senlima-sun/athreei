/**
 * Vault API - Tauri IPC wrappers for vault operations
 */

import { invoke } from "@tauri-apps/api/core"

/**
 * Unlock the vault with a passphrase
 *
 * @param passphrase - The user's passphrase
 * @throws Error if unlock fails
 */
export const vaultUnlock = (passphrase: string): Promise<void> =>
  invoke("vault_unlock", { passphrase })

/**
 * Lock the vault, clearing the encryption key from memory
 */
export const vaultLock = (): Promise<void> => invoke("vault_lock")

/**
 * Check if the vault is currently unlocked
 *
 * @returns true if unlocked, false if locked
 */
export const vaultStatus = (): Promise<boolean> => invoke("vault_status")

/**
 * Set up a new vault with a passphrase
 *
 * Should only be called when no vault exists yet.
 *
 * @param passphrase - The user's chosen passphrase
 * @throws Error if vault is already set up
 */
export const vaultSetup = (passphrase: string): Promise<void> =>
  invoke("vault_setup", { passphrase })

/**
 * Check if a vault has been set up
 *
 * @returns true if vault exists, false otherwise
 */
export const vaultIsSetup = (): Promise<boolean> => invoke("vault_is_setup")

/**
 * Result of changing the passphrase
 */
export interface ChangePassphraseResult {
  memories_re_encrypted: number
  total_memories: number
  errors: string[]
}

/**
 * Change the vault passphrase
 *
 * This will re-encrypt all memories with the new passphrase.
 *
 * @param oldPassphrase - Current passphrase
 * @param newPassphrase - New passphrase (min 8 characters)
 * @returns Result of the operation
 */
export const vaultChangePassphrase = (
  oldPassphrase: string,
  newPassphrase: string
): Promise<ChangePassphraseResult> =>
  invoke("vault_change_passphrase", { oldPassphrase, newPassphrase })
