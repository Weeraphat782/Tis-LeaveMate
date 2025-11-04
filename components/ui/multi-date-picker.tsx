"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { getHolidayForDate, getHolidaysForMonthAsync, getCountryFlag, getCountryName } from "@/lib/holidays"

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
      console.log('📅 Loading holidays for:', currentMonth.getFullYear(), currentMonth.getMonth() + 1)
      setHolidaysLoading(true)
      try {
        const holidays = await getHolidaysForMonthAsync(
          currentMonth.getFullYear(),
          currentMonth.getMonth()
        )
        console.log('✅ Loaded holidays:', holidays.length, 'for month')
        setHolidaysThisMonth(holidays)
      } catch (error) {
        console.error('❌ Error loading holidays:', error)
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
        className="rounded-md border"
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

            // Debug logging
            if (holiday) {
              console.log('🎉 Found holiday for date:', date.toDateString(), holiday.name)
            }

            const dayContent = (
              <div className={cn(
                "relative w-full h-full flex items-center justify-center",
                isSelected && "font-bold"
              )}>
                {date.getDate()}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
                {holiday && (
                  <div className={cn(
                    "absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full",
                    holiday.country === 'TH' ? "bg-red-500" : "bg-orange-500"
                  )} />
                )}
              </div>
            )

            // Always show tooltip for better UX
            const tooltipContent = holiday ? (
              <div className="space-y-2 min-w-[200px]">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{getCountryFlag(holiday.country)}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm leading-tight">{holiday.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {getCountryName(holiday.country)} • {holiday.type} holiday
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  {new Date(holiday.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            ) : (
              <div className="text-sm min-w-[150px]">
                <div className="font-medium text-green-600 dark:text-green-400">✓ Working Day</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )

            return (
              <Tooltip
                delayDuration={300}
                disableHoverableContent={false}
                open={undefined} // Let Radix handle open/close automatically
              >
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "cursor-help w-full h-full flex items-center justify-center rounded-sm",
                      holiday && "hover:scale-105 transition-transform duration-200 hover:bg-accent"
                    )}
                    onMouseEnter={() => {
                      console.log('🔍 Mouse enter:', date.toDateString(), 'Holiday:', holiday?.name || 'None (Working day)')
                      // Temporary: Show alert for testing
                      if (holiday) {
                        console.log('🎉 HOLIDAY DETECTED:', holiday.name, holiday.country)
                      }
                    }}
                    onMouseLeave={() => {
                      console.log('👋 Mouse leave:', date.toDateString())
                    }}
                  >
                    {dayContent}
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="max-w-xs p-3 bg-popover border shadow-xl z-[10000] text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                  align="center"
                  avoidCollisions={true}
                  collisionPadding={10}
                >
                  {tooltipContent}
                </TooltipContent>
              </Tooltip>
            )
          }
        }}
      />

      {holidaysLoading && (
        <div className="text-center py-3 bg-muted/30 rounded-lg border border-dashed">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent"></div>
            <span>Loading holiday information...</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Fetching from Google Calendar
          </div>
        </div>
      )}

      {!holidaysLoading && holidaysThisMonth.length > 0 && (
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground bg-muted/20 rounded-lg p-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>🇹🇭 Thailand</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
            <span>🇮🇳 India</span>
          </div>
          <div className="text-xs opacity-75">• Hover for details</div>
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
