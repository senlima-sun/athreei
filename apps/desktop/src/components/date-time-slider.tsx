import * as React from "react"
import { useCallback, useRef, useState } from "react"
import {
  addYears,
  addMonths,
  addDays,
  addHours,
  addMinutes,
  format,
  setYear,
  setMonth,
  setDate,
} from "date-fns"

import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DateTimeSliderProps {
  value: Date
  onChange: (date: Date) => void
  className?: string
}

type FieldType = "year" | "month" | "day" | "hour" | "minute"

interface SliderFieldProps {
  value: string
  onIncrement: () => void
  onDecrement: () => void
  className?: string
}

function SliderField({
  value,
  onIncrement,
  onDecrement,
  className,
}: SliderFieldProps): React.ReactElement {
  const dragStartY = useRef<number | null>(null)
  const accumulatedDelta = useRef(0)
  const isDragging = useRef(false)

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        onIncrement()
      } else if (e.deltaY > 0) {
        onDecrement()
      }
    },
    [onIncrement, onDecrement]
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

      const threshold = 20
      if (Math.abs(accumulatedDelta.current) >= threshold) {
        isDragging.current = true
        if (accumulatedDelta.current > 0) {
          onIncrement()
        } else {
          onDecrement()
        }
        accumulatedDelta.current = 0
      }
    },
    [onIncrement, onDecrement]
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
        "cursor-ns-resize select-none tabular-nums transition-colors",
        "hover:bg-accent hover:text-accent-foreground rounded px-1",
        className
      )}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClick}
    >
      {value}
    </span>
  )
}

export function DateTimeSlider({
  value,
  onChange,
  className,
}: DateTimeSliderProps): React.ReactElement {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

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
          case "hour":
            newDate = addHours(value, direction)
            break
          case "minute":
            newDate = addMinutes(value, direction)
            break
        }
        onChange(newDate)
      }
    },
    [value, onChange]
  )

  const handleCalendarSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        let newDate = setYear(value, date.getFullYear())
        newDate = setMonth(newDate, date.getMonth())
        newDate = setDate(newDate, date.getDate())
        onChange(newDate)
        setIsCalendarOpen(false)
      }
    },
    [value, onChange]
  )

  return (
    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-0.5 text-sm font-medium text-muted-foreground",
          "cursor-pointer hover:text-foreground transition-colors bg-transparent border-none",
          className
        )}
      >
        <SliderField
          value={format(value, "yyyy")}
          onIncrement={createHandler("year", 1)}
          onDecrement={createHandler("year", -1)}
        />
        <span className="text-muted-foreground/50">/</span>
        <SliderField
          value={format(value, "MM")}
          onIncrement={createHandler("month", 1)}
          onDecrement={createHandler("month", -1)}
        />
        <span className="text-muted-foreground/50">/</span>
        <SliderField
          value={format(value, "dd")}
          onIncrement={createHandler("day", 1)}
          onDecrement={createHandler("day", -1)}
        />
        <span className="text-muted-foreground/50 mx-1">-</span>
        <SliderField
          value={format(value, "HH")}
          onIncrement={createHandler("hour", 1)}
          onDecrement={createHandler("hour", -1)}
        />
        <span className="text-muted-foreground/50">:</span>
        <SliderField
          value={format(value, "mm")}
          onIncrement={createHandler("minute", 1)}
          onDecrement={createHandler("minute", -1)}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleCalendarSelect}
        />
      </PopoverContent>
    </Popover>
  )
}
