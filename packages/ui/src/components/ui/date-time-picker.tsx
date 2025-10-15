"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  value?: number // Unix timestamp in seconds
  onChange?: (timestamp: number) => void
  placeholder?: string
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  className,
}: DateTimePickerProps) {
  // Convert Unix timestamp to Date object
  const dateValue = value ? new Date(value * 1000) : undefined

  // Time state
  const [timeValue, setTimeValue] = React.useState(
    dateValue
      ? `${String(dateValue.getHours()).padStart(2, "0")}:${String(
        dateValue.getMinutes()
      ).padStart(2, "0")}`
      : "00:00"
  )

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    // Parse time value
    const [hours, minutes] = timeValue.split(":").map(Number)

    // Create new date with selected date and current time
    const newDate = new Date(date)
    newDate.setHours(hours || 0)
    newDate.setMinutes(minutes || 0)
    newDate.setSeconds(0)
    newDate.setMilliseconds(0)

    // Convert to Unix timestamp
    const timestamp = Math.floor(newDate.getTime() / 1000)
    onChange?.(timestamp)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)

    if (dateValue) {
      const [hours, minutes] = newTime.split(":").map(Number)
      const newDate = new Date(dateValue)
      newDate.setHours(hours || 0)
      newDate.setMinutes(minutes || 0)
      newDate.setSeconds(0)
      newDate.setMilliseconds(0)

      const timestamp = Math.floor(newDate.getTime() / 1000)
      onChange?.(timestamp)
    }
  }

  return (
    <Popover>
      <PopoverTrigger >
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "PPP HH:mm")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleDateSelect}
        />
        <div className="p-3 border-t">
          <label className="text-sm font-medium mb-2 block">时间</label>
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

