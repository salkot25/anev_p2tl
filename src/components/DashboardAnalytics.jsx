import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertTriangle,
  Trophy,
  TrendingDown,
  BarChart3
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

function getIndonesianDateString(dateStr) {
  if (!dateStr) return '..........';
  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) return dateStr;
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  const dateObj = new Date(year, month, day);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${days[dateObj.getDay()]}, ${String(day).padStart(2, '0')} ${months[dateObj.getMonth()]} ${year}`;
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
    } catch (_) {}
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
  } catch (_) {}
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
export default function DashboardAnalytics({ targets, realization, execSummary, workingDays, backendUrl }) {
  const [subTab, setSubTab] = useState('kpi'); // 'kpi' | 'targets' | 'summary'
  const [logs, setLogs] = useState([]);
  const [hoveredMonth, setHoveredMonth] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [compositionMetric, setCompositionMetric] = useState('tarif');
  const [granularity, setGranularity] = useState('bulan');
  const [monthlyTargets, setMonthlyTargets] = useState(Array(12).fill(130205));
  const [showAllYoYTable, setShowAllYoYTable] = useState(false);
  const [activeScenario, setActiveScenario] = useState('current');

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
      } catch (_) {}
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
      } catch (e) {
        const cached = localStorage.getItem('p2tl_logs_cache');
        if (cached) {
          try { setLogs(JSON.parse(cached)); } catch (_) {}
        }
      }
    };
    fetchLogs();
  }, [backendUrl]);

  // Fetch monthly targets
  useEffect(() => {
    const fetchMonthlyTargets = async () => {
      if (!targets?.date) return;
      const yearVal = targets.date.split('-')[0] || String(new Date().getFullYear());
      const cacheKey = `p2tl_monthly_targets_cache_${yearVal}`;
      try {
        const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
        if (url) {
          const response = await fetch(`${url}?action=get_monthly_targets&year=${yearVal}`);
          const result = await response.json();
          if (result.status === 'success' && Array.isArray(result.data)) {
            localStorage.setItem(cacheKey, JSON.stringify(result.data));
            const mappedTargets = Array(12).fill(130205);
            result.data.forEach(item => {
              const mIdx = Number(item.Month) - 1;
              if (mIdx >= 0 && mIdx < 12) mappedTargets[mIdx] = Number(item.Target_kWh) || 130205;
            });
            setMonthlyTargets(mappedTargets);
            return;
          }
        }
        throw new Error('no url or bad response');
      } catch (e) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const mappedTargets = Array(12).fill(130205);
            parsed.forEach(item => {
              const mIdx = Number(item.Month) - 1;
              if (mIdx >= 0 && mIdx < 12) mappedTargets[mIdx] = Number(item.Target_kWh) || 130205;
            });
            setMonthlyTargets(mappedTargets);
          } catch (_) {}
        }
      }
    };
    fetchMonthlyTargets();
  }, [targets?.date, backendUrl]);

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

  const parts = targets.date ? targets.date.split('-') : [String(new Date().getFullYear()), String(new Date().getMonth() + 1).padStart(2, '0'), String(new Date().getDate()).padStart(2, '0')];
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
  const day = parseInt(parts[2], 10) || new Date().getDate();

  const workingDaysInMonth = getWorkingDaysCount(year, month - 1, activeWorkingDaysChecklist);
  const targetMonth = monthlyTargets[month - 1] ?? 130205;
  const isWorking = isDateWorkingDay(year, month - 1, day, activeWorkingDaysChecklist);
  const targetHarianCalculated = isWorking ? Math.round(targetMonth / workingDaysInMonth) : 0;
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
      label: m.month, kwh: m.kwh, target: monthlyTargets[idx] ?? 130205, cases: m.cases
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
    <div className="space-y-6">
      {/* Top Header with Sub-tab Selector */}
      <div className={`p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <div>
          <h2 className="text-lg font-black tracking-tight mb-1 text-slate-900 dark:text-slate-50">Kinerja P2TL ULP Salatiga Kota</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>Data aktif untuk: <strong>{getIndonesianDateString(targets.date)}</strong></span>
          </p>
        </div>

        {/* Subtab selection pills */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800">
          {[{ id: 'kpi', label: 'Realisasi' }, { id: 'targets', label: 'Target' }, { id: 'summary', label: `Ringkasan (${currentYear})` }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                subTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: KPI & BREAKDOWN ─────────────────────────────────────────── */}
      {subTab === 'kpi' && (
        <>
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 ${colors.card} ${borderRadius.xl} border ${colors.border} flex items-center justify-between`}>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kinerja Harian</span>
                <div className="text-xl font-black text-slate-800 dark:text-slate-50">{formatIndoNumber(relHarian)} kWh</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target: {formatIndoNumber(targetHarianCalculated)} kWh</div>
              </div>
              <ProgressRing percentage={harianPercent} colorClass={harianPercent >= 100 ? 'text-emerald-500' : harianPercent >= 50 ? 'text-amber-500' : 'text-rose-500'} />
            </div>

            <div className={`p-5 ${colors.card} ${borderRadius.xl} border ${colors.border} flex items-center justify-between`}>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kinerja Bulanan</span>
                <div className="text-xl font-black text-slate-800 dark:text-slate-50">{formatIndoNumber(relBulan)} kWh</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target: {formatIndoNumber(targetBulanKwh)} kWh ({currentMonthName})</div>
              </div>
              <ProgressRing percentage={bulanPercent} colorClass={bulanPercent >= 70 ? 'text-emerald-500' : 'text-amber-500'} />
            </div>

            <div className={`p-5 ${colors.card} ${borderRadius.xl} border ${colors.border} flex items-center justify-between`}>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kinerja {semesterLabel}</span>
                <div className="text-xl font-black text-slate-800 dark:text-slate-50">{formatIndoNumber(realSemester)} kWh</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target: {formatIndoNumber(targetSemester)} kWh</div>
              </div>
              <ProgressRing percentage={semesterPercent} colorClass={semesterPercent >= 70 ? 'text-emerald-500' : 'text-amber-500'} />
            </div>

            <div className={`p-5 ${colors.card} ${borderRadius.xl} border ${colors.border} flex items-center justify-between`}>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kinerja Kumulatif</span>
                <div className="text-xl font-black text-slate-800 dark:text-slate-50">{formatIndoNumber(relKumulatif)} kWh</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Target: {formatIndoNumber(targetKumulatifCalculated)} kWh</div>
              </div>
              <ProgressRing percentage={kumulatifPercent} colorClass={kumulatifPercent >= 70 ? 'text-emerald-500' : 'text-amber-500'} />
            </div>
          </div>

          {/* Breakdown & Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart - Komposisi Temuan */}
            <div className={`p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col justify-between`}>
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Komposisi Temuan</span>
                  </h3>
                  <select
                    value={compositionMetric}
                    onChange={(e) => setCompositionMetric(e.target.value)}
                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:border-emerald-500 transition-all"
                  >
                    <option value="tarif">Menurut Tarif</option>
                    <option value="golongan">Menurut Golongan</option>
                    <option value="daya">Menurut Daya</option>
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
                      const map = { 'R': 'Rumah Tangga (R)', 'B': 'Bisnis / Usaha (B)', 'S': 'Sosial / Tempat Ibadah (S)', 'I': 'Industri (I)', 'P': 'Publik / Kantor / PJU (P)' };
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
                    <div className="grid grid-cols-1 sm:grid-cols-10 gap-6 items-center py-2 flex-grow w-full">
                      <div className="sm:col-span-6 flex justify-center w-full">
                        <div className="relative w-48 h-48">
                          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                            <circle cx="50" cy="50" r="40" fill="transparent" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="10" />
                            {donutSegments.map((seg, idx) => (
                              <circle key={idx} cx="50" cy="50" r="40" fill="transparent" stroke={seg.color} strokeWidth="10" strokeDasharray={seg.strokeDasharray} strokeDashoffset={seg.strokeDashoffset} className="transition-all duration-500 ease-out" />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 leading-none">{totalCases}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-0.5">Kasus</span>
                            <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 mt-0.5 leading-none">
                              {formatIndoNumber(activeDataset.reduce((s, d) => s + (d.kwh || 0), 0))} kWh
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="sm:col-span-4 space-y-2.5 pr-1 w-full">
                        {donutSegments.map((seg, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full ${seg.twColor} flex-shrink-0`} />
                              <div className="min-w-0">
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{getLabelName(seg.class)}</div>
                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{formatIndoNumber(seg.kwh || 0)} kWh</div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right ml-2">
                              <div className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">{seg.cases} kasus</div>
                              <div className="text-[10px] font-bold text-slate-400">{Math.round(seg.percent)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bar Chart - Trend kWh */}
            <div className={`p-6 ${colors.card} ${borderRadius.xxxl} border ${colors.border} ${shadows.md} flex flex-col relative`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span>{granularity === 'hari' ? `Realisasi & Target kWh per Hari (${currentMonthName})` : granularity === 'minggu' ? `Realisasi & Target kWh per Minggu (${currentMonthName})` : 'Realisasi & Target kWh per Bulan'}</span>
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tampilkan:</span>
                  <select
                    value={granularity}
                    onChange={(e) => { setGranularity(e.target.value); setHoveredMonth(null); }}
                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-300 focus:border-emerald-500 transition-all"
                  >
                    <option value="hari">Per Hari</option>
                    <option value="minggu">Per Minggu</option>
                    <option value="bulan">Per Bulan</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /><span>Realisasi</span></div>
                <div className="flex items-center gap-1.5"><span className="w-4 h-0.5 border-t-2 border-dashed border-amber-500" /><span>Target</span></div>
              </div>

              {(() => {
                const maxKwh = Math.max(...currentChartData.map(d => d.kwh), ...currentChartData.map(d => d.target), 10000);
                const hasTrendData = currentChartData.some(d => d.kwh > 0 || d.target > 0);
                if (!hasTrendData) {
                  return <div className="flex-grow flex items-center justify-center min-h-[180px] text-xs text-slate-500 font-semibold">Tidak ada tren data yang terekam.</div>;
                }
                return (
                  <div className="flex-grow flex items-center justify-center min-h-[180px] pt-2">
                    <svg viewBox="0 0 500 210" className="w-full h-auto">
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
                              <text x={center} y="196" textAnchor="middle" fontSize="9" className="fill-slate-400 dark:fill-slate-500 font-extrabold">
                                {m.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}

              {hoveredMonth !== null && currentChartData[hoveredMonth] && (
                <div
                  className="absolute bg-slate-900/95 dark:bg-slate-950/95 text-slate-50 border border-slate-700/50 backdrop-blur-md rounded-xl p-3 shadow-xl pointer-events-none text-[11px] font-semibold space-y-1.5 z-10 transition-all duration-150"
                  style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 110 }}
                >
                  <div className="font-extrabold text-emerald-400 border-b border-slate-800 pb-1 mb-1">
                    {granularity === 'hari' ? `Tanggal ${currentChartData[hoveredMonth].label} ${currentMonthName}` :
                      granularity === 'minggu' ? `Minggu ke-${currentChartData[hoveredMonth].label.slice(1)}` :
                      currentChartData[hoveredMonth].label}
                  </div>
                  <div>Realisasi: <span className="font-black text-slate-100">{formatIndoNumber(currentChartData[hoveredMonth].kwh)} kWh</span></div>
                  <div className="border-t border-slate-800/60 pt-1 mt-1">Target: <span className="font-black text-amber-400">{formatIndoNumber(currentChartData[hoveredMonth].target)} kWh</span></div>
                  <div className="text-[10px] text-slate-400">Kasus: <span className="font-bold text-slate-200">{currentChartData[hoveredMonth].cases} Kasus</span></div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TAB 2: TARGET BULANAN ────────────────────────────────────────────── */}
      {subTab === 'targets' && (
        <MonthlyTargets workingDays={activeWorkingDaysChecklist} backendUrl={backendUrl} />
      )}

      {/* ── TAB 3: RINGKASAN ─────────────────────────────────────────────────── */}
      {subTab === 'summary' && (() => {
        const prevYear = year - 1;
        const prevMonthlyTrend = execSummary.prevMonthlyTrend ?? [];
        const totalTargetYear = monthlyTargets.reduce((s, v) => s + v, 0);
        const totalRealYear = execSummary.totalKwhYear;
        const sisaTarget = Math.max(0, totalTargetYear - totalRealYear);
        const sisaBulan = Math.max(1, 12 - month);
        const rataRataDibutuhkan = Math.round(sisaTarget / sisaBulan);
        const prevTotalKwhYtd = prevMonthlyTrend.slice(0, month).reduce((sum, m) => sum + (m?.kwh ?? 0), 0);
        const diffKwhYtd = totalRealYear - prevTotalKwhYtd;
        const pctGrowthYtd = prevTotalKwhYtd > 0 ? (diffKwhYtd / prevTotalKwhYtd) * 100 : (totalRealYear > 0 ? 100 : 0);
        const remainingMonths = Math.max(0, 12 - month);
        const avgRealKwh = month > 0 ? totalRealYear / month : 0;
        let remainingWorkingDays = 0;
        for (let m = month; m < 12; m++) remainingWorkingDays += getWorkingDaysCount(year, m, activeWorkingDaysChecklist);
        remainingWorkingDays = Math.max(1, remainingWorkingDays);
        const projectedKwhCurrent = Math.round(totalRealYear + (avgRealKwh * remainingMonths));
        const pctCurrent = totalTargetYear > 0 ? (projectedKwhCurrent / totalTargetYear) * 100 : 0;
        const gapCurrent = totalTargetYear - projectedKwhCurrent;
        const avgRequiredKwhCurrent = remainingMonths > 0 ? Math.round(sisaTarget / remainingMonths) : 0;
        const pctIncreaseRequiredCurrent = (avgRealKwh > 0 && sisaTarget > 0) ? Math.round(((avgRequiredKwhCurrent / avgRealKwh) - 1) * 100) : 0;
        const newTargetHarian = remainingWorkingDays > 0 ? Math.round(sisaTarget / remainingWorkingDays) : 0;
        const baselineTargetHarian = Math.round(targetMonth / Math.max(1, workingDaysInMonth));
        const pctDailyIncrease = (baselineTargetHarian > 0 && sisaTarget > 0) ? Math.round(((newTargetHarian / baselineTargetHarian) - 1) * 100) : 0;
        const target110Year = totalTargetYear * 1.10;
        const sisaTarget110 = Math.max(0, target110Year - totalRealYear);
        const avgRequiredKwh110 = remainingMonths > 0 ? Math.round(sisaTarget110 / remainingMonths) : 0;
        const pctEffortRequired110 = (avgRealKwh > 0 && sisaTarget110 > 0) ? Math.round(((avgRequiredKwh110 / avgRealKwh) - 1) * 100) : 0;
        const monthlyTrendData = execSummary.monthlyTrend || [];
        const monthsWithData = monthlyTrendData.filter(m => m.kwh > 0);
        const bestMonth = monthsWithData.length > 0 ? monthsWithData.reduce((best, m) => m.kwh > best.kwh ? m : best, monthsWithData[0]) : null;
        const worstMonth = monthsWithData.length > 0 ? monthsWithData.reduce((worst, m) => m.kwh < worst.kwh ? m : worst, monthsWithData[0]) : null;
        const yoyChartData = monthlyTrendData.map((m, idx) => ({ label: m.month, current: m.kwh, prev: prevMonthlyTrend[idx]?.kwh ?? 0, target: monthlyTargets[idx] ?? 0 }));
        const yoyMaxVal = Math.max(...yoyChartData.map(d => Math.max(d.current, d.prev, d.target)), 1);
        const targetKumulatifYtd = monthlyTargets.slice(0, month).reduce((sum, val) => sum + val, 0);
        const pctYtd = targetKumulatifYtd > 0 ? (totalRealYear / targetKumulatifYtd) * 100 : 0;
        const pctAnnual = totalTargetYear > 0 ? (totalRealYear / totalTargetYear) * 100 : 0;

        const getKpiStatus = (pYtd, currentMonth, real, targetYtd) => {
          const diff = real - targetYtd;
          const diffStr = diff >= 0 ? `surplus +${formatIndoNumber(diff)} kWh` : `defisit ${formatIndoNumber(Math.abs(diff))} kWh`;
          const monthsList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          const monthName = monthsList[currentMonth - 1] || '';
          if (pYtd >= 100) return { label: 'SANGAT BAIK', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', iconColor: 'text-emerald-500', description: `Kinerja luar biasa! Hingga bulan ${monthName}, realisasi kumulatif tahunan mencapai ${formatIndoNumber(real)} kWh. Angka ini mencatatkan ${diffStr} di atas target kumulatif (${formatIndoNumber(targetYtd)} kWh).` };
          if (pYtd >= 90) return { label: 'BAIK (ON TRACK)', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20', iconColor: 'text-teal-500', description: `Kinerja aman dan terkendali. Realisasi kumulatif tahunan hingga ${monthName} sebesar ${formatIndoNumber(real)} kWh berjalan on-track dengan pencapaian ${Math.round(pYtd)}% dari target kumulatif.` };
          if (pYtd >= 75) return { label: 'CUKUP (PERLU PERHATIAN)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', iconColor: 'text-amber-500', description: `Kinerja berada dalam zona kuning. Hingga bulan ${monthName}, pencapaian kumulatif berada di bawah target kumulatif dengan ${diffStr} (${Math.round(pYtd)}% dari target kumulatif).` };
          return { label: 'KURANG (KRITIS)', color: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20', iconColor: 'text-rose-500', description: `Status waspada/kritis! Target kWh kumulatif tahunan mengalami ${diffStr} yang signifikan dibandingkan target kumulatif.` };
        };
        const statusInfo = getKpiStatus(pctYtd, month, totalRealYear, targetKumulatifYtd);

        // Responsive month display control for YoY comparison table
        const activeMonthsCount = Math.max(1, month);
        const visibleYoYData = showAllYoYTable ? yoyChartData : yoyChartData.slice(0, activeMonthsCount);

        return (
          <div className="space-y-6">
            {/* Hero Status Card (Mobile-First) */}
            <div className={`p-5 sm:p-6 ${borderRadius.xxl} border ${colors.border} ${shadows.md} bg-white dark:bg-slate-900 flex flex-col lg:flex-row justify-between items-stretch gap-6 relative overflow-hidden`}>
              <div className="flex-1 space-y-4 z-10 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Status Pencapaian Kumulatif</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${statusInfo.color}`}>{statusInfo.label}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                    Analisis Pencapaian kWh Kumulatif Tahun {year}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl sm:block hidden">{statusInfo.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="space-y-0.5">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Realisasi Kumulatif</div>
                    <div className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-50">{formatIndoNumber(totalRealYear)} <span className="text-[9px] text-slate-400 font-medium">kWh</span></div>
                  </div>
                  <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800/80 pl-3">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Target Kumulatif</div>
                    <div className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-50">{formatIndoNumber(targetKumulatifYtd)} <span className="text-[9px] text-slate-400 font-medium">kWh</span></div>
                  </div>
                  <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800/80 pl-3">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Target Tahunan</div>
                    <div className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-50">{formatIndoNumber(totalTargetYear)} <span className="text-[9px] text-slate-400 font-medium">kWh</span></div>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-72 flex flex-row lg:flex-col items-center justify-between lg:justify-center p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50 rounded-xl z-10 shrink-0 gap-4 sm:gap-6">
                <div className="flex items-center lg:justify-center gap-3 lg:flex-col">
                  <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="32" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="6" fill="transparent" />
                      <circle cx="40" cy="40" r="32" className={`transition-all duration-1000 ease-out ${pctYtd >= 100 ? 'stroke-emerald-500' : pctYtd >= 90 ? 'stroke-teal-500' : pctYtd >= 75 ? 'stroke-amber-500' : 'stroke-rose-500'}`} strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - Math.min(100, pctYtd) / 100)} strokeLinecap="round" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-50">{Math.round(pctYtd)}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col lg:items-center">
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Pencapaian Kumulatif</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium sm:hidden block">{formatIndoNumber(totalRealYear)} / {formatIndoNumber(targetKumulatifYtd)} kWh</span>
                  </div>
                </div>
                <div className="flex-1 lg:w-full space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                    <span>Target Tahunan</span>
                    <span className="text-slate-700 dark:text-slate-300">{Math.round(pctAnnual)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-out bg-emerald-500`} style={{ width: `${Math.min(100, pctAnnual)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* YoY Chart & Detail Table (Responsive Layout) */}
            <div className={`p-5 sm:p-6 ${colors.card} ${borderRadius.xxl} border ${colors.border} ${shadows.md}`}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Perbandingan Bulanan kWh — {currentYear} vs {prevYear}</span>
                  </h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    Realisasi Kumulatif: <span className="font-bold text-slate-700 dark:text-slate-200">{formatIndoNumber(totalRealYear)} kWh</span> vs <span className="font-bold text-slate-700 dark:text-slate-200">{formatIndoNumber(prevTotalKwhYtd)} kWh ({prevYear})</span>
                    <span className={`ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black ${diffKwhYtd >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'}`}>
                      {diffKwhYtd >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {diffKwhYtd >= 0 ? '+' : ''}{Math.round(pctGrowthYtd)}% YoY
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-bold shrink-0">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" /><span className="text-slate-500 dark:text-slate-400">{prevYear}</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-slate-500 dark:text-slate-400">{currentYear}</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-0.5 bg-amber-500" /><span className="text-slate-500 dark:text-slate-400">Target</span></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* SVG Chart Container */}
                <div className="lg:col-span-8 relative w-full h-auto overflow-x-auto min-h-[160px]">
                  <svg width="100%" height="220" viewBox="0 0 720 220" preserveAspectRatio="none" className="overflow-visible min-w-[500px]">
                    {yoyChartData.map((d, idx) => {
                      const groupWidth = 720 / 12;
                      const barW = 12, gap = 2;
                      const centerX = groupWidth * idx + groupWidth / 2;
                      const prevBarX = centerX - barW - gap / 2;
                      const currBarX = centerX + gap / 2;
                      const maxH = 175;
                      const prevH = yoyMaxVal > 0 ? (d.prev / yoyMaxVal) * maxH : 0;
                      const currH = yoyMaxVal > 0 ? (d.current / yoyMaxVal) * maxH : 0;
                      const targetY = yoyMaxVal > 0 ? 185 - (d.target / yoyMaxVal) * maxH : 185;
                      return (
                        <g key={idx}>
                          <rect x={prevBarX} y={185 - prevH} width={barW} height={Math.max(prevH, 1)} rx="1.5" className="fill-slate-200 dark:fill-slate-800 transition-all duration-350" />
                          <rect x={currBarX} y={185 - currH} width={barW} height={Math.max(currH, 1)} rx="1.5" className="fill-emerald-500 dark:fill-emerald-500/80 transition-all duration-350" />
                          <line x1={prevBarX - 2} y1={targetY} x2={currBarX + barW + 2} y2={targetY} className="stroke-amber-500" strokeWidth="1.5" strokeDasharray="3,2" />
                          <text x={centerX} y="202" textAnchor="middle" fontSize="9" className="fill-slate-400 dark:fill-slate-500 font-bold">{d.label}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* YoY Table with Mobile view control */}
                <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800/80 lg:pl-6 pt-4 lg:pt-0 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Rincian Perbandingan Bulanan</span>
                    <span className="text-[9px] text-slate-400 font-semibold sm:hidden block">Tampil {visibleYoYData.length} Bulan</span>
                  </div>
                  <div className="overflow-x-auto pr-1 text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80">
                          <th className="pb-1.5">Bulan</th>
                          <th className="pb-1.5 text-right">{prevYear}</th>
                          <th className="pb-1.5 text-right">{currentYear}</th>
                          <th className="pb-1.5 text-right">YoY (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/40">
                        {visibleYoYData.map((d, idx) => {
                          const mDiff = d.current - d.prev;
                          const mPct = d.prev > 0 ? (mDiff / d.prev) * 100 : (d.current > 0 ? 100 : 0);
                          const isCurrentActive = idx < month;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                              <td className="py-1.5 font-bold text-slate-600 dark:text-slate-300">{d.label}</td>
                              <td className="py-1.5 text-right text-slate-500 dark:text-slate-400 font-semibold">{formatIndoNumber(d.prev)}</td>
                              <td className="py-1.5 text-right text-slate-800 dark:text-slate-100 font-bold">{isCurrentActive ? formatIndoNumber(d.current) : '-'}</td>
                              <td className="py-1.5 text-right font-black">
                                {isCurrentActive ? (
                                  <span className={`inline-flex items-center gap-0.5 text-[10px] ${mDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
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
                  {/* Toggle view control for YoY table */}
                  <button
                    onClick={() => setShowAllYoYTable(!showAllYoYTable)}
                    className="w-full mt-3 py-1.5 text-center text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg transition-all"
                  >
                    {showAllYoYTable ? 'Sembunyikan Bulan Mendatang' : 'Tampilkan Seluruh Bulan'}
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnostic Cards (Mobile-First: 2x2 Grid, Desktop: 4 Grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-2 flex flex-col justify-between`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/10"><Target className="w-3.5 h-3.5" /></div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Sisa Target</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight">
                    {formatIndoNumber(sisaTarget)} <span className="text-[10px] text-slate-400 font-medium">kWh</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-1 w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-emerald-500`} style={{ width: `${Math.min(100, totalTargetYear > 0 ? (totalRealYear / totalTargetYear) * 100 : 0)}%` }} />
                  </div>
                  <div className="text-[8px] text-slate-400 font-medium truncate">Progress: {totalTargetYear > 0 ? Math.round((totalRealYear / totalTargetYear) * 100) : 0}%</div>
                </div>
              </div>

              <div className={`p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-2 flex flex-col justify-between`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded border ${rataRataDibutuhkan > (monthlyTargets[month - 1] ?? 130205) * 1.2 ? 'bg-rose-500/10 text-rose-500 border-rose-500/10' : 'bg-sky-500/10 text-sky-600 border-sky-500/10'}`}><AlertTriangle className="w-3.5 h-3.5" /></div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Kebutuhan/Bulan</span>
                  </div>
                  <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-50 leading-tight">
                    {formatIndoNumber(rataRataDibutuhkan)} <span className="text-[10px] text-slate-400 font-medium">kWh</span>
                  </div>
                </div>
                <div className="text-[8px] text-slate-400 font-medium truncate">Untuk {sisaBulan} bulan tersisa</div>
              </div>

              <div className={`p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-1.5 flex flex-col justify-between`}>
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/10"><Trophy className="w-3.5 h-3.5" /></div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Bulan Terbaik</span>
                </div>
                {bestMonth ? (
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">{bestMonth.month}</div>
                    <div className="text-[8px] text-slate-400 font-medium truncate">{formatIndoNumber(bestMonth.kwh)} kWh · {bestMonth.cases} kasus</div>
                  </div>
                ) : <div className="text-[10px] text-slate-400 font-medium">Belum ada data</div>}
              </div>

              <div className={`p-4 ${colors.card} ${borderRadius.xl} border ${colors.border} ${shadows.md} space-y-1.5 flex flex-col justify-between`}>
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded border border-rose-500/10"><TrendingDown className="w-3.5 h-3.5" /></div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Bulan Terburuk</span>
                </div>
                {worstMonth ? (
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-rose-500 dark:text-rose-400">{worstMonth.month}</div>
                    <div className="text-[8px] text-slate-400 font-medium truncate">{formatIndoNumber(worstMonth.kwh)} kWh · {worstMonth.cases} kasus</div>
                  </div>
                ) : <div className="text-[10px] text-slate-400 font-medium">Belum ada data</div>}
              </div>
            </div>

            {/* Scenario Projections (Mobile-First: Toggles on Mobile, 3 Cards on Desktop) */}
            <div className={`p-5 sm:p-6 ${colors.card} ${borderRadius.xxl} border ${colors.border} ${shadows.md} space-y-4`}>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/10"><TrendingUp className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">Skenario Proyeksi Pencapaian Target Tahunan</h3>
                  <p className="text-[9px] text-slate-400 font-medium">Simulasi target kumulatif tahunan {year} ({formatIndoNumber(totalTargetYear)} kWh) berdasarkan 3 skenario taktis.</p>
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
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Apabila Progres Seperti Saat Ini</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${gapCurrent <= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {gapCurrent <= 0 ? 'TERCAPAI' : 'PERLU AKSELERASI'}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatIndoNumber(projectedKwhCurrent)} <span className="text-[10px] text-slate-400 font-medium">kWh</span></div>
                    <div className="text-[9px] text-slate-400 font-medium">Proyeksi Akhir Tahun</div>
                    <p className="text-[11px] text-slate-505 dark:text-slate-400 leading-relaxed font-medium">
                      {gapCurrent > 0
                        ? <>Dengan ritme saat ini, akhir tahun diproyeksikan defisit <span className="font-bold text-rose-500">{formatIndoNumber(gapCurrent)} kWh</span>. Agar target tercapai, sisa {remainingMonths} bulan membutuhkan rata-rata <span className="font-bold text-slate-700 dark:text-slate-300">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bulan</span> (naik <span className="font-bold text-rose-500">{pctIncreaseRequiredCurrent}%</span> dari rata-rata saat ini).</>
                        : <>Dengan ritme saat ini, akhir tahun diproyeksikan surplus <span className="font-bold text-emerald-500">{formatIndoNumber(Math.abs(gapCurrent))} kWh</span>. Target kumulatif tahunan diproyeksikan dapat tercapai dengan sukses.</>}
                    </p>
                    <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Proyeksi Pencapaian</span><span>{Math.round(pctCurrent)}%</span></div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${gapCurrent <= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, pctCurrent)}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {activeScenario === 'adjusted' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Jika Target Harian Kumulatif Tercapai</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">TERCAPAI</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatIndoNumber(totalTargetYear)} <span className="text-[10px] text-slate-400 font-medium">kWh</span></div>
                    <div className="text-[9px] text-slate-400 font-medium">Disesuaikan untuk Target</div>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
                      {pctDailyIncrease > 0
                        ? <>Agar target kumulatif tercapai, target harian sisa <span className="font-bold text-slate-700 dark:text-slate-300">{remainingWorkingDays} hari kerja</span> tahun ini harus disesuaikan menjadi <span className="font-bold text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (naik <span className="font-bold text-rose-500">{pctDailyIncrease}%</span> dari target harian awal).</>
                        : <>Target kumulatif tahunan berjalan aman. Target harian disesuaikan menjadi <span className="font-bold text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (turun <span className="font-bold text-emerald-600">{Math.abs(pctDailyIncrease)}%</span> dari target harian awal).</>}
                    </p>
                    <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 space-y-1">
                      <div className="flex justify-between"><span>Target Harian Awal:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(baselineTargetHarian)} kWh/hari</span></div>
                      <div className="flex justify-between"><span>Target Harian Baru:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(newTargetHarian)} kWh/hari</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Proyeksi Pencapaian</span><span>100%</span></div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} /></div>
                    </div>
                  </div>
                )}

                {activeScenario === 'optimistic' && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Cara Mencapai Target 110%</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${totalRealYear >= target110Year ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {totalRealYear >= target110Year ? 'TERCAPAI' : `PERLU EFFORT +${pctEffortRequired110}%`}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatIndoNumber(Math.round(target110Year))} <span className="text-[10px] text-slate-400 font-medium">kWh</span></div>
                    <div className="text-[9px] text-slate-400 font-medium">Target Optimis (110%)</div>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
                      {totalRealYear < target110Year
                        ? <>Agar target optimis 110% tercapai (<span className="font-bold text-slate-700 dark:text-slate-300">{formatIndoNumber(Math.round(target110Year))} kWh</span>), performa di sisa {remainingMonths} bulan harus ditingkatkan sebesar <span className="font-bold text-rose-500">{pctEffortRequired110}%</span> (membutuhkan rata-rata <span className="font-bold text-slate-700 dark:text-slate-300">{formatIndoNumber(avgRequiredKwh110)} kWh/bulan</span>).</>
                        : <>Target optimis 110% tahunan sebesar <span className="font-bold text-emerald-500">{formatIndoNumber(Math.round(target110Year))} kWh</span> telah berhasil dilampaui!</>}
                    </p>
                    <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan (110%):</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(avgRequiredKwh110)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Progres Terhadap Target 110%</span><span>{Math.round(target110Year > 0 ? (totalRealYear / target110Year) * 100 : 0)}%</span></div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${totalRealYear >= target110Year ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, target110Year > 0 ? (totalRealYear / target110Year) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Only: 3 Column Parallel Layout */}
              <div className="hidden sm:grid grid-cols-3 gap-6">
                {/* Scenario 1 */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Apabila Progres Seperti Saat Ini</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${gapCurrent <= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {gapCurrent <= 0 ? 'TERCAPAI' : 'PERLU AKSELERASI'}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatIndoNumber(projectedKwhCurrent)} <span className="text-[10px] text-slate-400 font-medium">kWh</span></div>
                    <div className="text-[9px] text-slate-400 font-medium">Proyeksi Akhir Tahun</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      {gapCurrent > 0
                        ? <>Dengan ritme saat ini, akhir tahun diproyeksikan defisit <span className="font-bold text-rose-500">{formatIndoNumber(gapCurrent)} kWh</span>. Agar target tercapai, sisa {remainingMonths} bulan membutuhkan rata-rata <span className="font-bold text-slate-700 dark:text-slate-300">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bulan</span> (naik <span className="font-bold text-rose-500">{pctIncreaseRequiredCurrent}%</span> dari rata-rata saat ini).</>
                        : <>Dengan ritme saat ini, akhir tahun diproyeksikan surplus <span className="font-bold text-emerald-500">{formatIndoNumber(Math.abs(gapCurrent))} kWh</span>. Target kumulatif tahunan diproyeksikan dapat tercapai dengan sukses.</>}
                    </p>
                  </div>
                  <div>
                    <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(avgRequiredKwhCurrent)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 mt-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Proyeksi Pencapaian</span><span>{Math.round(pctCurrent)}%</span></div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${gapCurrent <= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, pctCurrent)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scenario 2 */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Jika Target Harian Kumulatif Tercapai</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">TERCAPAI</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatIndoNumber(totalTargetYear)} <span className="text-[10px] text-slate-400 font-medium">kWh</span></div>
                    <div className="text-[9px] text-slate-400 font-medium">Disesuaikan untuk Target</div>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
                      {pctDailyIncrease > 0
                        ? <>Agar target kumulatif tercapai, target harian sisa <span className="font-bold text-slate-700 dark:text-slate-300">{remainingWorkingDays} hari kerja</span> tahun ini harus disesuaikan menjadi <span className="font-bold text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (naik <span className="font-bold text-rose-500">{pctDailyIncrease}%</span> dari target harian awal).</>
                        : <>Target kumulatif tahunan berjalan aman. Target harian disesuaikan menjadi <span className="font-bold text-emerald-500">{formatIndoNumber(newTargetHarian)} kWh/hari</span> (turun <span className="font-bold text-emerald-600">{Math.abs(pctDailyIncrease)}%</span> dari target harian awal).</>}
                    </p>
                  </div>
                  <div>
                    <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 space-y-1">
                      <div className="flex justify-between"><span>Target Harian Awal:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(baselineTargetHarian)} kWh/hari</span></div>
                      <div className="flex justify-between"><span>Target Harian Baru:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(newTargetHarian)} kWh/hari</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 mt-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Proyeksi Pencapaian</span><span>100%</span></div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: '100%' }} /></div>
                    </div>
                  </div>
                </div>

                {/* Scenario 3 */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Cara Mencapai Target 110%</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${totalRealYear >= target110Year ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                        {totalRealYear >= target110Year ? 'TERCAPAI' : `PERLU EFFORT +${pctEffortRequired110}%`}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatIndoNumber(Math.round(target110Year))} <span className="text-[10px] text-slate-400 font-medium">kWh</span></div>
                    <div className="text-[9px] text-slate-400 font-medium">Target Optimis (110%)</div>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
                      {totalRealYear < target110Year
                        ? <>Agar target optimis 110% tercapai (<span className="font-bold text-slate-700 dark:text-slate-300">{formatIndoNumber(Math.round(target110Year))} kWh</span>), performa di sisa {remainingMonths} bulan harus ditingkatkan sebesar <span className="font-bold text-rose-500">{pctEffortRequired110}%</span> (membutuhkan rata-rata <span className="font-bold text-slate-700 dark:text-slate-300">{formatIndoNumber(avgRequiredKwh110)} kWh/bulan</span>).</>
                        : <>Target optimis 110% tahunan sebesar <span className="font-bold text-emerald-500">{formatIndoNumber(Math.round(target110Year))} kWh</span> telah berhasil dilampaui!</>}
                    </p>
                  </div>
                  <div>
                    <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 space-y-1">
                      <div className="flex justify-between"><span>Rata-rata Realisasi:</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(Math.round(avgRealKwh))} kWh/bln</span></div>
                      <div className="flex justify-between"><span>Kebutuhan Bulanan (110%):</span><span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatIndoNumber(avgRequiredKwh110)} kWh/bln</span></div>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 mt-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400"><span>Progres Terhadap Target 110%</span><span>{Math.round(target110Year > 0 ? (totalRealYear / target110Year) * 100 : 0)}%</span></div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
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
