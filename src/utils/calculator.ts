/**
 * Helper to parse time strings into minutes from midnight (0 to 1439).
 * Supports standard formats:
 * - "9", "9:00", "0900", "9:30", "1730", "17:30"
 * - Optional suffixes: "am", "pm", "a", "p" (e.g., "9am", "5:30p", "9:00 PM")
 * 
 * If a customAmPm parameter is provided ("am" | "pm"), it enforces that period override.
 */
export function parseTimeStringToMinutes(timeStr: string, customAmPm?: 'am' | 'pm' | null): number | null {
  if (!timeStr) return null;
  
  let clean = timeStr.trim().toLowerCase();
  
  // Extract and standardise am/pm suffix if present
  let ampm: 'am' | 'pm' | null = null;
  const suffixMatch = clean.match(/(am|pm|a|p)$/);
  
  if (suffixMatch) {
    const matchStr = suffixMatch[0];
    ampm = (matchStr.startsWith('a')) ? 'am' : 'pm';
    clean = clean.replace(/(am|pm|a|p)$/, '').trim();
  } else if (customAmPm) {
    ampm = customAmPm;
  }
  
  let hours = 0;
  let minutes = 0;
  
  if (clean.includes(':')) {
    const parts = clean.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10) || 0;
  } else {
    const val = parseInt(clean, 10);
    if (isNaN(val)) return null;
    
    if (clean.length <= 2) {
      hours = val;
      minutes = 0;
    } else if (clean.length === 3) {
      // E.g., "130" -> 1:30
      hours = Math.floor(val / 100);
      minutes = val % 100;
    } else if (clean.length === 4) {
      // E.g., "1230" -> 12:30, "1745" -> 17:45
      hours = Math.floor(val / 100);
      minutes = val % 100;
    } else {
      return null;
    }
  }
  
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
    return null;
  }
  
  // Process 12-hour or 24-hour calculations
  if (ampm) {
    // 12-hour rules
    if (hours < 1 || hours > 12) {
      // If someone types e.g. "13am", it's invalid
      return null;
    }
    if (ampm === 'pm' && hours < 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
  } else {
    // 24-hour rules: must be within 0-23 range
    if (hours < 0 || hours >= 24) {
      return null;
    }
  }
  
  return hours * 60 + minutes;
}

/**
 * Helper to convert minutes from midnight to a 12-hour display string (e.g., "09:30 AM")
 */
export function formatMinutesToTimeStr(minutes: number, is24h: boolean = false): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const minsStr = mins.toString().padStart(2, '0');
  
  if (is24h) {
    return `${hours.toString().padStart(2, '0')}:${minsStr}`;
  }
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  return `${displayHours}:${minsStr} ${ampm}`;
}

/**
 * Helper to format minutes to HH:MM format for HTML input[type="time"]
 */
export function minutesToInputTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Helper to format minutes as a duration string (e.g., "8h 30m")
 */
export function formatMinutesToDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

export interface CalculationResult {
  isValid: boolean;
  workedMinutes: number;
  workedHours: number; // Decimal hours
  display: string;     // e.g. "8h 30m"
  overnight: boolean;
  error?: string;
}

/**
 * Calculates work hours given start and end times, subtracting break duration.
 * Automatically handles overnight shifts if the end time is before or equal to the start time.
 */
export function calculateWorkHours(
  startStr: string,
  endStr: string,
  breakMins: number = 0,
  startAmPm: 'am' | 'pm' | null = null,
  endAmPm: 'am' | 'pm' | null = null
): CalculationResult {
  if (!startStr || !endStr) {
    return { isValid: false, workedMinutes: 0, workedHours: 0, display: '0h 00m', overnight: false };
  }
  
  const startMins = parseTimeStringToMinutes(startStr, startAmPm);
  const endMins = parseTimeStringToMinutes(endStr, endAmPm);
  
  if (startMins === null || endMins === null) {
    return {
      isValid: false,
      workedMinutes: 0,
      workedHours: 0,
      display: '0h 00m',
      overnight: false,
      error: 'Invalid time format. Use HH:MM, HHMM, or HH.'
    };
  }
  
  let diff = endMins - startMins;
  let overnight = false;
  
  // If end time is before or equal to start time, assume it spans midnight (overnight shift)
  if (diff <= 0) {
    diff += 1440; // Add 24 hours in minutes
    overnight = true;
  }
  
  // Subtract break minutes
  const finalMinutes = diff - breakMins;
  
  if (finalMinutes < 0) {
    return {
      isValid: true, // Inputs are valid, but result is negative
      workedMinutes: 0,
      workedHours: 0,
      display: '0h 00m',
      overnight,
      error: 'Break duration exceeds total elapsed time.'
    };
  }
  
  const decimalHours = Math.round((finalMinutes / 60) * 100) / 100; // Round to 2 decimal places
  
  const displayHours = Math.floor(finalMinutes / 60);
  const displayMins = finalMinutes % 60;
  const displayStr = `${displayHours}h ${displayMins.toString().padStart(2, '0')}m`;
  
  return {
    isValid: true,
    workedMinutes: finalMinutes,
    workedHours: decimalHours,
    display: displayStr,
    overnight
  };
}
