import { twMerge } from "tailwind-merge"

type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | Record<string, boolean | undefined | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((...args: any[]) => string | undefined)

function toVal(mix: ClassValue): string {
  let str = ""
  if (typeof mix === "string" || typeof mix === "number") {
    str += mix
  } else if (typeof mix === "function") {
    return ""
  } else if (typeof mix === "object") {
    if (Array.isArray(mix)) {
      for (const item of mix) {
        const y = toVal(item)
        if (y) {
          if (str) str += " "
          str += y
        }
      }
    } else if (mix) {
      for (const k in mix) {
        if (mix[k]) {
          if (str) str += " "
          str += k
        }
      }
    }
  }
  return str
}

function clsx(...inputs: ClassValue[]): string {
  let str = ""
  for (const input of inputs) {
    const x = toVal(input)
    if (x) {
      if (str) str += " "
      str += x
    }
  }
  return str
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}
