// Holiday data types and utilities for Thailand and India holidays

export interface Holiday {
  date: string // ISO date string '2025-01-01'
  name: string // Holiday name
  country: 'TH' | 'IN' // Thailand or India
  type: 'public' | 'national' | 'religious' // Holiday type
  description?: string // Optional description
}

// Google Calendar IDs for public holidays
const GOOGLE_CALENDAR_IDS = {
  THAILAND: 'th.th#holiday@group.v.calendar.google.com',
  INDIA: 'en.indian#holiday@group.v.calendar.google.com'
}

// Google Calendar API key (should be in environment variables)
const GOOGLE_CALENDAR_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY

// Cache for holiday data
let holidayCache: Holiday[] | null = null
let cacheExpiry: Date | null = null

// Fetch holidays from Google Calendar API
async function fetchHolidaysFromGoogleCalendar(calendarId: string, country: 'TH' | 'IN'): Promise<Holiday[]> {
  if (!GOOGLE_CALENDAR_API_KEY) {
    console.warn('Google Calendar API key not found, falling back to mock data')
    return getMockHolidaysForCountry(country)
  }

  try {
    const now = new Date()
    const nextYear = new Date(now.getFullYear() + 1, 11, 31) // End of next year

    const timeMin = now.toISOString()
    const timeMax = nextYear.toISOString()

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${GOOGLE_CALENDAR_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`)
    }

    const data = await response.json()

    const holidays: Holiday[] = data.items
      .filter((event: any) => event.start && event.start.date) // Only all-day events
      .map((event: any) => ({
        date: event.start.date, // YYYY-MM-DD format
        name: event.summary,
        country,
        type: 'public' as const, // Google Calendar holidays are typically public
        description: event.description || undefined
      }))

    return holidays
  } catch (error) {
    console.error(`Error fetching holidays for ${country}:`, error)
    return getMockHolidaysForCountry(country) // Fallback to mock data
  }
}

// Get mock holidays as fallback
function getMockHolidaysForCountry(country: 'TH' | 'IN'): Holiday[] {
  return MOCK_HOLIDAYS_2025.filter(h => h.country === country)
}

// Fetch all holidays (Thailand + India)
export async function fetchAllHolidays(): Promise<Holiday[]> {
  // Check cache first
  if (holidayCache && cacheExpiry && new Date() < cacheExpiry) {
    return holidayCache
  }

  try {
    console.log('Fetching holidays from Google Calendar API...')

    const [thailandHolidays, indiaHolidays] = await Promise.all([
      fetchHolidaysFromGoogleCalendar(GOOGLE_CALENDAR_IDS.THAILAND, 'TH'),
      fetchHolidaysFromGoogleCalendar(GOOGLE_CALENDAR_IDS.INDIA, 'IN')
    ])

    const allHolidays = [...thailandHolidays, ...indiaHolidays]

    // Cache for 24 hours
    holidayCache = allHolidays
    cacheExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    console.log(`Fetched ${allHolidays.length} holidays (${thailandHolidays.length} TH, ${indiaHolidays.length} IN)`)

    return allHolidays
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return MOCK_HOLIDAYS_2025 // Complete fallback
  }
}

// Get holidays (async version for components)
export async function getHolidays(): Promise<Holiday[]> {
  if (holidayCache && cacheExpiry && new Date() < cacheExpiry) {
    return holidayCache
  }
  return await fetchAllHolidays()
}

// Mock holiday data for 2025 (fallback only)
const MOCK_HOLIDAYS_2025: Holiday[] = [
  // Thailand Holidays 2025
  { date: '2025-01-01', name: 'New Year\'s Day', country: 'TH', type: 'public' },
  { date: '2025-01-13', name: 'Children\'s Day', country: 'TH', type: 'public' },
  { date: '2025-01-14', name: 'Children\'s Day Observed', country: 'TH', type: 'public' },
  { date: '2025-02-26', name: 'Makha Bucha', country: 'TH', type: 'religious' },
  { date: '2025-04-06', name: 'Chakri Memorial Day', country: 'TH', type: 'public' },
  { date: '2025-04-07', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-08', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-09', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-10', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-11', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-12', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-13', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-14', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-15', name: 'Songkran Festival', country: 'TH', type: 'public' },
  { date: '2025-04-16', name: 'National Holiday', country: 'TH', type: 'public' },
  { date: '2025-05-01', name: 'National Labour Day', country: 'TH', type: 'public' },
  { date: '2025-05-05', name: 'Coronation Day', country: 'TH', type: 'public' },
  { date: '2025-05-12', name: 'Visakha Bucha', country: 'TH', type: 'religious' },
  { date: '2025-06-03', name: 'Queen Suthida\'s Birthday', country: 'TH', type: 'public' },
  { date: '2025-07-28', name: 'King\'s Birthday', country: 'TH', type: 'public' },
  { date: '2025-07-29', name: 'King\'s Birthday Observed', country: 'TH', type: 'public' },
  { date: '2025-08-12', name: 'Queen\'s Birthday', country: 'TH', type: 'public' },
  { date: '2025-08-13', name: 'Queen\'s Birthday Observed', country: 'TH', type: 'public' },
  { date: '2025-10-13', name: 'King Bhumibol Memorial Day', country: 'TH', type: 'public' },
  { date: '2025-10-23', name: 'King Chulalongkorn Memorial Day', country: 'TH', type: 'public' },
  { date: '2025-12-05', name: 'King\'s Birthday', country: 'TH', type: 'public' },
  { date: '2025-12-10', name: 'Constitution Day', country: 'TH', type: 'public' },
  { date: '2025-12-31', name: 'New Year\'s Eve', country: 'TH', type: 'public' },

  // India Holidays 2025
  { date: '2025-01-01', name: 'New Year\'s Day', country: 'IN', type: 'public' },
  { date: '2025-01-14', name: 'Makar Sankranti', country: 'IN', type: 'religious' },
  { date: '2025-01-26', name: 'Republic Day', country: 'IN', type: 'national' },
  { date: '2025-03-14', name: 'Maha Shivaratri', country: 'IN', type: 'religious' },
  { date: '2025-03-25', name: 'Holi', country: 'IN', type: 'religious' },
  { date: '2025-04-10', name: 'Ram Navami', country: 'IN', type: 'religious' },
  { date: '2025-04-14', name: 'Dr. B.R. Ambedkar\'s Birthday', country: 'IN', type: 'public' },
  { date: '2025-04-18', name: 'Good Friday', country: 'IN', type: 'religious' },
  { date: '2025-05-01', name: 'Labour Day', country: 'IN', type: 'public' },
  { date: '2025-05-29', name: 'Buddha Purnima', country: 'IN', type: 'religious' },
  { date: '2025-06-17', name: 'Id-ul-Zuha (Bakrid)', country: 'IN', type: 'religious' },
  { date: '2025-08-15', name: 'Independence Day', country: 'IN', type: 'national' },
  { date: '2025-08-26', name: 'Raksha Bandhan', country: 'IN', type: 'religious' },
  { date: '2025-09-05', name: 'Janmashtami', country: 'IN', type: 'religious' },
  { date: '2025-09-21', name: 'Ganesh Chaturthi', country: 'IN', type: 'religious' },
  { date: '2025-10-02', name: 'Gandhi Jayanti', country: 'IN', type: 'national' },
  { date: '2025-10-20', name: 'Dussehra', country: 'IN', type: 'religious' },
  { date: '2025-10-29', name: 'Diwali', country: 'IN', type: 'religious' },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti', country: 'IN', type: 'religious' },
  { date: '2025-12-25', name: 'Christmas Day', country: 'IN', type: 'religious' },
]

// Utility functions (sync versions for cached data)
export function getHolidayForDate(date: Date, holidays?: Holiday[]): Holiday | null {
  const dateString = date.toISOString().split('T')[0]
  const holidayList = holidays || holidayCache || []
  return holidayList.find(holiday => holiday.date === dateString) || null
}

export function isHoliday(date: Date, holidays?: Holiday[]): boolean {
  return getHolidayForDate(date, holidays) !== null
}

export function getHolidaysForMonth(year: number, month: number, holidays?: Holiday[]): Holiday[] {
  const holidayList = holidays || holidayCache || []
  return holidayList.filter(holiday => {
    const holidayDate = new Date(holiday.date)
    return holidayDate.getFullYear() === year && holidayDate.getMonth() === month
  })
}

// Async utility functions
export async function getHolidayForDateAsync(date: Date): Promise<Holiday | null> {
  const holidays = await getHolidays()
  return getHolidayForDate(date, holidays)
}

export async function isHolidayAsync(date: Date): Promise<boolean> {
  const holidays = await getHolidays()
  return isHoliday(date, holidays)
}

export async function getHolidaysForMonthAsync(year: number, month: number): Promise<Holiday[]> {
  const holidays = await getHolidays()
  return getHolidaysForMonth(year, month, holidays)
}

export function getCountryFlag(country: 'TH' | 'IN'): string {
  return country === 'TH' ? '🇹🇭' : '🇮🇳'
}

export function getCountryName(country: 'TH' | 'IN'): string {
  return country === 'TH' ? 'Thailand' : 'India'
}
