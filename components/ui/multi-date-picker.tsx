"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getHolidayForDate, getHolidaysForMonthAsync } from "@/lib/holidays"

interface MultiDatePickerProps {
  selectedDates: Date[]
  onDatesChange: (dates: Date[]) => void
  className?: string
}

export function MultiDatePicker({ selectedDates, onDatesChange, className }: MultiDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [holidaysThisMonth, setHolidaysThisMonth] = useState<any[]>([])
  const [holidaysLoading, setHolidaysLoading] = useState(false)

  // Load holidays when month changes
  useEffect(() => {
    const loadHolidays = async () => {
      setHolidaysLoading(true)
      try {
        const holidays = await getHolidaysForMonthAsync(
          currentMonth.getFullYear(),
          currentMonth.getMonth()
        )
        setHolidaysThisMonth(holidays)
      } catch (error) {
        console.error('Error loading holidays:', error)
        setHolidaysThisMonth([])
      } finally {
        setHolidaysLoading(false)
      }
    }

    loadHolidays()
  }, [currentMonth])

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate =>
      selectedDate.toDateString() === date.toDateString()
    )
  }

  const handleDateClick = (date: Date | undefined) => {
    if (!date) return

    const dateString = date.toDateString()
    const isAlreadySelected = selectedDates.some(selectedDate =>
      selectedDate.toDateString() === dateString
    )

    if (isAlreadySelected) {
      // Remove date if already selected
      const newDates = selectedDates.filter(selectedDate =>
        selectedDate.toDateString() !== dateString
      )
      onDatesChange(newDates)
    } else {
      // Add date if not selected
      const newDates = [...selectedDates, date]
      onDatesChange(newDates)
    }
  }

  const removeDate = (dateToRemove: Date) => {
    const newDates = selectedDates.filter(date =>
      date.toDateString() !== dateToRemove.toDateString()
    )
    onDatesChange(newDates)
  }

  const clearAllDates = () => {
    onDatesChange([])
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Calendar
        mode="single"
        selected={undefined}
        onSelect={handleDateClick}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="rounded-md border text-lg"
        style={{ fontSize: '16px' }}
        modifiers={{
          selected: selectedDates,
          thailandHoliday: holidaysThisMonth.filter(h => h.country === 'TH').map(h => new Date(h.date)),
          indiaHoliday: holidaysThisMonth.filter(h => h.country === 'IN').map(h => new Date(h.date))
        }}
        modifiersClassNames={{
          selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          thailandHoliday: "bg-red-100 text-red-900 hover:bg-red-200",
          indiaHoliday: "bg-orange-100 text-orange-900 hover:bg-orange-200"
        }}
        components={{
          DayContent: ({ date }) => {
            const isSelected = isDateSelected(date)
            const holiday = getHolidayForDate(date, holidaysThisMonth)

            return (
              <div className={cn(
                "relative w-full h-full flex flex-col items-center justify-center min-h-[4rem] p-1",
                isSelected && "font-bold"
              )}>
                {/* วันที่ */}
                <div className="text-center">
                  {date.getDate()}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>

                {/* ชื่อวันหยุด */}
                {holiday && (
                  <div className={cn(
                    "text-xs text-center leading-tight mt-1 px-1 rounded-sm",
                    "truncate max-w-full",
                    holiday.country === 'TH'
                      ? "bg-red-100 text-red-800"
                      : "bg-orange-100 text-orange-800"
                  )} title={holiday.name}>
                    {holiday.name.length > 10
                      ? `${holiday.name.substring(0, 8)}...`
                      : holiday.name
                    }
                  </div>
                )}
              </div>
            )
          }
        }}
      />

      {holidaysLoading && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-muted-foreground"></div>
            Loading holidays...
          </div>
        </div>
      )}

      {selectedDates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedDates.length} date{selectedDates.length !== 1 ? "s" : ""} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllDates}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {selectedDates
              .sort((a, b) => a.getTime() - b.getTime())
              .map((date, index) => (
                <Badge
                  key={date.toISOString()}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="text-xs">{formatDate(date)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeDate(date)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
