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

export function debug(message: string, ...args: unknown[]): void {
  if (verboseMode) {
    console.error(`[DEBUG] ${message}`, ...args)
  }
}

export function info(message: string, ...args: unknown[]): void {
  if (!quietMode) {
    console.error(message, ...args)
  }
}

export function warn(message: string, ...args: unknown[]): void {
  if (!quietMode) {
    console.error(`[WARN] ${message}`, ...args)
  }
}

export function error(message: string, ...args: unknown[]): void {
  console.error(`[ERROR] ${message}`, ...args)
}

export function output(data: string): void {
  process.stdout.write(data + "\n")
}
