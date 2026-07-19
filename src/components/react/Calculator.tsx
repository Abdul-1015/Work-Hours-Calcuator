import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  Copy, 
  Check, 
  RotateCcw, 
  Download, 
  Calendar, 
  ArrowRight, 
  Info,
  CalendarCheck,
  Moon,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { calculateWorkHours, formatMinutesToTimeStr, formatMinutesToDuration, minutesToInputTime, parseTimeStringToMinutes } from '../../utils/calculator';
import { cn } from '../../lib/utils/cn';

interface TimesheetRow {
  day: string;
  start: string;
  startAmPm: 'am' | 'pm';
  end: string;
  endAmPm: 'am' | 'pm';
  breakMins: string; // stored as string to make typing easier
}

interface CalculatorTranslations {
  singleShift: string;
  weeklyTimesheet: string;
  twelveHour: string;
  twentyFourHour: string;
  shiftParameters: string;
  startTime: string;
  endTime: string;
  breakDuration: string;
  inMinutes: string;
  hourlyWage: string;
  optional: string;
  noBreak: string;
  overnightDetected: string;
  overnightMessage: string;
  resetShift: string;
  totalWorkedTime: string;
  decimalHours: string;
  totalMinutes: string;
  grossElapsed: string;
  breakSubtracted: string;
  hourlyRate: string;
  totalPay: string;
  copyResult: string;
  copied: string;
  weeklyLogs: string;
  monSunTimesheet: string;
  start: string;
  end: string;
  breakMin: string;
  total: string;
  overnight: string;
  weeklySumTotal: string;
  daysLogged: string;
  copyWeeklySummary: string;
  copiedSummary: string;
  exportCSV: string;
  exportedCSV: string;
  resetAllEntries: string;
  noBreakLabel: string;
  days: string[];
}

interface CalculatorProps {
  translations: CalculatorTranslations;
  locale?: string;
}

const DEFAULT_DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function Calculator({ translations: t, locale = 'en' }: CalculatorProps) {
  const DAYS_OF_WEEK = t.days && t.days.length === 7 ? t.days : DEFAULT_DAYS_OF_WEEK;
  const [activeTab, setActiveTab] = useState<'single' | 'weekly'>('single');
  const [is24h, setIs24h] = useState<boolean>(false);
  
  // Single shift state
  const [singleStart, setSingleStart] = useState<string>('09:00');
  const [singleStartAmPm, setSingleStartAmPm] = useState<'am' | 'pm'>('am');
  const [singleEnd, setSingleEnd] = useState<string>('05:30');
  const [singleEndAmPm, setSingleEndAmPm] = useState<'am' | 'pm'>('pm');
  const [singleBreak, setSingleBreak] = useState<string>('30');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [singleHourlyWage, setSingleHourlyWage] = useState<string>('');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  // Weekly timesheet state
  const [weeklyRows, setWeeklyRows] = useState<TimesheetRow[]>(() => 
    DAYS_OF_WEEK.map(day => ({
      day,
      start: day === 'Saturday' || day === 'Sunday' ? '' : '09:00',
      startAmPm: 'am',
      end: day === 'Saturday' || day === 'Sunday' ? '' : '05:30',
      endAmPm: 'pm',
      breakMins: day === 'Saturday' || day === 'Sunday' ? '0' : '30'
    }))
  );
  const [weeklyCopySuccess, setWeeklyCopySuccess] = useState<boolean>(false);
  const [weeklyExportSuccess, setWeeklyExportSuccess] = useState<boolean>(false);
  const [weeklyHourlyWage, setWeeklyHourlyWage] = useState<string>('');
  const [weeklyCurrencySymbol, setWeeklyCurrencySymbol] = useState<string>('$');

  // Auto-calculation for single shift
  const result = calculateWorkHours(
    singleStart,
    singleEnd,
    parseInt(singleBreak, 10) || 0,
    is24h ? null : singleStartAmPm,
    is24h ? null : singleEndAmPm
  );

  // Calculate single shift pay
  const singleWage = parseFloat(singleHourlyWage) || 0;
  const singleTotalPay = result.isValid ? result.workedHours * singleWage : 0;

  // Copy Single Shift Result to Clipboard
  const handleCopySingleResult = () => {
    if (!result.isValid) return;
    const breakStr = singleBreak ? `${singleBreak}m` : '0m';
    let textToCopy = `Work Hours Summary:
- Shift: ${singleStart}${!is24h ? ' ' + singleStartAmPm.toUpperCase() : ''} to ${singleEnd}${!is24h ? ' ' + singleEndAmPm.toUpperCase() : ''}
- Break: ${breakStr}
- Total Worked Time: ${result.display}
- Decimal Hours: ${result.workedHours.toFixed(2)} hrs
- Total Minutes: ${result.workedMinutes} mins`;
    
    if (singleWage > 0) {
      textToCopy += `\n- Hourly Rate: ${currencySymbol}${singleWage.toFixed(2)}/hr
- Total Pay: ${currencySymbol}${singleTotalPay.toFixed(2)}`;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Reset Single Shift
  const handleResetSingle = () => {
    setSingleStart('09:00');
    setSingleStartAmPm('am');
    setSingleEnd('05:30');
    setSingleEndAmPm('pm');
    setSingleBreak('30');
    setSingleHourlyWage('');
  };

  // Preset Break click handler
  const handleBreakPreset = (mins: number) => {
    setSingleBreak(mins.toString());
  };

  // Calculate totals for weekly rows
  const calculatedWeeklyRows = weeklyRows.map(row => {
    if (!row.start || !row.end) {
      return { 
        ...row, 
        workedMinutes: 0, 
        workedHours: 0, 
        display: '-', 
        overnight: false,
        isValid: false 
      };
    }
    const rowRes = calculateWorkHours(
      row.start,
      row.end,
      parseInt(row.breakMins, 10) || 0,
      is24h ? null : row.startAmPm,
      is24h ? null : row.endAmPm
    );
    return {
      ...row,
      workedMinutes: rowRes.workedMinutes,
      workedHours: rowRes.workedHours,
      display: rowRes.display,
      overnight: rowRes.overnight,
      isValid: rowRes.isValid,
      error: rowRes.error
    };
  });

  // Calculate grand weekly totals
  const totalWeeklyMinutes = calculatedWeeklyRows.reduce((sum, r) => sum + r.workedMinutes, 0);
  const totalWeeklyHoursDecimal = Math.round((totalWeeklyMinutes / 60) * 100) / 100;
  const weeklyHours = Math.floor(totalWeeklyMinutes / 60);
  const weeklyMins = totalWeeklyMinutes % 60;
  const totalWeeklyDisplay = `${weeklyHours}h ${weeklyMins.toString().padStart(2, '0')}m`;
  const totalDaysWorked = calculatedWeeklyRows.filter(r => r.workedMinutes > 0).length;

  // Calculate weekly pay
  const weeklyWage = parseFloat(weeklyHourlyWage) || 0;
  const weeklyTotalPay = totalWeeklyHoursDecimal * weeklyWage;

  // Update a specific field in the weekly rows
  const handleWeeklyRowChange = (index: number, field: keyof TimesheetRow, value: string) => {
    const updated = [...weeklyRows];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setWeeklyRows(updated);
  };

  // Reset Weekly Timesheet
  const handleResetWeekly = () => {
    setWeeklyRows(
      DAYS_OF_WEEK.map(day => ({
        day,
        start: day === 'Saturday' || day === 'Sunday' ? '' : '09:00',
        startAmPm: 'am',
        end: day === 'Saturday' || day === 'Sunday' ? '' : '05:30',
        endAmPm: 'pm',
        breakMins: day === 'Saturday' || day === 'Sunday' ? '0' : '30'
      }))
    );
    setWeeklyHourlyWage('');
  };

  // Copy Weekly Result to Clipboard
  const handleCopyWeeklyResult = () => {
    if (totalWeeklyMinutes === 0) return;
    
    let summaryText = `Weekly Timesheet Summary:\n`;
    calculatedWeeklyRows.forEach(row => {
      if (row.workedMinutes > 0) {
        summaryText += `- ${row.day}: ${row.start}${!is24h ? ' ' + row.startAmPm.toUpperCase() : ''} - ${row.end}${!is24h ? ' ' + row.endAmPm.toUpperCase() : ''} (${row.breakMins}m break) -> ${row.display} (${row.workedHours.toFixed(2)} hrs)${row.overnight ? ' [Overnight]' : ''}\n`;
      } else {
        summaryText += `- ${row.day}: Off\n`;
      }
    });
    
    summaryText += `\nWeekly Totals:\n`;
    summaryText += `- Days Worked: ${totalDaysWorked}\n`;
    summaryText += `- Total worked time: ${totalWeeklyDisplay}\n`;
    summaryText += `- Decimal hours: ${totalWeeklyHoursDecimal.toFixed(2)} hrs\n`;
    summaryText += `- Total minutes: ${totalWeeklyMinutes} mins`;
    
    if (weeklyWage > 0) {
      summaryText += `\n\nPay Summary:\n`;
      summaryText += `- Hourly Rate: ${weeklyCurrencySymbol}${weeklyWage.toFixed(2)}/hr\n`;
      summaryText += `- Total Pay: ${weeklyCurrencySymbol}${weeklyTotalPay.toFixed(2)}`;
    }

    navigator.clipboard.writeText(summaryText).then(() => {
      setWeeklyCopySuccess(true);
      setTimeout(() => setWeeklyCopySuccess(false), 2000);
    });
  };

  // Export Weekly Timesheet as CSV
  const handleExportCSV = () => {
    if (totalWeeklyMinutes === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Day,Start Time,End Time,Break (mins),Worked Hours,Decimal Hours,Overnight\n";
    
    calculatedWeeklyRows.forEach(row => {
      const formattedStart = row.start ? `${row.start}${!is24h ? ' ' + row.startAmPm.toUpperCase() : ''}` : '-';
      const formattedEnd = row.end ? `${row.end}${!is24h ? ' ' + row.endAmPm.toUpperCase() : ''}` : '-';
      csvContent += `"${row.day}","${formattedStart}","${formattedEnd}",${row.breakMins},"${row.display}",${row.workedHours},${row.overnight ? "Yes" : "No"}\n`;
    });
    
    csvContent += `\n"TOTALS",,,,"${totalWeeklyDisplay}",${totalWeeklyHoursDecimal},\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "work_hours_timesheet.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setWeeklyExportSuccess(true);
    setTimeout(() => setWeeklyExportSuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6">
      {/* Format Toggles & Tabs Navigation Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-canvas-soft pb-4 dark:border-canvas-soft/10">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-canvas p-1 rounded-xl shadow-xs border border-canvas-soft w-full sm:w-auto dark:bg-[#111311] dark:border-canvas-soft/10" role="tablist">
          <button
            onClick={() => setActiveTab('single')}
            role="tab"
            aria-selected={activeTab === 'single'}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold rounded-lg transition-default cursor-pointer text-center",
              activeTab === 'single'
                ? "bg-ink text-primary dark:bg-primary dark:text-ink"
                : "text-body hover:text-ink hover:bg-canvas-soft dark:text-canvas-soft/70 dark:hover:text-canvas dark:hover:bg-canvas-soft/10"
            )}
          >
            {t.singleShift}
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            role="tab"
            aria-selected={activeTab === 'weekly'}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold rounded-lg transition-default cursor-pointer text-center",
              activeTab === 'weekly'
                ? "bg-ink text-primary dark:bg-primary dark:text-ink"
                : "text-body hover:text-ink hover:bg-canvas-soft dark:text-canvas-soft/70 dark:hover:text-canvas dark:hover:bg-canvas-soft/10"
            )}
          >
            {t.weeklyTimesheet}
          </button>
        </div>

        {/* 12h/24h Selector */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <span className={cn("text-xs font-semibold uppercase tracking-wider", !is24h ? "text-ink dark:text-canvas" : "text-mute dark:text-canvas-soft/50")}>{t.twelveHour}</span>
          <button
            type="button"
            role="switch"
            aria-checked={is24h}
            onClick={() => setIs24h(!is24h)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
              is24h ? "bg-ink dark:bg-primary" : "bg-mute/40 dark:bg-canvas-soft/30"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-canvas shadow-lg ring-0 transition duration-200 ease-in-out",
                is24h ? "translate-x-5 bg-primary dark:bg-ink" : "translate-x-0"
              )}
            />
          </button>
          <span className={cn("text-xs font-semibold uppercase tracking-wider", is24h ? "text-ink dark:text-canvas" : "text-mute dark:text-canvas-soft/50")}>{t.twentyFourHour}</span>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="w-full">
        {activeTab === 'single' ? (
          /* SINGLE SHIFT LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Input Form Panel (Left) */}
            <div className="lg:col-span-7 bg-canvas rounded-xl shadow-xs border border-canvas-soft p-6 md:p-8 flex flex-col justify-between dark:bg-[#111311] dark:border-canvas-soft/10">
              <div>
                <h2 className="text-xl font-bold tracking-tight mb-6 flex items-center gap-2 dark:text-canvas">
                  <Clock className="w-5 h-5 text-primary-neutral" />
                  {t.shiftParameters}
                </h2>

                <div className="space-y-6">
                  {/* Start Time Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <label htmlFor="single-start" className="text-sm font-semibold text-body dark:text-canvas-soft/80">
                      {t.startTime}
                    </label>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <div className="relative flex-1 focus-ring-group flex items-center bg-canvas border border-ink/20 rounded-md overflow-hidden transition-default h-12 dark:bg-[#1a1d1a] dark:border-canvas-soft/20">
                        <input
                          id="single-start"
                          type="text"
                          value={singleStart}
                          onChange={(e) => setSingleStart(e.target.value)}
                          placeholder={is24h ? "e.g., 09:00" : "e.g., 9:00"}
                          className="w-full h-full px-4 text-base bg-transparent text-ink placeholder-mute outline-hidden dark:text-canvas dark:placeholder-canvas-soft/50"
                          aria-label="Shift start time"
                        />
                        <div className="pr-3 flex items-center pointer-events-none">
                          <Clock className="w-4 h-4 text-mute dark:text-canvas-soft/50" />
                        </div>
                      </div>
                      
                      {!is24h && (
                        <div className="flex bg-canvas-soft border border-ink/10 rounded-md p-1 h-12 items-center dark:bg-canvas-soft/10 dark:border-canvas-soft/20">
                          <button
                            type="button"
                            onClick={() => setSingleStartAmPm('am')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-sm transition-default cursor-pointer",
                              singleStartAmPm === 'am' ? "bg-canvas text-ink shadow-xs dark:bg-primary dark:text-ink" : "text-body hover:text-ink dark:text-canvas-soft/70 dark:hover:text-canvas"
                            )}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setSingleStartAmPm('pm')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-sm transition-default cursor-pointer",
                              singleStartAmPm === 'pm' ? "bg-canvas text-ink shadow-xs dark:bg-primary dark:text-ink" : "text-body hover:text-ink dark:text-canvas-soft/70 dark:hover:text-canvas"
                            )}
                          >
                            PM
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* End Time Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <label htmlFor="single-end" className="text-sm font-semibold text-body dark:text-canvas-soft/80">
                      {t.endTime}
                    </label>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <div className="relative flex-1 focus-ring-group flex items-center bg-canvas border border-ink/20 rounded-md overflow-hidden transition-default h-12 dark:bg-[#1a1d1a] dark:border-canvas-soft/20">
                        <input
                          id="single-end"
                          type="text"
                          value={singleEnd}
                          onChange={(e) => setSingleEnd(e.target.value)}
                          placeholder={is24h ? "e.g., 17:30" : "e.g., 5:30"}
                          className="w-full h-full px-4 text-base bg-transparent text-ink placeholder-mute outline-hidden dark:text-canvas dark:placeholder-canvas-soft/50"
                          aria-label="Shift end time"
                        />
                        <div className="pr-3 flex items-center pointer-events-none">
                          <Clock className="w-4 h-4 text-mute dark:text-canvas-soft/50" />
                        </div>
                      </div>
                      
                      {!is24h && (
                        <div className="flex bg-canvas-soft border border-ink/10 rounded-md p-1 h-12 items-center dark:bg-canvas-soft/10 dark:border-canvas-soft/20">
                          <button
                            type="button"
                            onClick={() => setSingleEndAmPm('am')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-sm transition-default cursor-pointer",
                              singleEndAmPm === 'am' ? "bg-canvas text-ink shadow-xs dark:bg-primary dark:text-ink" : "text-body hover:text-ink dark:text-canvas-soft/70 dark:hover:text-canvas"
                            )}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => setSingleEndAmPm('pm')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-sm transition-default cursor-pointer",
                              singleEndAmPm === 'pm' ? "bg-canvas text-ink shadow-xs dark:bg-primary dark:text-ink" : "text-body hover:text-ink dark:text-canvas-soft/70 dark:hover:text-canvas"
                            )}
                          >
                            PM
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Break Duration Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-4 pt-2">
                    <div>
                      <label htmlFor="single-break" className="text-sm font-semibold text-body dark:text-canvas-soft/80">
                        {t.breakDuration}
                      </label>
                      <span className="block text-xs text-mute mt-0.5 dark:text-canvas-soft/50">{t.inMinutes}</span>
                    </div>
                    <div className="md:col-span-2 space-y-3">
                      <div className="relative focus-ring-group flex items-center bg-canvas border border-ink/20 rounded-md overflow-hidden transition-default h-12 dark:bg-[#1a1d1a] dark:border-canvas-soft/20">
                        <input
                          id="single-break"
                          type="number"
                          min="0"
                          max="1440"
                          value={singleBreak}
                          onChange={(e) => setSingleBreak(e.target.value)}
                          placeholder="0"
                          className="w-full h-full px-4 text-base bg-transparent text-ink placeholder-mute outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:text-canvas dark:placeholder-canvas-soft/50"
                          aria-label="Break duration in minutes"
                        />
                        <span className="pr-4 text-sm font-semibold text-body dark:text-canvas-soft/70">{t.inMinutes}</span>
                      </div>
                      
                      {/* Presets */}
                      <div className="flex flex-wrap gap-2">
                        {[0, 15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleBreakPreset(mins)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-md border transition-default cursor-pointer",
                              singleBreak === mins.toString()
                                ? "bg-primary-neutral text-ink border-ink/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30"
                                : "bg-canvas text-body border-ink/10 hover:border-ink/30 hover:text-ink dark:bg-[#1a1d1a] dark:text-canvas-soft/70 dark:border-canvas-soft/20 dark:hover:border-canvas-soft/30 dark:hover:text-canvas"
                            )}
                          >
                            {mins === 0 ? t.noBreakLabel : `${mins}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hourly Wage Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 pt-2">
                    <div>
                      <label htmlFor="single-wage" className="text-sm font-semibold text-body dark:text-canvas-soft/80">
                        {t.hourlyWage}
                      </label>
                      <span className="block text-xs text-mute mt-0.5 dark:text-canvas-soft/50">{t.optional}</span>
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <div className="flex bg-canvas-soft border border-ink/10 rounded-md p-1 h-12 items-center dark:bg-canvas-soft/10 dark:border-canvas-soft/20">
                        {['$', '€', '£', '₹'].map((symbol) => (
                          <button
                            key={symbol}
                            type="button"
                            onClick={() => setCurrencySymbol(symbol)}
                            className={cn(
                              "w-8 h-8 flex items-center justify-center text-xs font-bold rounded-sm transition-default cursor-pointer",
                              currencySymbol === symbol 
                                ? "bg-canvas text-ink shadow-xs dark:bg-primary dark:text-ink" 
                                : "text-body hover:text-ink dark:text-canvas-soft/70 dark:hover:text-canvas"
                            )}
                          >
                            {symbol}
                          </button>
                        ))}
                      </div>
                      <div className="relative flex-1 focus-ring-group flex items-center bg-canvas border border-ink/20 rounded-md overflow-hidden transition-default h-12 dark:bg-[#1a1d1a] dark:border-canvas-soft/20">
                        <input
                          id="single-wage"
                          type="number"
                          min="0"
                          step="0.01"
                          value={singleHourlyWage}
                          onChange={(e) => setSingleHourlyWage(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-full px-4 text-base bg-transparent text-ink placeholder-mute outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:text-canvas dark:placeholder-canvas-soft/50"
                          aria-label="Hourly wage rate"
                        />
                        <span className="pr-4 text-sm font-semibold text-body dark:text-canvas-soft/70">/hr</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overnight shift indicator */}
                {result.isValid && result.overnight && (
                  <div className="mt-6 flex items-start gap-3 bg-primary-pale text-ink-deep p-4 rounded-xl border border-primary-neutral/40 dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                    <Moon className="w-5 h-5 shrink-0 text-positive mt-0.5" />
                    <div>
                      <span className="text-sm font-bold block">{t.overnightDetected}</span>
                      <span className="text-body dark:text-canvas-soft/70">{t.overnightMessage}</span>
                    </div>
                  </div>
                )}

                {/* Inline Errors if invalid inputs */}
                {result.error && (
                  <div className="mt-6 flex items-start gap-3 bg-negative-bg/5 text-negative-darkest p-4 rounded-xl border border-negative-deep/15 dark:bg-negative/10 dark:text-negative dark:border-negative/20">
                    <AlertCircle className="w-5 h-5 shrink-0 text-negative mt-0.5" />
                    <span className="text-sm font-semibold">{result.error}</span>
                  </div>
                )}
              </div>

              {/* Reset button at bottom of panel */}
              <div className="mt-8 pt-4 border-t border-canvas-soft dark:border-canvas-soft/10">
                <button
                  type="button"
                  onClick={handleResetSingle}
                  className="flex items-center gap-2 text-sm font-bold text-body hover:text-ink cursor-pointer transition-default dark:text-canvas-soft/70 dark:hover:text-canvas"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t.resetShift}
                </button>
              </div>
            </div>

            {/* Results Panel (Right - Primary visual focus) */}
            <div className="lg:col-span-5 bg-ink text-canvas rounded-xl shadow-lg p-6 md:p-8 flex flex-col justify-between border border-ink min-h-[400px] relative overflow-hidden dark:bg-[#1a1d1a] dark:border-canvas-soft/10">
              {/* Background accent glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              {/* Calculation Output Area */}
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-mute block mb-2 dark:text-canvas-soft/50">
                  {t.totalWorkedTime}
                </span>
                <div className="flex items-baseline gap-2 mb-8">
                  <h3 className="text-5xl font-wise font-black tracking-tight text-primary tabular-nums">
                    {result.isValid ? result.display : '--h --m'}
                  </h3>
                </div>

                <hr className="border-canvas-soft/10 my-6 dark:border-canvas-soft/5" />

                <div className="space-y-4">
                  {/* Decimal Hours */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-canvas-soft/70">{t.decimalHours}</span>
                    <span className="text-lg font-bold text-canvas font-mono tabular-nums">
                      {result.isValid ? `${result.workedHours.toFixed(2)}h` : '--'}
                    </span>
                  </div>

                  {/* Total Minutes */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-canvas-soft/70">{t.totalMinutes}</span>
                    <span className="text-lg font-bold text-canvas font-mono tabular-nums">
                      {result.isValid ? `${result.workedMinutes}m` : '--'}
                    </span>
                  </div>

                  {/* Breakdown details */}
                  {result.isValid && (
                    <>
                      <div className="flex justify-between items-center text-xs text-canvas-soft/40 pt-2 border-t border-canvas-soft/5 dark:border-canvas-soft/10">
                        <span>{t.grossElapsed}</span>
                        <span className="tabular-nums">
                          {formatMinutesToDuration(result.workedMinutes + (parseInt(singleBreak, 10) || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-canvas-soft/40">
                        <span>{t.breakSubtracted}</span>
                        <span className="tabular-nums">
                          -{parseInt(singleBreak, 10) || 0}m
                        </span>
                      </div>
                    </>
                  )}

                  {/* Pay Calculation */}
                  {result.isValid && singleWage > 0 && (
                    <>
                      <div className="flex justify-between items-center pt-2 border-t border-canvas-soft/5 dark:border-canvas-soft/10">
                        <span className="text-sm text-canvas-soft/70">{t.hourlyRate}</span>
                        <span className="text-sm font-bold text-canvas font-mono tabular-nums">
                          {currencySymbol}{singleWage.toFixed(2)}/hr
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-canvas-soft/70">{t.totalPay}</span>
                        <span className="text-2xl font-bold text-primary font-mono tabular-nums">
                          {currencySymbol}{singleTotalPay.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions Area */}
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={handleCopySingleResult}
                  disabled={!result.isValid}
                  className={cn(
                    "w-full h-12 flex items-center justify-center gap-2 rounded-xl text-base font-bold transition-default cursor-pointer focus:outline-hidden",
                    result.isValid 
                      ? "bg-primary text-ink hover:bg-primary-hover active:bg-primary-neutral" 
                      : "bg-canvas-soft/10 text-canvas-soft/30 cursor-not-allowed dark:bg-canvas-soft/5"
                  )}
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      {t.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      {t.copyResult}
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* WEEKLY TIMESHEET LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Sheet Input Table (Left - Span 8) */}
            <div className="lg:col-span-8 bg-canvas rounded-xl shadow-xs border border-canvas-soft p-6 md:p-8 flex flex-col justify-between dark:bg-[#111311] dark:border-canvas-soft/10">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 dark:text-canvas">
                    <CalendarCheck className="w-5 h-5 text-primary-neutral" />
                    {t.weeklyLogs}
                  </h2>
                  <span className="text-xs text-mute bg-canvas-soft px-3 py-1 rounded-md dark:text-canvas-soft/50 dark:bg-canvas-soft/10">
                    {t.monSunTimesheet}
                  </span>
                </div>

                {/* Table Form for Mobile-First */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {weeklyRows.map((row, idx) => {
                    const parsedRow = calculatedWeeklyRows[idx];
                    
                    return (
                      <div 
                        key={row.day} 
                        className={cn(
                          "p-4 rounded-xl border transition-default",
                          parsedRow.isValid && parsedRow.workedMinutes > 0 
                            ? "bg-primary-pale/20 border-primary-neutral/20 dark:bg-primary/10 dark:border-primary/20" 
                            : "bg-canvas border-canvas-soft dark:bg-[#1a1d1a] dark:border-canvas-soft/10"
                        )}
                      >
                        {/* Day label */}
                        <div className="mb-3">
                          <span className="font-bold text-ink text-base dark:text-canvas">{row.day}</span>
                          {parsedRow.overnight && (
                            <span className="ml-2 text-[10px] bg-primary text-ink-deep font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                              {t.overnight}
                            </span>
                          )}
                        </div>

                        {/* Input Row */}
                        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                          {/* Start Time */}
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-bold text-mute uppercase tracking-wider block dark:text-canvas-soft/50">{t.start}</span>
                            <input
                              type="text"
                              value={row.start}
                              placeholder="e.g. 9:00"
                              onChange={(e) => handleWeeklyRowChange(idx, 'start', e.target.value)}
                              className="w-full h-11 px-3 text-sm bg-canvas border border-ink/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-default placeholder:text-mute/50 dark:bg-[#222522] dark:border-canvas-soft/20 dark:text-canvas dark:placeholder-canvas-soft/40 dark:focus:border-primary"
                              aria-label={`${row.day} start time`}
                            />
                          </div>

                          {/* AM/PM Toggle for Start */}
                          {!is24h && row.start && (
                            <div className="flex bg-canvas-soft rounded-lg p-1 h-11 items-center border border-ink/10 dark:bg-canvas-soft/10 dark:border-canvas-soft/20">
                              <button
                                type="button"
                                onClick={() => handleWeeklyRowChange(idx, 'startAmPm', 'am')}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold rounded-md transition-default cursor-pointer",
                                  row.startAmPm === 'am' ? "bg-canvas text-ink shadow-sm dark:bg-primary dark:text-ink" : "text-body hover:text-ink hover:bg-canvas/50 dark:text-canvas-soft/70 dark:hover:text-canvas"
                                )}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => handleWeeklyRowChange(idx, 'startAmPm', 'pm')}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold rounded-md transition-default cursor-pointer",
                                  row.startAmPm === 'pm' ? "bg-canvas text-ink shadow-sm dark:bg-primary dark:text-ink" : "text-body hover:text-ink hover:bg-canvas/50 dark:text-canvas-soft/70 dark:hover:text-canvas"
                                )}
                              >
                                PM
                              </button>
                            </div>
                          )}

                          {/* End Time */}
                          <div className="flex-1 space-y-1">
                            <span className="text-[10px] font-bold text-mute uppercase tracking-wider block dark:text-canvas-soft/50">{t.end}</span>
                            <input
                              type="text"
                              value={row.end}
                              placeholder="e.g. 5:30"
                              onChange={(e) => handleWeeklyRowChange(idx, 'end', e.target.value)}
                              className="w-full h-11 px-3 text-sm bg-canvas border border-ink/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-default placeholder:text-mute/50 dark:bg-[#222522] dark:border-canvas-soft/20 dark:text-canvas dark:placeholder-canvas-soft/40 dark:focus:border-primary"
                              aria-label={`${row.day} end time`}
                            />
                          </div>

                          {/* AM/PM Toggle for End */}
                          {!is24h && row.end && (
                            <div className="flex bg-canvas-soft rounded-lg p-1 h-11 items-center border border-ink/10 dark:bg-canvas-soft/10 dark:border-canvas-soft/20">
                              <button
                                type="button"
                                onClick={() => handleWeeklyRowChange(idx, 'endAmPm', 'am')}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold rounded-md transition-default cursor-pointer",
                                  row.endAmPm === 'am' ? "bg-canvas text-ink shadow-sm dark:bg-primary dark:text-ink" : "text-body hover:text-ink hover:bg-canvas/50 dark:text-canvas-soft/70 dark:hover:text-canvas"
                                )}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => handleWeeklyRowChange(idx, 'endAmPm', 'pm')}
                                className={cn(
                                  "px-3 py-1.5 text-xs font-bold rounded-md transition-default cursor-pointer",
                                  row.endAmPm === 'pm' ? "bg-canvas text-ink shadow-sm dark:bg-primary dark:text-ink" : "text-body hover:text-ink hover:bg-canvas/50 dark:text-canvas-soft/70 dark:hover:text-canvas"
                                )}
                              >
                                PM
                              </button>
                            </div>
                          )}

                          {/* Break Input */}
                          <div className="w-24 space-y-1">
                            <span className="text-[10px] font-bold text-mute uppercase tracking-wider block dark:text-canvas-soft/50">{t.breakMin}</span>
                            <input
                              type="number"
                              min="0"
                              value={row.breakMins}
                              onChange={(e) => handleWeeklyRowChange(idx, 'breakMins', e.target.value)}
                              placeholder="0"
                              disabled={!row.start || !row.end}
                              className="w-full h-11 px-3 text-sm bg-canvas border border-ink/20 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-hidden transition-default placeholder:text-mute/50 disabled:opacity-50 disabled:bg-canvas-soft [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:bg-[#222522] dark:border-canvas-soft/20 dark:text-canvas dark:placeholder-canvas-soft/40 dark:focus:border-primary dark:disabled:bg-canvas-soft/10"
                              aria-label={`${row.day} break minutes`}
                            />
                          </div>

                          {/* Calculated Day Total */}
                          <div className="w-24 text-right space-y-1">
                            <span className="text-[10px] font-bold text-mute uppercase tracking-wider block dark:text-canvas-soft/50">{t.total}</span>
                            <div className="h-11 flex items-center justify-end">
                              <span className={cn(
                                "text-sm font-bold tabular-nums",
                                parsedRow.workedMinutes > 0 ? "text-ink dark:text-canvas" : "text-mute dark:text-canvas-soft/50"
                              )}>
                                {parsedRow.display}
                              </span>
                            </div>
                            {parsedRow.workedMinutes > 0 && (
                              <span className="text-[11px] text-mute block tabular-nums dark:text-canvas-soft/50">
                                {parsedRow.workedHours.toFixed(2)}h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hourly Wage Input */}
              <div className="mt-6 pt-4 border-t border-canvas-soft dark:border-canvas-soft/10">
                <label htmlFor="weekly-wage" className="text-sm font-semibold text-body dark:text-canvas-soft/80 block mb-2">
                  {t.hourlyWage}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex bg-canvas-soft border border-ink/10 rounded-md p-0.5 h-10 items-center dark:bg-canvas-soft/10 dark:border-canvas-soft/20">
                    {['$', '€', '£', '₹'].map((symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => setWeeklyCurrencySymbol(symbol)}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center text-[10px] font-bold rounded-sm transition-default cursor-pointer",
                          weeklyCurrencySymbol === symbol 
                            ? "bg-canvas text-ink shadow-xs dark:bg-primary dark:text-ink" 
                            : "text-body hover:text-ink dark:text-canvas-soft/70 dark:hover:text-canvas"
                        )}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1 focus-ring-group flex items-center bg-canvas border border-ink/15 rounded-md overflow-hidden transition-default h-10 dark:bg-[#1a1d1a] dark:border-canvas-soft/20">
                    <input
                      id="weekly-wage"
                      type="number"
                      min="0"
                      step="0.01"
                      value={weeklyHourlyWage}
                      onChange={(e) => setWeeklyHourlyWage(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-full px-3 text-sm bg-transparent text-ink placeholder-mute outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:text-canvas dark:placeholder-canvas-soft/50"
                      aria-label="Weekly hourly wage rate"
                    />
                    <span className="pr-3 text-xs font-semibold text-body dark:text-canvas-soft/70">/hr</span>
                  </div>
                </div>
              </div>

              {/* Reset Timesheet at bottom */}
              <div className="mt-6 pt-4 border-t border-canvas-soft dark:border-canvas-soft/10">
                <button
                  type="button"
                  onClick={handleResetWeekly}
                  className="flex items-center gap-2 text-sm font-bold text-body hover:text-ink cursor-pointer transition-default dark:text-canvas-soft/70 dark:hover:text-canvas"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t.resetAllEntries}
                </button>
              </div>
            </div>

            {/* Results Panel (Right - Span 4) */}
            <div className="lg:col-span-4 bg-ink text-canvas rounded-xl shadow-lg p-6 md:p-8 flex flex-col justify-between border border-ink min-h-[400px] relative overflow-hidden dark:bg-[#1a1d1a] dark:border-canvas-soft/10">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-mute block mb-2 dark:text-canvas-soft/50">
                  {t.weeklySumTotal}
                </span>
                <div className="flex items-baseline gap-2 mb-8">
                  <h3 className="text-5xl font-wise font-black tracking-tight text-primary tabular-nums">
                    {totalWeeklyMinutes > 0 ? totalWeeklyDisplay : '0h 00m'}
                  </h3>
                </div>

                <hr className="border-canvas-soft/10 my-6 dark:border-canvas-soft/5" />

                <div className="space-y-4">
                  {/* Worked Days count */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-canvas-soft/70">{t.daysLogged}</span>
                    <span className="text-lg font-bold text-canvas font-mono tabular-nums">
                      {totalDaysWorked} / 7
                    </span>
                  </div>

                  {/* Decimal Hours */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-canvas-soft/70">{t.decimalHours}</span>
                    <span className="text-lg font-bold text-canvas font-mono tabular-nums">
                      {totalWeeklyMinutes > 0 ? `${totalWeeklyHoursDecimal.toFixed(2)}h` : '0.00h'}
                    </span>
                  </div>

                  {/* Total Minutes */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-canvas-soft/70">{t.totalMinutes}</span>
                    <span className="text-lg font-bold text-canvas font-mono tabular-nums">
                      {totalWeeklyMinutes > 0 ? `${totalWeeklyMinutes}m` : '0m'}
                    </span>
                  </div>

                  {/* Weekly Pay Calculation */}
                  {totalWeeklyMinutes > 0 && weeklyWage > 0 && (
                    <>
                      <div className="flex justify-between items-center pt-2 border-t border-canvas-soft/5 dark:border-canvas-soft/10">
                        <span className="text-sm text-canvas-soft/70">{t.hourlyRate}</span>
                        <span className="text-sm font-bold text-canvas font-mono tabular-nums">
                          {weeklyCurrencySymbol}{weeklyWage.toFixed(2)}/hr
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-canvas-soft/70">{t.totalPay}</span>
                        <span className="text-2xl font-bold text-primary font-mono tabular-nums">
                          {weeklyCurrencySymbol}{weeklyTotalPay.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions Area */}
              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  onClick={handleCopyWeeklyResult}
                  disabled={totalWeeklyMinutes === 0}
                  className={cn(
                    "w-full h-12 flex items-center justify-center gap-2 rounded-xl text-base font-bold transition-default cursor-pointer focus:outline-hidden",
                    totalWeeklyMinutes > 0
                      ? "bg-primary text-ink hover:bg-primary-hover active:bg-primary-neutral" 
                      : "bg-canvas-soft/10 text-canvas-soft/30 cursor-not-allowed dark:bg-canvas-soft/5"
                  )}
                >
                  {weeklyCopySuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      {t.copiedSummary}
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      {t.copyWeeklySummary}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={totalWeeklyMinutes === 0}
                  className={cn(
                    "w-full h-12 flex items-center justify-center gap-2 rounded-xl text-base font-bold border transition-default cursor-pointer focus:outline-hidden",
                    totalWeeklyMinutes > 0
                      ? "bg-transparent text-canvas border-canvas-soft/20 hover:border-canvas hover:bg-canvas/5 active:bg-canvas/10"
                      : "border-canvas-soft/10 text-canvas-soft/30 cursor-not-allowed dark:border-canvas-soft/10"
                  )}
                >
                  {weeklyExportSuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      {t.exportedCSV}
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      {t.exportCSV}
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
