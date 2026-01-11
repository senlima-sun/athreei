import * as React from "react"
import { useCallback, useRef, useState, useEffect } from "react"
import {
  addYears,
  addMonths,
  addDays,
  format,
  setYear,
  setMonth,
  setDate,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DateSliderProps {
  value: Date
  onChange: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  className?: string
}

type FieldType = "year" | "month" | "day"

interface SliderFieldProps {
  value: string
  prevValue: string | null
  onIncrement: () => void
  onDecrement: () => void
  canIncrement: boolean
  canDecrement: boolean
  className?: string
}

const WHEEL_THRESHOLD = 50
const DRAG_THRESHOLD = 30

function SliderField({
  value,
  prevValue,
  onIncrement,
  onDecrement,
  canIncrement,
  canDecrement,
  className,
}: SliderFieldProps): React.ReactElement {
  const dragStartY = useRef<number | null>(null)
  const accumulatedDelta = useRef(0)
  const wheelAccumulator = useRef(0)
  const isDragging = useRef(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<
    "up" | "down" | null
  >(null)
  const [displayValue, setDisplayValue] = useState(value)
  const [exitingValue, setExitingValue] = useState<string | null>(null)

  useEffect(() => {
    if (prevValue !== null && prevValue !== value) {
      const prevNum = parseInt(prevValue, 10)
      const currNum = parseInt(value, 10)
      const direction = currNum > prevNum ? "up" : "down"

      setExitingValue(prevValue)
      setAnimationDirection(direction)
      setIsAnimating(true)
      setDisplayValue(value)

      const timer = setTimeout(() => {
        setIsAnimating(false)
        setExitingValue(null)
        setAnimationDirection(null)
      }, 150)

      return () => clearTimeout(timer)
    } else {
      setDisplayValue(value)
    }
  }, [value, prevValue])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      wheelAccumulator.current += e.deltaY

      if (Math.abs(wheelAccumulator.current) >= WHEEL_THRESHOLD) {
        if (wheelAccumulator.current < 0 && canIncrement) {
          onIncrement()
        } else if (wheelAccumulator.current > 0 && canDecrement) {
          onDecrement()
        }
        wheelAccumulator.current = 0
      }
    },
    [onIncrement, onDecrement, canIncrement, canDecrement]
  )

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY
    accumulatedDelta.current = 0
    isDragging.current = false
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartY.current === null) return

      const delta = dragStartY.current - e.clientY
      accumulatedDelta.current += delta
      dragStartY.current = e.clientY

      if (Math.abs(accumulatedDelta.current) >= DRAG_THRESHOLD) {
        isDragging.current = true
        if (accumulatedDelta.current > 0 && canIncrement) {
          onIncrement()
        } else if (accumulatedDelta.current < 0 && canDecrement) {
          onDecrement()
        }
        accumulatedDelta.current = 0
      }
    },
    [onIncrement, onDecrement, canIncrement, canDecrement]
  )

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    dragStartY.current = null
    accumulatedDelta.current = 0
    setTimeout(() => {
      isDragging.current = false
    }, 0)
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      e.stopPropagation()
    }
  }, [])

  return (
    <span
      className={cn(
        "relative cursor-ns-resize select-none tabular-nums transition-colors overflow-hidden",
        "hover:bg-accent hover:text-accent-foreground rounded px-0.5",
        (!canIncrement || !canDecrement) && "opacity-70",
        className
      )}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
    >
      <span className="relative inline-flex flex-col items-center h-[1.2em] overflow-hidden">
        {exitingValue && isAnimating && (
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-transform duration-150 ease-out",
              animationDirection === "up" && "-translate-y-full opacity-0",
              animationDirection === "down" && "translate-y-full opacity-0"
            )}
          >
            {exitingValue}
          </span>
        )}
        <span
          className={cn(
            "flex items-center justify-center transition-transform duration-150 ease-out",
            isAnimating &&
              animationDirection === "up" &&
              "animate-slide-in-from-bottom",
            isAnimating &&
              animationDirection === "down" &&
              "animate-slide-in-from-top"
          )}
        >
          {displayValue}
        </span>
      </span>
    </span>
  )
}

export function DateSlider({
  value,
  onChange,
  minDate,
  maxDate,
  className,
}: DateSliderProps): React.ReactElement {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const prevValuesRef = useRef<{ year: string; month: string; day: string }>({
    year: format(value, "yyyy"),
    month: format(value, "MM"),
    day: format(value, "dd"),
  })

  const currentYear = format(value, "yyyy")
  const currentMonth = format(value, "MM")
  const currentDay = format(value, "dd")

  const prevValues = prevValuesRef.current

  useEffect(() => {
    prevValuesRef.current = {
      year: currentYear,
      month: currentMonth,
      day: currentDay,
    }
  }, [currentYear, currentMonth, currentDay])

  const clampDate = useCallback(
    (date: Date): Date => {
      const dayStart = startOfDay(date)
      if (minDate && isBefore(dayStart, startOfDay(minDate))) {
        return startOfDay(minDate)
      }
      if (maxDate && isAfter(dayStart, startOfDay(maxDate))) {
        return startOfDay(maxDate)
      }
      return date
    },
    [minDate, maxDate]
  )

  const canIncrement = useCallback(
    (field: FieldType): boolean => {
      if (!maxDate) return true
      let testDate: Date
      switch (field) {
        case "year":
          testDate = addYears(value, 1)
          break
        case "month":
          testDate = addMonths(value, 1)
          break
        case "day":
          testDate = addDays(value, 1)
          break
      }
      return !isAfter(startOfDay(testDate), startOfDay(maxDate))
    },
    [value, maxDate]
  )

  const canDecrement = useCallback(
    (field: FieldType): boolean => {
      if (!minDate) return true
      let testDate: Date
      switch (field) {
        case "year":
          testDate = addYears(value, -1)
          break
        case "month":
          testDate = addMonths(value, -1)
          break
        case "day":
          testDate = addDays(value, -1)
          break
      }
      return !isBefore(startOfDay(testDate), startOfDay(minDate))
    },
    [value, minDate]
  )

  const createHandler = useCallback(
    (field: FieldType, direction: 1 | -1) => {
      return () => {
        let newDate: Date
        switch (field) {
          case "year":
            newDate = addYears(value, direction)
            break
          case "month":
            newDate = addMonths(value, direction)
            break
          case "day":
            newDate = addDays(value, direction)
            break
        }
        onChange(clampDate(newDate))
      }
    },
    [value, onChange, clampDate]
  )

  const handleCalendarSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        let newDate = setYear(value, date.getFullYear())
        newDate = setMonth(newDate, date.getMonth())
        newDate = setDate(newDate, date.getDate())
        onChange(clampDate(newDate))
        setIsCalendarOpen(false)
      }
    },
    [value, onChange, clampDate]
  )

  return (
    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center text-sm font-medium text-muted-foreground",
          "cursor-pointer hover:text-foreground transition-colors bg-transparent border-none",
          className
        )}
      >
        <SliderField
          value={currentYear}
          prevValue={prevValues.year !== currentYear ? prevValues.year : null}
          onIncrement={createHandler("year", 1)}
          onDecrement={createHandler("year", -1)}
          canIncrement={canIncrement("year")}
          canDecrement={canDecrement("year")}
        />
        <span className="text-muted-foreground/50">/</span>
        <SliderField
          value={currentMonth}
          prevValue={
            prevValues.month !== currentMonth ? prevValues.month : null
          }
          onIncrement={createHandler("month", 1)}
          onDecrement={createHandler("month", -1)}
          canIncrement={canIncrement("month")}
          canDecrement={canDecrement("month")}
        />
        <span className="text-muted-foreground/50">/</span>
        <SliderField
          value={currentDay}
          prevValue={prevValues.day !== currentDay ? prevValues.day : null}
          onIncrement={createHandler("day", 1)}
          onDecrement={createHandler("day", -1)}
          canIncrement={canIncrement("day")}
          canDecrement={canDecrement("day")}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleCalendarSelect}
          disabled={(date) => {
            if (minDate && isBefore(date, startOfDay(minDate))) return true
            if (maxDate && isAfter(date, startOfDay(maxDate))) return true
            return false
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
