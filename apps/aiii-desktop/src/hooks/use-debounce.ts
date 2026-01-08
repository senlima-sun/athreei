import { useState, useEffect } from "react"

/**
 * Debounce a value by a specified delay
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
