import { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertTriangle,
  Trophy,
  TrendingDown,
  BarChart3,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MonthlyTargets from './MonthlyTargets';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const colors = {
  card: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none transition-all duration-200',
  border: 'border-slate-200 dark:border-slate-800 transition-colors duration-200',
};
const borderRadius = { xl: 'rounded-lg', xxl: 'rounded-xl', xxxl: 'rounded-2xl' };
const shadows = { md: 'shadow-md' };

// ─── Utility Functions ────────────────────────────────────────────────────────
function formatIndoNumber(value) {
  if (value === undefined || value === null || value === '') return '..........';
  const num = Number(value);
  if (isNaN(num)) return '..........';
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function getYearString(dateStr) {
  if (!dateStr) return '2026';
  return dateStr.split('-')[0] || '2026';
}

function getDaysInMonth(dateStr) {
  if (!dateStr) return 30;
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), 0).getDate();
}

function getIndonesianMonthName(dateStr) {
  if (!dateStr) return '';
  const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1;
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return months[monthIndex] || '';
}

function normalizeDateString(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal !== 'string') {
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch {
      // Ignored
    }
    return '';
  }
  const str = dateVal.trim();
  if (!str) return '';
  const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  const idMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (idMatch) return `${idMatch[3]}-${idMatch[2].padStart(2, '0')}-${idMatch[1].padStart(2, '0')}`;
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  } catch {
    // Ignored
  }
  return str;
}

function isDateWorkingDay(year, monthIndex, day, checklist) {
  const date = new Date(year, monthIndex, day);
  const dayOfWeek = date.getDay();
  const { monFri = true, sat = true, sun = true } = checklist || {};
  
  if (dayOfWeek >= 1 && dayOfWeek <= 5) return monFri;
  if (dayOfWeek === 6) return sat;
  if (dayOfWeek === 0) return sun;
  return true;
}

function getWorkingDaysCount(year, monthIndex, checklist) {
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= totalDays; d++) {
    if (isDateWorkingDay(year, monthIndex, d, checklist)) {
      workingDays++;
    }
  }
  return workingDays;
}

// ─── ProgressRing Component ───────────────────────────────────────────────────
function ProgressRing({ percentage, size = 60, strokeWidth = 5, colorClass = 'text-emerald-500' }) {
  const cleanPercentage = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (cleanPercentage / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle className="text-slate-200 dark:text-slate-800" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <circle className={`${colorClass} transition-all duration-500 ease-out`} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
      </svg>
      <span className="absolute text-[10px] font-extrabold text-slate-800 dark:text-slate-100">{Math.round(percentage)}%</span>
    </div>
  );
}

// ─── Main DashboardAnalytics Component ───────────────────────────────────────
export default function DashboardAnalytics({ targets, realization, execSummary, workingDays, backendUrl, subTab = 'kpi' }) {
  const [logs, setLogs] = useState([]);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [compositionMetric, setCompositionMetric] = useState('golongan');
  const [granularity, setGranularity] = useState('bulan');
  const [monthlyTargets, setMonthlyTargets] = useState(Array(12).fill(0));
  const [selectedTargetYear, setSelectedTargetYear] = useState(() => {
    return targets?.date ? targets.date.split('-')[0] : String(new Date().getFullYear());
  });
  const [targetLoading, setTargetLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState('current');
  const [yoyPage, setYoYPage] = useState(1);
  const [hoveredYoyMonth, setHoveredYoyMonth] = useState(null);
  const [yoyTooltipPos, setYoyTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [segmentTooltipPos, setSegmentTooltipPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const chartScrollRef = useRef(null);
  const yoyChartScrollRef = useRef(null);

  const parts = targets?.date ? targets.date.split('-') : [String(new Date().getFullYear()), String(new Date().getMonth() + 1).padStart(2, '0'), String(new Date().getDate()).padStart(2, '0')];
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
  const day = parseInt(parts[2], 10) || new Date().getDate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (chartScrollRef.current) {
      const container = chartScrollRef.current;
      const timer = setTimeout(() => {
        if (granularity === 'bulan') {
          const isSemester2 = month > 6;
          if (isSemester2) {
            container.scrollLeft = container.scrollWidth / 2;
          } else {
            container.scrollLeft = 0;
          }
        } else if (granularity === 'hari') {
          const daysCount = getDaysInMonth(targets.date);
          const scrollRatio = (day - 1.5) / daysCount;
          container.scrollLeft = Math.max(0, scrollRatio * container.scrollWidth - container.clientWidth / 2);
        } else {
          container.scrollLeft = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [granularity, month, day, targets.date, isMobile, subTab]);

  // Sync yoyChartScrollRef position on mobile view for current semester
  useEffect(() => {
    if (yoyChartScrollRef.current && subTab === 'summary') {
      const container = yoyChartScrollRef.current;
      const timer = setTimeout(() => {
        const isSemester2 = month > 6;
        if (isSemester2) {
          container.scrollLeft = container.scrollWidth / 2;
        } else {
          container.scrollLeft = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [month, isMobile, subTab]);

  useEffect(() => {
    if (targets?.date) {
      const dateParts = targets.date.split('-');
      const currentMonth = parseInt(dateParts[1], 10) || (new Date().getMonth() + 1);
      const targetPage = currentMonth <= 6 ? 1 : 2;
      const timer = setTimeout(() => {
        setYoYPage(targetPage);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [targets?.date]);

  const activeWorkingDaysChecklist = useMemo(() => {
    if (workingDays && typeof workingDays === 'object') {
      return workingDays;
    }
    if (workingDays && typeof workingDays === 'string') {
      if (workingDays === '5') return { monFri: true, sat: false, sun: false };
      if (workingDays === '6') return { monFri: true, sat: true, sun: false };
      return { monFri: true, sat: true, sun: true };
    }
    const saved = localStorage.getItem('p2tl_working_days_checklist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignored
      }
    }
    const oldSetting = localStorage.getItem('p2tl_working_days') || '7';
    if (oldSetting === '5') return { monFri: true, sat: false, sun: false };
    if (oldSetting === '6') return { monFri: true, sat: true, sun: false };
    return { monFri: true, sat: true, sun: true };
  }, [workingDays]);

  // Fetch Realisasi logs from the backend
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
        if (!url) {
          const cached = localStorage.getItem('p2tl_logs_cache');
          if (cached) setLogs(JSON.parse(cached));
          return;
        }
        const response = await fetch(`${url}?action=get_logs&page=1&limit=120&sort=date_desc`);
        const result = await response.json();
        if (result.status === 'success' && Array.isArray(result.data)) {
          setLogs(result.data);
          localStorage.setItem('p2tl_logs_cache', JSON.stringify(result.data));
        } else {
          const cached = localStorage.getItem('p2tl_logs_cache');
          if (cached) setLogs(JSON.parse(cached));
        }
      } catch (err) {
        console.warn('Gagal memuat log:', err);
        const cached = localStorage.getItem('p2tl_logs_cache');
        if (cached) {
          try {
            setLogs(JSON.parse(cached));
          } catch {
            // Ignored
          }
        }
      }
    };
    fetchLogs();
  }, [backendUrl]);

  // Fetch monthly targets based on centralized selectedTargetYear
  useEffect(() => {
    let active = true;
    const fetchMonthlyTargets = async () => {
      const yearVal = selectedTargetYear;
      if (!yearVal) return;
      const cacheKey = `p2tl_monthly_targets_cache_${yearVal}`;
      
      // 1. Instantly load from cache to prevent empty state
      const cached = localStorage.getItem(cacheKey);
      let cacheLoaded = false;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const mappedTargets = Array(12).fill(0);
          parsed.forEach(item => {
            const mIdx = Number(item.Month) - 1;
            if (mIdx >= 0 && mIdx < 12) mappedTargets[mIdx] = Number(item.Target_kWh) || 0;
          });
          if (active) {
            setMonthlyTargets(mappedTargets);
          }
          cacheLoaded = true;
        } catch {
          // ignore
        }
      }

      // Only show loading if we don't have cached data to keep UI smooth
      if (!cacheLoaded && active) {
        setTargetLoading(true);
      }

      try {
        const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
        if (url) {
          const response = await fetch(`${url}?action=get_monthly_targets&year=${yearVal}`);
          if (!response.ok) throw new Error('Network response not ok');
          const result = await response.json();
          if (result.status === 'success' && Array.isArray(result.data) && active) {
            localStorage.setItem(cacheKey, JSON.stringify(result.data));
            const mappedTargets = Array(12).fill(0);
            result.data.forEach(item => {
              const mIdx = Number(item.Month) - 1;
              if (mIdx >= 0 && mIdx < 12) mappedTargets[mIdx] = Number(item.Target_kWh) || 0;
            });
            setMonthlyTargets(mappedTargets);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat target bulanan dari network:', err);
        // Only reset if we didn't load from cache
        if (!cacheLoaded && active) {
          setMonthlyTargets(Array(12).fill(0));
        }
      } finally {
        if (active) {
          setTargetLoading(false);
        }
      }
    };
    fetchMonthlyTargets();
    return () => {
      active = false;
    };
  }, [selectedTargetYear, backendUrl]);

  // Sync selectedTargetYear back to dashboard year when navigating away from targets tab
  useEffect(() => {
    if (subTab !== 'targets' && targets?.date) {
      const dashboardYear = targets.date.split('-')[0] || String(new Date().getFullYear());
      setTimeout(() => {
        setSelectedTargetYear(dashboardYear);
      }, 0);
    }
  }, [subTab, targets?.date]);

  if (!targets || !realization || !execSummary) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400 font-semibold text-sm">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          <p>Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  const workingDaysInMonth = getWorkingDaysCount(year, month - 1, activeWorkingDaysChecklist);
  const targetMonth = monthlyTargets[month - 1] ?? 0;

  // Dynamic adjusted daily target calculation (matching menu laporan & ringkasan)
  const isSemester1Active = month <= 6;
  const totalTargetYear = monthlyTargets.reduce((s, v) => s + v, 0);
  const targetPeriod = isSemester1Active
    ? monthlyTargets.slice(0, 6).reduce((s, v) => s + v, 0)
    : totalTargetYear;
  const totalRealYear = execSummary.totalKwhYear || 0;
  const sisaTarget = Math.max(0, targetPeriod - totalRealYear);

  let remainingWorkingDays = 0;
  const totalDaysInCurrentMonth = new Date(year, month, 0).getDate();
  for (let d = day; d <= totalDaysInCurrentMonth; d++) {
    if (isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist)) {
      remainingWorkingDays++;
    }
  }
  const endMonthIndex = isSemester1Active ? 6 : 12;
  for (let m = month; m < endMonthIndex; m++) {
    remainingWorkingDays += getWorkingDaysCount(year, m, activeWorkingDaysChecklist);
  }
  remainingWorkingDays = Math.max(1, remainingWorkingDays);

  const dynamicTargetHarian = remainingWorkingDays > 0 ? Math.round(sisaTarget / remainingWorkingDays) : 0;

  // Use targets.targetHarianKwh if it has a saved value, otherwise fall back to the dynamic adjusted target
  const targetHarianCalculated = targets.targetHarianKwh > 0 ? targets.targetHarianKwh : dynamicTargetHarian;
  const targetKumulatifCalculated = monthlyTargets.slice(0, month).reduce((sum, val) => sum + val, 0);

  const relHarian = realization.realisasiHarianKwh === '' ? 0 : Number(realization.realisasiHarianKwh || 0);
  const relKumulatif = realization.realisasiKumulatifKwh === '' ? 0 : Number(realization.realisasiKumulatifKwh || 0);
  const harianPercent = targetHarianCalculated > 0 ? (relHarian / targetHarianCalculated) * 100 : 0;
  const kumulatifPercent = targetKumulatifCalculated > 0 ? (relKumulatif / targetKumulatifCalculated) * 100 : 0;

  // Chart data calculation
  const getChartDataForGranularity = () => {
    if (granularity === 'hari') {
      const daysCount = getDaysInMonth(targets.date);
      return Array.from({ length: daysCount }, (_, i) => {
        const d = i + 1;
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const logEntry = logs.find(log => normalizeDateString(log.Date || log.date || '') === dStr);
        const kwhReal = logEntry ? (Number(logEntry.Realisasi_Harian_kWh || logEntry.realisasiHarianKwh) || 0) : 0;
        let cases = 0;
        if (logEntry) {
          cases = (Number(logEntry.Realisasi_LKBK_Plg || logEntry.realisasiLkbkPlg) || 0) +
            (Number(logEntry.Realisasi_3Phasa_Plg || logEntry.realisasi3PhasaPlg) || 0) +
            (Number(logEntry.Realisasi_DLPD_Plg || logEntry.realisasiDlpdPlg) || 0) +
            (Number(logEntry.Realisasi_Pengembangan_Plg || logEntry.realisasiPengembanganPlg) || 0) +
            (Number(logEntry.Realisasi_TS_Periodik_Plg || logEntry.realisasiTsPeriodikPlg) || 0) +
            (Number(logEntry.Realisasi_TS_Macet_Plg || logEntry.realisasiTsMacetPlg) || 0) +
            (Number(logEntry.Realisasi_Lainnya_Plg || logEntry.realisasiLainnyaPlg) || 0);
        }
        const isDayWorking = isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist);
        return { label: `${d}`, kwh: kwhReal, target: isDayWorking ? Math.round(targetMonth / workingDaysInMonth) : 0, cases };
      });
    }

    if (granularity === 'minggu') {
      const daysCount = getDaysInMonth(targets.date);
      const ranges = [
        { w: 1, start: 1, end: 7 }, { w: 2, start: 8, end: 14 },
        { w: 3, start: 15, end: 21 }, { w: 4, start: 22, end: 28 },
        { w: 5, start: 29, end: daysCount }
      ];
      return ranges.map(r => {
        let weeklyReal = 0, weeklyCases = 0, weeklyTarget = 0;
        for (let d = r.start; d <= r.end; d++) {
          const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const logEntry = logs.find(log => normalizeDateString(log.Date || log.date || '') === dStr);
          if (logEntry) {
            weeklyReal += Number(logEntry.Realisasi_Harian_kWh || logEntry.realisasiHarianKwh) || 0;
            weeklyCases += (Number(logEntry.Realisasi_LKBK_Plg || logEntry.realisasiLkbkPlg) || 0) +
              (Number(logEntry.Realisasi_3Phasa_Plg || logEntry.realisasi3PhasaPlg) || 0) +
              (Number(logEntry.Realisasi_DLPD_Plg || logEntry.realisasiDlpdPlg) || 0) +
              (Number(logEntry.Realisasi_Pengembangan_Plg || logEntry.realisasiPengembanganPlg) || 0) +
              (Number(logEntry.Realisasi_TS_Periodik_Plg || logEntry.realisasiTsPeriodikPlg) || 0) +
              (Number(logEntry.Realisasi_TS_Macet_Plg || logEntry.realisasiTsMacetPlg) || 0) +
              (Number(logEntry.Realisasi_Lainnya_Plg || logEntry.realisasiLainnyaPlg) || 0);
          }
          if (isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist)) {
            weeklyTarget += Math.round(targetMonth / workingDaysInMonth);
          }
        }
        return { label: `W${r.w}`, kwh: weeklyReal, target: weeklyTarget, cases: weeklyCases };
      });
    }

    const trend = execSummary?.monthlyTrend || [];
    return trend.map((m, idx) => ({
      label: m.month, kwh: m.kwh, target: monthlyTargets[idx] ?? 0, cases: m.cases
    }));
  };

  const currentChartData = getChartDataForGranularity();
  const dateParts = targets.date ? targets.date.split('-') : [];
  const paramMonth = parseInt(dateParts[1], 10) - 1;
  const isSemester1 = paramMonth <= 5;
  const semesterLabel = isSemester1 ? 'Semester I' : 'Semester II';
  const targetSemester = isSemester1 ? monthlyTargets.slice(0, 6).reduce((s, v) => s + v, 0) : monthlyTargets.slice(6, 12).reduce((s, v) => s + v, 0);
  const trend = execSummary?.monthlyTrend || [];
  const realSemester = isSemester1 ? trend.slice(0, 6).reduce((s, m) => s + (Number(m.kwh) || 0), 0) : trend.slice(6, 12).reduce((s, m) => s + (Number(m.kwh) || 0), 0);
  const semesterPercent = targetSemester > 0 ? (realSemester / targetSemester) * 100 : 0;
  const currentYear = getYearString(targets.date);
  const targetBulanKwh = targetMonth;
  const currentMonthName = getIndonesianMonthName(targets.date);
  const relBulan = execSummary?.monthlyTrend?.[month - 1]?.kwh || 0;
  const bulanPercent = targetBulanKwh > 0 ? (relBulan / targetBulanKwh) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* ── TAB 1: KPI & BREAKDOWN ─────────────────────────────────────────── */}
      {subTab === 'kpi' && (
        <>
          {/* KPI Metrics — Responsive Grid: Hero + Supporting */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 sm:gap-4">
            {/* Hero: Kinerja Harian (primary focus) — spans 2 cols on desktop */}
            <div className={`lg:col-span-2 p-4 sm:p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Kinerja Hari Ini</span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">{formatIndoNumber(relHarian)}</span>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">kWh</span>
                    <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-lg ${
                      harianPercent >= 100
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : harianPercent >= 50
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}>{Math.round(harianPercent)}%</span>
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">Target harian: {formatIndoNumber(targetHarianCalculated)} kWh</div>
                </div>
                <ProgressRing percentage={harianPercent} size={64} strokeWidth={5} colorClass={harianPercent >= 100 ? 'text-emerald-500' : harianPercent >= 50 ? 'text-amber-500' : 'text-rose-500'} />
              </div>
            </div>

            {/* Supporting Metrics: 3-col sub-grid on mobile, individual cells on desktop */}
            <div className="grid grid-cols-3 lg:col-span-3 lg:grid-cols-3 gap-2 sm:gap-4">
              {/* Bulanan */}
              <div className={`p-4 sm:p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col justify-between`}>
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="text-[10px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Bulanan</div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-none">{formatIndoNumber(relBulan)}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block">Target: {formatIndoNumber(targetBulanKwh)} kWh</div>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                  <div className="flex-1 h-1 sm:h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${bulanPercent >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, bulanPercent)}%` }} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{Math.round(bulanPercent)}%</span>
                </div>
              </div>

              {/* Semester */}
              <div className={`p-4 sm:p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col justify-between`}>
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="text-[10px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">{semesterLabel}</div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-none">{formatIndoNumber(realSemester)}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block">Target: {formatIndoNumber(targetSemester)} kWh</div>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                  <div className="flex-1 h-1 sm:h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${semesterPercent >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, semesterPercent)}%` }} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{Math.round(semesterPercent)}%</span>
                </div>
              </div>

              {/* Kumulatif */}
              <div className={`p-4 sm:p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col justify-between`}>
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="text-[10px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">Kumulatif</div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-none">{formatIndoNumber(relKumulatif)}</div>
                  <div className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:block">Target: {formatIndoNumber(targetKumulatifCalculated)} kWh</div>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3">
                  <div className="flex-1 h-1 sm:h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${kumulatifPercent >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, kumulatifPercent)}%` }} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{Math.round(kumulatifPercent)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown & Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Donut Chart - Komposisi Temuan */}
            <div className={`lg:col-span-2 p-4 sm:p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col justify-between relative`}>
              <div>
                <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Komposisi Temuan</span>
                  </h3>
                  <select
                    value={compositionMetric}
                    onChange={(e) => setCompositionMetric(e.target.value)}
                    className="px-2.5 py-1.5 text-[11px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:border-emerald-500 transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    <option value="tarif">Tarif</option>
                    <option value="golongan">Golongan</option>
                    <option value="daya">Daya</option>
                  </select>
                </div>

                {(() => {
                  const getActiveDataset = () => {
                    if (compositionMetric === 'golongan') return execSummary.golonganBreakdown || [];
                    if (compositionMetric === 'daya') return execSummary.dayaBreakdown || [];
                    return execSummary.tariffBreakdown || [];
                  };
                  const activeDataset = getActiveDataset();
                  const totalCases = activeDataset.reduce((sum, item) => sum + item.cases, 0);

                  const getLabelName = (itemClass) => {
                    if (compositionMetric === 'tarif') {
                      const map = { 'R': 'Tarif R', 'B': 'Tarif B', 'S': 'Tarif S', 'I': 'Tarif I', 'P': 'Tarif P' };
                      return map[itemClass] || 'Lainnya';
                    }
                    if (compositionMetric === 'golongan') {
                      const map = { 'P1': 'Golongan P1', 'P2': 'Golongan P2', 'P3': 'Golongan P3', 'P4': 'Golongan P4', 'K2': 'Golongan K2' };
                      return map[itemClass] || 'Lainnya';
                    }
                    return itemClass;
                  };

                  const getSliceColor = (itemClass) => {
                    if (compositionMetric === 'tarif') {
                      const map = { 'R': '#10b981', 'B': '#3b82f6', 'S': '#6366f1', 'I': '#f59e0b', 'P': '#f43f5e' };
                      return map[itemClass] || '#64748b';
                    }
                    if (compositionMetric === 'golongan') {
                      const map = { 'P1': '#10b981', 'P2': '#3b82f6', 'P3': '#6366f1', 'P4': '#f59e0b', 'K2': '#f43f5e' };
                      return map[itemClass] || '#64748b';
                    }
                    const map = { '450 VA': '#10b981', '900 VA': '#3b82f6', '1300 VA': '#6366f1', '2200 VA': '#f59e0b', '> 2200 VA': '#f43f5e' };
                    return map[itemClass] || '#64748b';
                  };

                  const getTailwindColor = (itemClass) => {
                    if (compositionMetric === 'tarif') {
                      const map = { 'R': 'bg-emerald-500', 'B': 'bg-blue-500', 'S': 'bg-indigo-500', 'I': 'bg-amber-500', 'P': 'bg-rose-500' };
                      return map[itemClass] || 'bg-slate-400';
                    }
                    if (compositionMetric === 'golongan') {
                      const map = { 'P1': 'bg-emerald-500', 'P2': 'bg-blue-500', 'P3': 'bg-indigo-500', 'P4': 'bg-amber-500', 'K2': 'bg-rose-500' };
                      return map[itemClass] || 'bg-slate-400';
                    }
                    const map = { '450 VA': 'bg-emerald-500', '900 VA': 'bg-blue-500', '1300 VA': 'bg-indigo-500', '2200 VA': 'bg-amber-500', '> 2200 VA': 'bg-rose-500' };
                    return map[itemClass] || 'bg-slate-400';
                  };

                  if (activeDataset.length === 0 || totalCases === 0) {
                    return <div className="flex items-center justify-center text-xs text-slate-500 py-12">Tidak ada data komposisi temuan.</div>;
                  }

                  let accumulatedPercent = 0;
                  const donutSegments = activeDataset.map((t) => {
                    const percent = totalCases > 0 ? (t.cases / totalCases) * 100 : 0;
                    const strokeDasharray = `${(percent / 100) * 251.327} ${251.327}`;
                    const strokeDashoffset = -((accumulatedPercent / 100) * 251.327);
                    accumulatedPercent += percent;
                    return { ...t, percent, strokeDasharray, strokeDashoffset, color: getSliceColor(t.class), twColor: getTailwindColor(t.class) };
                  });

                  return (
                    <div className="flex flex-col w-full py-1 flex-grow justify-between">
                      <div>
                        {/* Total Summary Row */}
                        <div className="flex items-center justify-between mb-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 p-4 rounded-xl">
                          <div>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Kasus</span>
                            <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 mt-1">{totalCases} Kasus</div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Energi</span>
                            <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                              {formatIndoNumber(activeDataset.reduce((s, d) => s + (d.kwh || 0), 0))} kWh
                            </div>
                          </div>
                        </div>

                        {/* Linear Segmented Progress Bar */}
                        <div className="w-full mb-4 px-0.5">
                          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded-full flex overflow-hidden shadow-inner">
                            {donutSegments.map((seg, idx) => (
                              seg.percent > 0 && (
                                <div
                                  key={idx}
                                  style={{ width: `${seg.percent}%`, backgroundColor: seg.color }}
                                  className="h-full transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full hover:opacity-90 cursor-pointer"
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const container = e.currentTarget.closest('.relative');
                                    if (container) {
                                      const containerRect = container.getBoundingClientRect();
                                      const x = (rect.left + rect.width / 2) - containerRect.left;
                                      const y = rect.top - containerRect.top;
                                      
                                      // Determine boundary-aware alignment
                                      let align = 'center';
                                      if (x < 110) {
                                        align = 'left';
                                      } else if (containerRect.width - x < 110) {
                                        align = 'right';
                                      }

                                      setSegmentTooltipPos({
                                        x,
                                        y,
                                        align,
                                        containerWidth: containerRect.width
                                      });
                                    }
                                    setHoveredSegment(seg);
                                  }}
                                  onMouseLeave={() => setHoveredSegment(null)}
                                />
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Data List */}
                      <div className="w-full space-y-2 flex-grow overflow-y-auto max-h-[260px] pr-1">
                        {donutSegments.map((seg, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800/40 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition-all duration-150">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: seg.color }} />
                              <span className="text-[10px] sm:text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">{getLabelName(seg.class)}</span>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                                {seg.cases} kasus ({Math.round(seg.percent)}%)
                              </span>
                              <div className="flex flex-col items-end min-w-[85px] leading-tight">
                                <span className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400">
                                  {formatIndoNumber(seg.kwh || 0)} kWh
                                </span>
                                <span className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                                  Rp {formatIndoNumber(seg.ts || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {hoveredSegment !== null && (
                        <div
                          className={`absolute bg-slate-900/95 dark:bg-slate-950/95 text-slate-50 border border-slate-700/50 backdrop-blur-md rounded-xl p-3 shadow-xl pointer-events-none text-xs font-semibold space-y-1.5 z-20 transition-all duration-150 min-w-[190px] whitespace-nowrap ${
                            segmentTooltipPos.align === 'left'
                              ? 'translate-x-0'
                              : segmentTooltipPos.align === 'right'
                                ? '-translate-x-full'
                                : '-translate-x-1/2'
                          }`}
                          style={{
                            left: segmentTooltipPos.align === 'left'
                              ? '16px'
                              : segmentTooltipPos.align === 'right'
                                ? `${segmentTooltipPos.containerWidth - 16}px`
                                : `${segmentTooltipPos.x}px`,
                            top: `${segmentTooltipPos.y - 120}px`
                          }}
                        >
                          <div className="font-extrabold border-b border-slate-800 pb-1 mb-1 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredSegment.color }} />
                            <span className="text-slate-100">{getLabelName(hoveredSegment.class)}</span>
                          </div>
                          <div>Kasus: <span className="font-black text-slate-200">{hoveredSegment.cases} kasus ({Math.round(hoveredSegment.percent)}%)</span></div>
                          <div className="border-t border-slate-800/60 pt-1 mt-1">Energi: <span className="font-black text-emerald-400">{formatIndoNumber(hoveredSegment.kwh || 0)} kWh</span></div>
                          <div className="text-[10px] sm:text-xs text-blue-400 dark:text-blue-500 font-bold">Susulan: <span>Rp {formatIndoNumber(hoveredSegment.ts || 0)}</span></div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bar Chart - Trend kWh */}
            <div className={`lg:col-span-3 p-4 sm:p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col relative`}>
              <div className="flex items-center justify-between gap-2 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">{granularity === 'hari' ? `Realisasi & Target kWh per Hari (${currentMonthName})` : granularity === 'minggu' ? `Realisasi & Target kWh per Minggu (${currentMonthName})` : 'Realisasi & Target kWh per Bulan'}</span>
                  <span className="inline sm:hidden">{granularity === 'hari' ? `kWh per Hari` : granularity === 'minggu' ? `kWh per Minggu` : 'kWh per Bulan'}</span>
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:inline">Tampilkan:</span>
                  <select
                    value={granularity}
                    onChange={(e) => { setGranularity(e.target.value); setHoveredMonth(null); }}
                    className="px-2.5 py-1.5 text-[11px] sm:text-xs font-bold bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:border-emerald-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="hari">Hari</option>
                    <option value="minggu">Minggu</option>
                    <option value="bulan">Bulan</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /><span>Realisasi</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500" /><span>Target</span></div>
              </div>

              {(() => {
                const maxKwh = Math.max(...currentChartData.map(d => d.kwh), ...currentChartData.map(d => d.target), 10000);
                const hasTrendData = currentChartData.some(d => d.kwh > 0 || d.target > 0);
                if (!hasTrendData) {
                  return <div className="flex-grow flex items-center justify-center min-h-[180px] text-xs text-slate-500 font-semibold">Tidak ada tren data yang terekam.</div>;
                }
                const minWidthClass = granularity === 'hari' ? 'min-w-[900px]' : granularity === 'minggu' ? 'min-w-[480px]' : 'min-w-[600px]';
                return (
                  <div 
                    ref={chartScrollRef}
                    className="flex-grow overflow-x-auto overflow-y-hidden w-full pt-2 scroll-smooth relative"
                  >
                    <div className={`${minWidthClass} w-full h-full flex items-center justify-center min-h-[180px] relative`}>
                      <svg viewBox="0 0 500 210" className="w-full h-full min-h-[180px] max-h-full">
                        {Array.from({ length: 5 }).map((_, i) => {
                          const yVal = 20 + i * 40;
                          const gridKwh = maxKwh - (maxKwh * (i / 4));
                          return (
                            <g key={i}>
                              <line x1="45" y1={yVal} x2="485" y2={yVal} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3 3" />
                              <text x="38" y={yVal + 3} textAnchor="end" fontSize="8" className="fill-slate-400 dark:fill-slate-500 font-bold">
                                {formatIndoNumber(Math.round(gridKwh))}
                              </text>
                            </g>
                          );
                        })}
                        <line x1="45" y1="180" x2="485" y2="180" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
                        {currentChartData.map((m, idx) => {
                          const plotWidth = 440;
                          const step = plotWidth / currentChartData.length;
                          const center = 45 + idx * step + step / 2;
                          const targetY = 180 - (m.target / maxKwh) * 160;
                          const realHeight = (m.kwh / maxKwh) * 160;
                          const realY = 180 - realHeight;
                          const barWidth = Math.max(4, Math.floor(step * 0.5));
                          const realX = center - barWidth / 2;
                          const showLabel = granularity !== 'hari' || (idx + 1) === 1 || (idx + 1) % 5 === 0 || (idx + 1) === currentChartData.length;
                          return (
                            <g key={idx}>
                              <line x1={center - barWidth * 0.75} y1={targetY} x2={center + barWidth * 0.75} y2={targetY} stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 1.5" />
                              <rect
                                x={realX} y={realY} width={barWidth} height={Math.max(realHeight, 2)} rx="1.5"
                                className={`${hoveredMonth === idx ? 'fill-emerald-500' : 'fill-emerald-500/80 dark:fill-emerald-500/70'} transition-all duration-200 cursor-pointer`}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const containerRect = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                                  if (containerRect) setTooltipPos({ x: rect.left - containerRect.left, y: rect.top - containerRect.top });
                                  setHoveredMonth(idx);
                                }}
                                onMouseLeave={() => setHoveredMonth(null)}
                              />
                              {showLabel && (
                                <text x={center} y="196" textAnchor="middle" fontSize="8" className="fill-slate-400 dark:fill-slate-500 font-extrabold">
                                  {m.label}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                      {hoveredMonth !== null && currentChartData[hoveredMonth] && (
                        <div
                          className="absolute bg-slate-900/95 dark:bg-slate-950/95 text-slate-50 border border-slate-700/50 backdrop-blur-md rounded-xl p-3 shadow-xl pointer-events-none text-xs font-semibold space-y-1.5 z-20 transition-all duration-150"
                          style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 110 }}
                        >
                          <div className="font-extrabold text-emerald-400 border-b border-slate-800 pb-1 mb-1">
                            {granularity === 'hari' ? `Tanggal ${currentChartData[hoveredMonth].label} ${currentMonthName}` :
                              granularity === 'minggu' ? `Minggu ke-${currentChartData[hoveredMonth].label.slice(1)}` :
                              currentChartData[hoveredMonth].label}
                          </div>
                          <div>Realisasi: <span className="font-black text-slate-100">{formatIndoNumber(currentChartData[hoveredMonth].kwh)} kWh</span></div>
                          <div className="border-t border-slate-800/60 pt-1 mt-1">Target: <span className="font-black text-amber-400">{formatIndoNumber(currentChartData[hoveredMonth].target)} kWh</span></div>
                          <div className="text-[10px] sm:text-xs text-slate-400">Kasus: <span className="font-bold text-slate-200">{currentChartData[hoveredMonth].cases} Kasus</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: TARGET BULANAN ────────────────────────────────────────────── */}
      {subTab === 'targets' && (
        <MonthlyTargets
          workingDays={activeWorkingDaysChecklist}
          backendUrl={backendUrl}
          targets={monthlyTargets}
          setTargets={setMonthlyTargets}
          selectedYear={selectedTargetYear}
          setSelectedYear={setSelectedTargetYear}
          loading={targetLoading}
          setLoading={setTargetLoading}
        />
      )}

      {/* ── TAB 3: RINGKASAN ─────────────────────────────────────────────────── */}
      {subTab === 'summary' && (() => {
        const isSemester1 = month <= 6;
        const periodSuffix = isSemester1 ? 'Semester I' : 'Akhir Tahun';
        const periodSuffixLower = isSemester1 ? 'semester I' : 'akhir tahun';
        const periodAdjective = isSemester1 ? 'semesteran' : 'tahunan';
        const periodAdjectiveCap = isSemester1 ? 'Semesteran' : 'Tahunan';
        const periodThis = isSemester1 ? 'semester ini' : 'tahun ini';

        const prevYear = year - 1;
        const prevMonthlyTrend = execSummary.prevMonthlyTrend ?? [];
        const totalTargetYear = monthlyTargets.reduce((s, v) => s + v, 0);
        const targetPeriod = isSemester1
          ? monthlyTargets.slice(0, 6).reduce((s, v) => s + v, 0)
          : totalTargetYear;

        const totalRealYear = execSummary.totalKwhYear;
        const sisaTarget = Math.max(0, targetPeriod - totalRealYear);
        const sisaBulan = isSemester1 ? Math.max(1, 6 - month) : Math.max(1, 12 - month);
        const rataRataDibutuhkan = Math.round(sisaTarget / sisaBulan);
        const prevTotalKwhYtd = prevMonthlyTrend.slice(0, month).reduce((sum, m) => sum + (m?.kwh ?? 0), 0);
        const diffKwhYtd = totalRealYear - prevTotalKwhYtd;
        const pctGrowthYtd = prevTotalKwhYtd > 0 ? (diffKwhYtd / prevTotalKwhYtd) * 100 : (totalRealYear > 0 ? 100 : 0);
        const remainingMonths = isSemester1 ? Math.max(0, 6 - month) : Math.max(0, 12 - month);
        const avgRealKwh = month > 0 ? totalRealYear / month : 0;

        let remainingWorkingDays = 0;
        // Count remaining working days in current month
        const totalDaysInCurrentMonth = new Date(year, month, 0).getDate();
        for (let d = day; d <= totalDaysInCurrentMonth; d++) {
          if (isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist)) {
            remainingWorkingDays++;
          }
        }
        // Count full working days in subsequent months in the current period
        const endMonthIndex = isSemester1 ? 6 : 12;
        for (let m = month; m < endMonthIndex; m++) {
          remainingWorkingDays += getWorkingDaysCount(year, m, activeWorkingDaysChecklist);
        }
        remainingWorkingDays = Math.max(1, remainingWorkingDays);

        const projectedKwhCurrent = Math.round(totalRealYear + (avgRealKwh * remainingMonths));
        const pctCurrent = targetPeriod > 0 ? (projectedKwhCurrent / targetPeriod) * 100 : 0;
        const gapCurrent = targetPeriod - projectedKwhCurrent;
        const avgRequiredKwhCurrent = Math.round(sisaTarget / sisaBulan);
        const pctIncreaseRequiredCurrent = (avgRealKwh > 0 && sisaTarget > 0) ? Math.round(((avgRequiredKwhCurrent / avgRealKwh) - 1) * 100) : 0;
        const newTargetHarian = remainingWorkingDays > 0 ? Math.round(sisaTarget / remainingWorkingDays) : 0;
        const baselineTargetHarian = Math.round(targetMonth / Math.max(1, workingDaysInMonth));
        const pctDailyIncrease = (baselineTargetHarian > 0 && sisaTarget > 0) ? Math.round(((newTargetHarian / baselineTargetHarian) - 1) * 100) : 0;
        const target110Year = targetPeriod * 1.10;
        const sisaTarget110 = Math.max(0, target110Year - totalRealYear);
        const avgRequiredKwh110 = Math.round(sisaTarget110 / sisaBulan);
        const pctEffortRequired110 = (avgRealKwh > 0 && sisaTarget110 > 0) ? Math.round(((avgRequiredKwh110 / avgRealKwh) - 1) * 100) : 0;
        const monthlyTrendData = execSummary.monthlyTrend || [];
        const yoyChartData = monthlyTrendData.map((m, idx) => ({ label: m.month, current: m.kwh, prev: prevMonthlyTrend[idx]?.kwh ?? 0, target: monthlyTargets[idx] ?? 0 }));
        const yoyMaxVal = Math.max(...yoyChartData.map(d => Math.max(d.current, d.prev, d.target)), 1);
        const targetKumulatifYtd = monthlyTargets.slice(0, month).reduce((sum, val) => sum + val, 0);
        const pctYtd = targetKumulatifYtd > 0 ? (totalRealYear / targetKumulatifYtd) * 100 : 0;
        const pctPeriod = targetPeriod > 0 ? (totalRealYear / targetPeriod) * 100 : 0;

        const getKpiStatus = (pYtd, currentMonth, real, targetYtd) => {
          const diff = real - targetYtd;
          const diffStr = diff >= 0 ? `surplus +${formatIndoNumber(diff)} kWh` : `defisit ${formatIndoNumber(Math.abs(diff))} kWh`;
          const monthsList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          const monthName = monthsList[currentMonth - 1] || '';
          if (pYtd >= 100) return { label: 'SANGAT BAIK', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', iconColor: 'text-emerald-500', description: `Kinerja luar biasa! Hingga bulan ${monthName}, realisasi kumulatif ${periodAdjective} mencapai ${formatIndoNumber(real)} kWh. Angka ini mencatatkan ${diffStr} di atas target kumulatif (${formatIndoNumber(targetYtd)} kWh).` };
          if (pYtd >= 90) return { label: 'BAIK (ON TRACK)', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20', iconColor: 'text-teal-500', description: `Kinerja aman dan terkendali. Realisasi kumulatif ${periodAdjective} hingga ${monthName} sebesar ${formatIndoNumber(real)} kWh berjalan on-track dengan pencapaian ${Math.round(pYtd)}% dari target kumulatif.` };
          if (pYtd >= 75) return { label: 'CUKUP (PERLU PERHATIAN)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', iconColor: 'text-amber-500', description: `Kinerja berada dalam zona kuning. Hingga bulan ${monthName}, pencapaian kumulatif berada di bawah target kumulatif dengan ${diffStr} (${Math.round(pYtd)}% dari target kumulatif).` };
          return { label: 'KURANG (KRITIS)', color: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20', iconColor: 'text-rose-500', description: `Status waspada/kritis! Target kWh kumulatif ${periodAdjective} mengalami ${diffStr} yang signifikan dibandingkan target kumulatif.` };
        };
        const statusInfo = getKpiStatus(pctYtd, month, totalRealYear, targetKumulatifYtd);

        // Paginated display control for YoY comparison table (6 rows per page)
        const visibleYoYData = yoyPage === 1 ? yoyChartData.slice(0, 6) : yoyChartData.slice(6, 12);

        return (
          <div className="space-y-6">
            {/* Hero Status Card (Mobile-First) */}
            <div className={`p-4 sm:p-6 ${borderRadius.xxl} border-l-4 ${
              pctYtd >= 100 ? 'border-l-emerald-500' : pctYtd >= 90 ? 'border-l-teal-500' : pctYtd >= 75 ? 'border-l-amber-500' : 'border-l-rose-500'
            } border-y border-r border-slate-200 dark:border-slate-800/85 ${shadows.md} bg-white dark:bg-slate-900 flex flex-col lg:flex-row justify-between items-stretch gap-6 relative overflow-hidden`}>
              <div className="flex-1 space-y-4 z-10 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Status Pencapaian Kumulatif</span>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                  <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-6">
                    Analisis Pencapaian kWh Kumulatif {isSemester1 ? 'Semester I' : 'Tahun'} {year}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-4 block">{statusInfo.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-150 dark:border-slate-800/85">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Realisasi Kumulatif</div>
                    <div className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-50 leading-none">
                      {formatIndoNumber(totalRealYear)} <span className="text-[10px] font-bold text-slate-400">kWh</span>
                    </div>
                  </div>
                  <div className="space-y-1 border-l border-slate-150 dark:border-slate-800/85 pl-4">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Kumulatif</div>
                    <div className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-50 leading-none">
                      {formatIndoNumber(targetKumulatifYtd)} <span className="text-[10px] font-bold text-slate-400">kWh</span>
                    </div>
                  </div>
                  <div className="space-y-1 border-l border-slate-150 dark:border-slate-800/85 pl-4">
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{isSemester1 ? 'Target Semester I' : 'Target Tahunan'}</div>
                    <div className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-50 leading-none">
                      {formatIndoNumber(isSemester1 ? targetPeriod : totalTargetYear)} <span className="text-[10px] font-bold text-slate-400">kWh</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-72 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-stretch justify-between p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/60 rounded-xl z-10 shrink-0 gap-4 sm:gap-6">
                <div className="flex items-center lg:justify-center gap-4 lg:flex-col shrink-0">
                  <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
                    <svg viewBox="0 0 80 80" className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="32" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                      <circle cx="40" cy="40" r="32" className={`transition-all duration-1000 ease-out ${pctYtd >= 100 ? 'stroke-emerald-500 dark:stroke-emerald-400' : pctYtd >= 90 ? 'stroke-teal-500 dark:stroke-teal-400' : pctYtd >= 75 ? 'stroke-amber-500 dark:stroke-amber-400' : 'stroke-rose-500 dark:stroke-rose-400'}`} strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - Math.min(100, pctYtd) / 100)} strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xs sm:text-base font-black text-slate-900 dark:text-slate-50 leading-none">{Math.round(pctYtd)}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col lg:items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Pencapaian Kumulatif</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold sm:hidden block mt-1">{formatIndoNumber(totalRealYear)} / {formatIndoNumber(targetKumulatifYtd)} kWh</span>
                  </div>
                </div>
                <div className="w-full sm:flex-1 lg:w-full space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-wider">
                    <span>{isSemester1 ? 'Target Semester I' : 'Target Tahunan'}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-extrabold">{Math.round(pctPeriod)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-out bg-emerald-500`} style={{ width: `${Math.min(100, pctPeriod)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* YoY Chart & Detail Table (Responsive Layout) */}
            <div className={`p-6 ${colors.card} ${borderRadius.xxl} border ${colors.border} ${shadows.md}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-150 dark:border-slate-800/85">
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Perbandingan Realisasi YoY</span>
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span className="font-extrabold text-slate-800 dark:text-slate-205">{formatIndoNumber(totalRealYear)} kWh</span>
                    <span className="text-slate-450 font-normal">vs</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-205">{formatIndoNumber(prevTotalKwhYtd)} kWh ({prevYear})</span>
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${diffKwhYtd >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'}`}>
                      {diffKwhYtd >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {diffKwhYtd >= 0 ? '+' : ''}{Math.round(pctGrowthYtd)}% YoY
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider shrink-0">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-600" /><span className="text-slate-500 dark:text-slate-400">{prevYear}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-slate-500 dark:text-slate-400">{currentYear}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-1 rounded-sm bg-amber-500" /><span className="text-slate-500 dark:text-slate-400">Target</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* SVG Chart Container */}
                <div ref={yoyChartScrollRef} className="lg:col-span-8 relative w-full h-auto overflow-x-auto scroll-smooth min-h-[250px]">
                  <div className="w-[200%] sm:w-full h-full relative pb-4">
                    <svg width="100%" height="250" viewBox="0 0 720 250" preserveAspectRatio="none" className="overflow-visible">
                      <line x1="20" y1="215" x2="700" y2="215" className="stroke-slate-200 dark:stroke-slate-800/80" strokeWidth="1" />
                      {yoyChartData.map((d, idx) => {
                        const groupWidth = 720 / 12;
                        const barW = 12, gap = 2;
                        const centerX = groupWidth * idx + groupWidth / 2;
                        const prevBarX = centerX - barW - gap / 2;
                        const currBarX = centerX + gap / 2;
                        const maxH = 185;
                        const prevH = yoyMaxVal > 0 ? (d.prev / yoyMaxVal) * maxH : 0;
                        const currH = yoyMaxVal > 0 ? (d.current / yoyMaxVal) * maxH : 0;
                        const targetY = yoyMaxVal > 0 ? 215 - (d.target / yoyMaxVal) * maxH : 215;
                        const isHovered = hoveredYoyMonth === idx;
                        return (
                          <g key={idx}>
                            {/* Column Hover Indicator Highlight Background */}
                            {isHovered && (
                              <rect
                                x={groupWidth * idx + 4}
                                y="10"
                                width={groupWidth - 8}
                                height="210"
                                rx="6"
                                className="fill-slate-50 dark:fill-slate-800/40 pointer-events-none transition-colors duration-150"
                              />
                            )}
                            <rect x={prevBarX} y={215 - prevH} width={barW} height={Math.max(prevH, 1)} rx="1.5" className={`${isHovered ? 'fill-slate-350 dark:fill-slate-700' : 'fill-slate-200 dark:fill-slate-800'} pointer-events-none transition-all duration-300`} />
                            <rect x={currBarX} y={215 - currH} width={barW} height={Math.max(currH, 1)} rx="1.5" className={`${isHovered ? 'fill-emerald-400' : 'fill-emerald-500 dark:fill-emerald-500/80'} pointer-events-none transition-all duration-300`} />
                            <line x1={prevBarX - 2} y1={targetY} x2={currBarX + barW + 2} y2={targetY} className="stroke-amber-500 pointer-events-none" strokeWidth="1.5" strokeDasharray="3,2" />
                            <text x={centerX} y="232" textAnchor="middle" className={`text-[10px] ${isHovered ? 'fill-slate-700 dark:fill-slate-200 font-black' : 'fill-slate-400 dark:fill-slate-500 font-bold'} pointer-events-none`}>{d.label}</text>
  
                            {/* Invisible Event Triggering Box (Gapless Mouse Capture) */}
                            <rect
                              x={groupWidth * idx}
                              y="0"
                              width={groupWidth}
                              height="250"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const containerRect = e.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
                                if (containerRect) {
                                  setYoyTooltipPos({
                                    x: rect.left - containerRect.left,
                                    y: rect.top - containerRect.top
                                  });
                                }
                                setHoveredYoyMonth(idx);
                              }}
                              onMouseLeave={() => setHoveredYoyMonth(null)}
                            />
                          </g>
                        );
                      })}
                    </svg>
  
                    {/* Hover Tooltip Overlay */}
                    {hoveredYoyMonth !== null && yoyChartData[hoveredYoyMonth] && (
                      <div
                        className="absolute bg-slate-900/95 dark:bg-slate-950/95 text-slate-50 border border-slate-700/50 backdrop-blur-md rounded-xl p-3 shadow-xl pointer-events-none text-xs font-bold space-y-1 z-25 transition-all duration-150"
                        style={{
                          left: hoveredYoyMonth > 6 ? yoyTooltipPos.x - 170 : yoyTooltipPos.x + 40,
                          top: '12px'
                        }}
                      >
                        <div className="font-black text-emerald-400 border-b border-slate-800 pb-1 mb-2 flex items-center justify-between gap-4">
                          <span>Bulan {yoyChartData[hoveredYoyMonth].label}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">YoY kWh</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Realisasi {currentYear}:</span>
                          <span className="font-black text-emerald-400">{formatIndoNumber(yoyChartData[hoveredYoyMonth].current)} kWh</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Realisasi {prevYear}:</span>
                          <span className="font-bold text-slate-200">{formatIndoNumber(yoyChartData[hoveredYoyMonth].prev)} kWh</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 mt-1">
                          <span className="text-slate-400">Target {currentYear}:</span>
                          <span className="font-black text-amber-400">{formatIndoNumber(yoyChartData[hoveredYoyMonth].target)} kWh</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* YoY Table with Mobile view control */}
                <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-150 dark:border-slate-800/85 lg:pl-6 pt-4 lg:pt-0 w-full">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-150 dark:border-slate-800/85">
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Rincian Perbandingan Bulanan</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">{yoyPage === 1 ? 'Semester 1' : 'Semester 2'}</span>
                  </div>

                  <div className="overflow-x-auto pr-1 text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-150 dark:border-slate-800/85">
                          <th className="pb-2">Bulan</th>
                          <th className="pb-2 text-right">{prevYear}</th>
                          <th className="pb-2 text-right">{currentYear}</th>
                          <th className="pb-2 text-right">YoY (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150/60 dark:divide-slate-800/40">
                        {visibleYoYData.map((m, idx) => {
                          const mDiff = m.current - m.prev;
                          const mPct = m.prev > 0 ? (mDiff / m.prev) * 100 : (m.current > 0 ? 100 : 0);
                          const actualMonthIndex = yoyPage === 1 ? idx + 1 : idx + 7;
                          const isCurrentActive = actualMonthIndex <= month;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="py-2 font-bold text-slate-600 dark:text-slate-300">{m.label}</td>
                              <td className="py-2 text-right text-slate-500 dark:text-slate-400 font-semibold">{formatIndoNumber(m.prev)}</td>
                              <td className="py-2 text-right text-slate-800 dark:text-slate-100 font-bold">{isCurrentActive ? formatIndoNumber(m.current) : '-'}</td>
                              <td className="py-2 text-right font-black">
                                {isCurrentActive ? (
                                  <span className={`inline-flex items-center gap-1 text-xs ${mDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {mDiff >= 0 ? '+' : ''}{Math.round(mPct)}%
                                  </span>
                                ) : <span className="text-slate-400 font-medium">-</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination control with swipe style */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-150 dark:border-slate-800/85">
                    <button
                      disabled={yoyPage === 1}
                      onClick={() => setYoYPage(1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Semester 1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600 dark:text-slate-400">
                        {yoyPage === 1 ? 'Semester 1 (Jan - Jun)' : 'Semester 2 (Jul - Des)'}
                      </span>
                      <div className="flex gap-1 ml-1">
                        <span className={`w-2 h-2 rounded-full transition-all ${yoyPage === 1 ? 'bg-emerald-500 scale-125' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        <span className={`w-2 h-2 rounded-full transition-all ${yoyPage === 2 ? 'bg-emerald-500 scale-125' : 'bg-slate-300 dark:bg-slate-700'}`} />
                      </div>
                    </div>

                    <button
                      disabled={yoyPage === 2}
                      onClick={() => setYoYPage(2)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Semester 2"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className={`p-3 sm:p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-2 flex flex-col justify-between min-w-0`}>
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/10 shrink-0"><Target className="w-3.5 h-3.5" /></div>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider truncate">Sisa Target</span>
                    </div>
                    <div className="group relative inline-block shrink-0">
                      <Info className="w-4 h-4 text-slate-400 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-help transition-colors" />
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 p-3 bg-slate-950/95 dark:bg-slate-900 text-xs text-slate-200 dark:text-slate-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 border border-slate-800 leading-relaxed font-normal normal-case">
                        <div className="font-black border-b border-slate-800 pb-1 mb-1 text-xs text-amber-500 uppercase">Sisa Target</div>
                        <div>Sisa target kWh tahunan yang belum terpenuhi dari seluruh pelaksanaan kegiatan P2TL.</div>
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="font-bold text-slate-300">Rumus:</span> Target Tahunan - Realisasi Kumulatif
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-none">
                    {formatIndoNumber(sisaTarget)} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-emerald-500`} style={{ width: `${Math.min(100, totalTargetYear > 0 ? (totalRealYear / totalTargetYear) * 100 : 0)}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider truncate">Progress: {totalTargetYear > 0 ? Math.round((totalRealYear / totalTargetYear) * 100) : 0}%</div>
                </div>
              </div>

              <div className={`p-3 sm:p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-2 flex flex-col justify-between min-w-0`}>
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`p-1 rounded-lg border shrink-0 ${rataRataDibutuhkan > (monthlyTargets[month - 1] ?? 0) * 1.2 ? 'bg-rose-500/10 text-rose-500 border-rose-500/10' : 'bg-sky-500/10 text-sky-600 border-sky-500/10'}`}><AlertTriangle className="w-3.5 h-3.5" /></div>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider truncate">Kebutuhan/Bulan</span>
                    </div>
                    <div className="group relative inline-block shrink-0">
                      <Info className="w-4 h-4 text-slate-400 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-help transition-colors" />
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 p-3 bg-slate-950/95 dark:bg-slate-900 text-xs text-slate-200 dark:text-slate-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 border border-slate-800 leading-relaxed font-normal normal-case">
                        <div className="font-black border-b border-slate-800 pb-1 mb-1 text-xs text-sky-500 dark:text-sky-400 uppercase">Kebutuhan/Bulan</div>
                        <div>Rata-rata kWh realisasi bulanan yang harus dicapai pada sisa bulan berjalan agar target tahunan terpenuhi 100% pada akhir tahun.</div>
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="font-bold text-slate-300">Rumus:</span> Sisa Target / Sisa Bulan Tersisa
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-none">
                    {formatIndoNumber(rataRataDibutuhkan)} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider truncate font-bold">Untuk {sisaBulan} bulan tersisa</div>
              </div>

              <div className={`p-3 sm:p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-2 flex flex-col justify-between min-w-0`}>
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`p-1 rounded-lg border shrink-0 ${pctGrowthYtd >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/10' : 'bg-rose-500/10 text-rose-500 dark:text-rose-455 border-rose-500/10'}`}>
                        {pctGrowthYtd >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider truncate">Pertumbuhan (YoY)</span>
                    </div>
                    <div className="group relative inline-block shrink-0">
                      <Info className="w-4 h-4 text-slate-400 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-help transition-colors" />
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 p-3 bg-slate-950/95 dark:bg-slate-900 text-xs text-slate-200 dark:text-slate-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 border border-slate-800 leading-relaxed font-normal normal-case">
                        <div className="font-black border-b border-slate-800 pb-1 mb-1 text-xs text-emerald-500 dark:text-emerald-400 uppercase">Pertumbuhan (YoY)</div>
                        <div>Tingkat pertumbuhan kWh realisasi kumulatif tahun berjalan dibandingkan periode yang sama (Jan - bulan aktif) pada tahun lalu.</div>
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="font-bold text-slate-300">Rumus:</span> ((Real. Kum. Thn Ini - Real. Kum. Thn Lalu) / Real. Kum. Thn Lalu) * 100
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-none">
                    {pctGrowthYtd >= 0 ? '+' : ''}{Math.round(pctGrowthYtd)}%
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider truncate font-bold">
                  {diffKwhYtd >= 0 ? '+' : ''}{formatIndoNumber(diffKwhYtd)} kWh vs {prevYear}
                </div>
              </div>

              <div className={`p-3 sm:p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-2 flex flex-col justify-between min-w-0`}>
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-1 w-full min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`p-1 rounded-lg border shrink-0 ${(targetKumulatifYtd - totalRealYear) <= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/10'}`}>
                        {(targetKumulatifYtd - totalRealYear) <= 0 ? <Trophy className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider truncate">Gap Kumulatif</span>
                    </div>
                    <div className="group relative inline-block shrink-0">
                      <Info className="w-4 h-4 text-slate-400 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-help transition-colors" />
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-52 p-3 bg-slate-950/95 dark:bg-slate-900 text-xs text-slate-200 dark:text-slate-100 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 border border-slate-800 leading-relaxed font-normal normal-case">
                        <div className="font-black border-b border-slate-800 pb-1 mb-1 text-xs text-emerald-500 dark:text-emerald-400 uppercase">Gap Kumulatif</div>
                        <div>Selisih antara realisasi berjalan dengan target kumulatif berjalan (YTD). Surplus jika realisasi melebihi target, defisit jika kurang.</div>
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <span className="font-bold text-slate-300">Rumus:</span> Target Kumulatif Berjalan - Realisasi Kumulatif
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-50 leading-none">
                    {formatIndoNumber(Math.abs(targetKumulatifYtd - totalRealYear))} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span>
                  </div>
                </div>
                <div className={`text-[10px] font-black uppercase tracking-wider truncate ${(targetKumulatifYtd - totalRealYear) <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {(targetKumulatifYtd - totalRealYear) <= 0 ? `Surplus dari target` : `Defisit dari target`}
                </div>
              </div>
            </div>

            {/* Scenario Projections (Mobile-First: Toggles on Mobile, 3 Cards on Desktop) */}
            <div className={`p-6 ${colors.card} ${borderRadius.xxl} border ${colors.border} ${shadows.md} space-y-4`}>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-150 dark:border-slate-800/85">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/10"><TrendingUp className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Skenario Proyeksi Pencapaian Target {periodAdjectiveCap}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Simulasi target kumulatif {periodAdjective} {year} ({formatIndoNumber(isSemester1 ? targetPeriod : totalTargetYear)} kWh) berdasarkan 3 skenario taktis.</p>
                </div>
              </div>

              {/* Mobile Scenario Tabs / Selector */}
              <div className="flex sm:hidden p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
                {[
                  { id: 'current', label: 'Rutin/Tren Kini' },
                  { id: 'adjusted', label: 'Disesuaikan' },
                  { id: 'optimistic', label: 'Optimis (110%)' }
                ].map(scen => (
                  <button
                    key={scen.id}
                    onClick={() => setActiveScenario(scen.id)}
                    className={`flex-1 h-8 flex items-center justify-center text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                      activeScenario === scen.id
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {scen.label}
                  </button>
                ))}
              </div>

              {/* Mobile Only: Active Scenario Card */}
              <div className="sm:hidden block">
                {activeScenario === 'current' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/85 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Apabila Progres Seperti Saat Ini</span>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${gapCurrent <= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {gapCurrent <= 0 ? 'TERCAPAI' : 'PERLU AKSELERASI'}
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">{formatIndoNumber(projectedKwhCurrent)} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span></div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Proyeksi {periodSuffix}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-4 font-bold">
                      {gapCurrent > 0
                        ? <>Dengan ritme saat ini, {periodSuffixLower} diproyeksikan defisit <span className="font-black text-rose-500">{formatIndoNumber(gapCurrent)} kWh</span>. Agar target tercapai, sisa {sisaBulan} bulan membutuhkan rata-rata <span className="font-black text-slate-800 dark:text-slate-200">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bulan</span> (naik <span className="font-black text-rose-500">{pctIncreaseRequiredCurrent}%</span> dari rata-rata saat ini).</>
                        : <>Dengan ritme saat ini, {periodSuffixLower} diproyeksikan surplus <span className="font-black text-emerald-500">{formatIndoNumber(Math.abs(gapCurrent))} kWh</span>. Target kumulatif {periodAdjective} diproyeksikan dapat tercapai dengan sukses.</>}
                    </p>
                    <div className="pt-2 border-t border-slate-150 dark:border-slate-800/85 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/85">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><span>Proyeksi Pencapaian</span><span>{Math.round(pctCurrent)}%</span></div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${gapCurrent <= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, pctCurrent)}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {activeScenario === 'adjusted' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/85 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Jika Target Harian Kumulatif Tercapai</span>
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">TERCAPAI</span>
                    </div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">{formatIndoNumber(isSemester1 ? targetPeriod : totalTargetYear)} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span></div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Disesuaikan untuk Target {isSemester1 ? 'Semester I' : 'Tahunan'}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-4 font-bold">
                      {pctDailyIncrease > 0
                        ? <>Agar target kumulatif tercapai, target harian sisa <span className="font-black text-slate-800 dark:text-slate-200">{remainingWorkingDays} hari kerja</span> {periodThis} harus disesuaikan menjadi <span className="font-black text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (naik <span className="font-black text-rose-500">{pctDailyIncrease}%</span> dari target harian awal).</>
                        : <>Target kumulatif {periodAdjective} berjalan aman. Target harian disesuaikan menjadi <span className="font-black text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (turun <span className="font-black text-emerald-600">{Math.abs(pctDailyIncrease)}%</span> dari target harian awal).</>}
                    </p>
                    <div className="pt-2 border-t border-slate-150 dark:border-slate-800/85 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider space-y-1">
                      <div className="flex justify-between"><span>Target Harian Awal:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(baselineTargetHarian)} kWh/hari</span></div>
                      <div className="flex justify-between"><span>Target Harian Baru:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(newTargetHarian)} kWh/hari</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/85">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><span>Proyeksi Pencapaian</span><span>100%</span></div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} /></div>
                    </div>
                  </div>
                )}

                {activeScenario === 'optimistic' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/85 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Cara Mencapai Target 110%</span>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${totalRealYear >= target110Year ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {totalRealYear >= target110Year ? 'TERCAPAI' : `PERLU EFFORT +${pctEffortRequired110}%`}
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">{formatIndoNumber(Math.round(target110Year))} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span></div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Target Optimis (110%)</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-4 font-bold">
                      {totalRealYear < target110Year
                        ? <>Agar target optimis 110% tercapai (<span className="font-black text-slate-800 dark:text-slate-200">{formatIndoNumber(Math.round(target110Year))} kWh</span>), performa di sisa {sisaBulan} bulan harus ditingkatkan sebesar <span className="font-black text-rose-500">{pctEffortRequired110}%</span> (membutuhkan rata-rata <span className="font-black text-slate-800 dark:text-slate-200">{formatIndoNumber(avgRequiredKwh110)} kWh/bulan</span>).</>
                        : <>Target optimis 110% {periodAdjective} sebesar <span className="font-black text-emerald-500">{formatIndoNumber(Math.round(target110Year))} kWh</span> telah berhasil dilampaui!</>}
                    </p>
                    <div className="pt-2 border-t border-slate-150 dark:border-slate-800/85 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan (110%):</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(avgRequiredKwh110)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/85">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><span>Progres Terhadap Target 110%</span><span>{Math.round(target110Year > 0 ? (totalRealYear / target110Year) * 100 : 0)}%</span></div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${totalRealYear >= target110Year ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, target110Year > 0 ? (totalRealYear / target110Year) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Only: 3 Column Parallel Layout */}
              <div className="hidden sm:grid grid-cols-3 gap-6">
                {/* Scenario 1 */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/85 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Apabila Progres Seperti Saat Ini</span>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${gapCurrent <= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {gapCurrent <= 0 ? 'TERCAPAI' : 'PERLU AKSELERASI'}
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">{formatIndoNumber(projectedKwhCurrent)} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span></div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Proyeksi {periodSuffix}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-4 font-bold">
                      {gapCurrent > 0
                        ? <>Dengan ritme saat ini, {periodSuffixLower} diproyeksikan defisit <span className="font-black text-rose-500">{formatIndoNumber(gapCurrent)} kWh</span>. Agar target tercapai, sisa {sisaBulan} bulan membutuhkan rata-rata <span className="font-black text-slate-800 dark:text-slate-200">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bulan</span> (naik <span className="font-black text-rose-500">{pctIncreaseRequiredCurrent}%</span> dari rata-rata saat ini).</>
                        : <>Dengan ritme saat ini, {periodSuffixLower} diproyeksikan surplus <span className="font-black text-emerald-500">{formatIndoNumber(Math.abs(gapCurrent))} kWh</span>. Target kumulatif {periodAdjective} diproyeksikan dapat tercapai dengan sukses.</>}
                    </p>
                  </div>
                  <div>
                    <div className="pt-2 border-t border-slate-150 dark:border-slate-800/85 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/85 mt-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><span>Proyeksi Pencapaian</span><span>{Math.round(pctCurrent)}%</span></div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${gapCurrent <= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, pctCurrent)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scenario 2 */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/85 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Jika Target Harian Kumulatif Tercapai</span>
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">TERCAPAI</span>
                    </div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">{formatIndoNumber(isSemester1 ? targetPeriod : totalTargetYear)} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span></div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Disesuaikan untuk Target {isSemester1 ? 'Semester I' : 'Tahunan'}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-4 font-bold">
                      {pctDailyIncrease > 0
                        ? <>Agar target kumulatif tercapai, target harian sisa <span className="font-black text-slate-800 dark:text-slate-200">{remainingWorkingDays} hari kerja</span> {periodThis} harus disesuaikan menjadi <span className="font-black text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (naik <span className="font-black text-rose-500">{pctDailyIncrease}%</span> dari target harian awal).</>
                        : <>Target kumulatif {periodAdjective} berjalan aman. Target harian disesuaikan menjadi <span className="font-black text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (turun <span className="font-black text-emerald-600">{Math.abs(pctDailyIncrease)}%</span> dari target harian awal).</>}
                    </p>
                  </div>
                  <div>
                    <div className="pt-2 border-t border-slate-150 dark:border-slate-800/85 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider space-y-1">
                      <div className="flex justify-between"><span>Target Harian Awal:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(baselineTargetHarian)} kWh/hari</span></div>
                      <div className="flex justify-between"><span>Target Harian Baru:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(newTargetHarian)} kWh/hari</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/85 mt-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><span>Proyeksi Pencapaian</span><span>100%</span></div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} /></div>
                    </div>
                  </div>
                </div>

                {/* Scenario 3 */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/85 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Cara Mencapai Target 110%</span>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${totalRealYear >= target110Year ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {totalRealYear >= target110Year ? 'TERCAPAI' : `PERLU EFFORT +${pctEffortRequired110}%`}
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">{formatIndoNumber(Math.round(target110Year))} <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">kWh</span></div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">Target Optimis (110%)</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-4 font-bold">
                      {totalRealYear < target110Year
                        ? <>Agar target optimis 110% tercapai (<span className="font-black text-slate-800 dark:text-slate-200">{formatIndoNumber(Math.round(target110Year))} kWh</span>), performa di sisa {sisaBulan} bulan harus ditingkatkan sebesar <span className="font-black text-rose-500">{pctEffortRequired110}%</span> (membutuhkan rata-rata <span className="font-black text-slate-800 dark:text-slate-200">{formatIndoNumber(avgRequiredKwh110)} kWh/bulan</span>).</>
                        : <>Target optimis 110% {periodAdjective} sebesar <span className="font-black text-emerald-500">{formatIndoNumber(Math.round(target110Year))} kWh</span> telah berhasil dilampaui!</>}
                    </p>
                  </div>
                  <div>
                    <div className="pt-2 border-t border-slate-150 dark:border-slate-800/85 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan (110%):</span><span className="text-slate-800 dark:text-slate-200 font-black">{formatIndoNumber(avgRequiredKwh110)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/85 mt-2">
                      <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider"><span>Progres Terhadap Target 110%</span><span>{Math.round(target110Year > 0 ? (totalRealYear / target110Year) * 100 : 0)}%</span></div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${totalRealYear >= target110Year ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, target110Year > 0 ? (totalRealYear / target110Year) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
