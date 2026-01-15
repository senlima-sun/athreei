/**
 * @athreei/shared/utils - Shared utility functions
 */

// Re-export redaction utilities
export {
  SENSITIVE_PATTERNS,
  redact,
  redactObject,
  createSecureLogger,
  type BaseLogger,
} from "./redact.js"

// Re-export config path utilities
export {
  getConfigDir,
  getConfigPath,
  getLegacyConfigDir,
  getLegacyConfigPath,
  getAppDataDir,
  ensureConfigDir,
  ensureAppDataDir,
  configExists,
  legacyConfigExists,
  configDirExists,
} from "./config-path.js"

// Re-export config loader utilities
export {
  ConfigError,
  loadConfig,
  saveConfig,
  loadConfigSync,
  saveConfigSync,
  loadLocalConfigSync,
  loadCloudConfigSync,
  needsLegacyMigration,
  loadLegacyConfigSync,
  configFileExists,
  tryLoadConfigSync,
} from "./config-loader.js"
