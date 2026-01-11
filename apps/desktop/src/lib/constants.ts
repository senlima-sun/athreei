export const POLLING_INTERVALS = {
  FAST: 1000,
  NORMAL: 5000,
  SLOW: 30000,
} as const

export const THEME = {
  DARK_CLASS: "dark",
} as const

export const DATE_FORMAT = {
  SHORT: {
    month: "short",
    day: "numeric",
  } as const,
  LONG: {
    month: "short",
    day: "numeric",
    year: "numeric",
  } as const,
  TIME: {
    hour: "2-digit",
    minute: "2-digit",
  } as const,
} as const

export const UI = {
  MAX_DISPLAYED_TAGS: 3,
  DEFAULT_PAGE_LIMIT: 100,
  SEARCH_DEBOUNCE_MS: 300,
  SUCCESS_MESSAGE_DURATION_MS: 5000,
} as const

export const APP = {
  NAME: "aiii",
  VERSION: "0.1.0",
  DESCRIPTION: "Memory Engine",
} as const

export const ENCRYPTION = {
  ALGORITHM: "AES-256",
} as const

export const BACKUP = {
  FILE_EXTENSION: "aiii",
  DEFAULT_FILENAME_PREFIX: "aiii-backup",
} as const
