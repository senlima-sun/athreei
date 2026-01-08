// Global output control
let verboseMode = false
let quietMode = false

export function setVerbose(value: boolean): void {
  verboseMode = value
}

export function setQuiet(value: boolean): void {
  quietMode = value
}

export function isVerbose(): boolean {
  return verboseMode
}

export function isQuiet(): boolean {
  return quietMode
}

// Debug logging (only in verbose mode)
export function debug(message: string, ...args: unknown[]): void {
  if (verboseMode) {
    console.error(`[DEBUG] ${message}`, ...args)
  }
}

// Info logging (suppressed in quiet mode)
export function info(message: string, ...args: unknown[]): void {
  if (!quietMode) {
    console.error(message, ...args)
  }
}

// Warning (suppressed in quiet mode)
export function warn(message: string, ...args: unknown[]): void {
  if (!quietMode) {
    console.error(`[WARN] ${message}`, ...args)
  }
}

// Error (never suppressed)
export function error(message: string, ...args: unknown[]): void {
  console.error(`[ERROR] ${message}`, ...args)
}

// Output to stdout (never suppressed - for data output)
export function output(data: string): void {
  process.stdout.write(data + "\n")
}
