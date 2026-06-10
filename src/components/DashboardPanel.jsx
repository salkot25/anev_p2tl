import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Calendar } from 'lucide-react';
import DashboardAnalytics from './DashboardAnalytics';

/**
 * DashboardPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Wrapper that fetches Realisasi & Target data from the Google Sheets backend
 * and feeds it into DashboardAnalytics as structured props.
 *
 * Data sources (via code.gs):
 *   GET ?action=get_dashboard_data&date=YYYY-MM-DD
 *   → { status, target: {...}, realization: {...}, execSummary: {...} }
 *
 * Fallback: reads from localStorage cache when offline.
 */

const CACHE_KEY = 'p2tl_dashboard_cache';

// Build a default/empty data structure when nothing is loaded
function buildDefaultData(date) {
  const today = date || new Date().toISOString().split('T')[0];
  return {
    target: {
      date: today,
      targetHarianKwh: 0,
      targetKumulatifKwh: 0,
      targetLkbkPlg: 0,
      target3PhasaPlg: 0,
      targetDlpdPlg: 0,
      targetPengembanganPlg: 0,
      targetTsPeriodikPlg: 0,
      targetTsMacetPlg: 0,
      targetLainnyaPlg: 0,
    },
    realization: {
      realisasiHarianKwh: 0,
      realisasiKumulatifKwh: 0,
      realisasiHarianTs: 0,
      realisasiKumulatifTs: 0,
      inspectionsCountHarian: 0,
      inspectionsCountKumulatif: 0,
    },
    execSummary: {
      totalCasesYear: 0,
      totalKwhYear: 0,
      totalTsYear: 0,
      monthlyTrend: [],
      tariffBreakdown: [],
      golonganBreakdown: [],
      dayaBreakdown: [],
      kwhBreakdown: [],
      prevTotalCasesYear: 0,
      prevTotalKwhYear: 0,
      prevTotalTsYear: 0,
      prevMonthlyTrend: [],
      topFindings: [],
    }
  };
}

function getYearFromDate(dateStr) {
  if (!dateStr) return String(new Date().getFullYear());
  return dateStr.split('-')[0] || String(new Date().getFullYear());
}

const SUB_TABS = [
  { id: 'kpi', label: 'Realisasi' },
  { id: 'targets', label: 'Target' },
  { id: 'summary', label: 'Ringkasan' }
];

export default function DashboardPanel({ backendUrl }) {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  const defaultDate = localToday.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [subTab, setSubTab] = useState('kpi');

  const fetchDashboardData = useCallback(async (date) => {
    setLoading(true);
    setError(null);

    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;

    if (!url) {
      // No backend URL configured — try cache, then show setup message
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setData(parsed);
          setIsOnline(false);
          setLoading(false);
          return;
        } catch {
          // Cache parsing failed, ignore
        }
      }
      setData(buildDefaultData(date));
      setIsOnline(false);
      setLoading(false);
      setError('Backend URL belum dikonfigurasi. Silakan atur URL di halaman Pengaturan.');
      return;
    }

    try {
      const response = await fetch(`${url}?action=get_dashboard_data&date=${date}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.status === 'success') {
        const dashData = {
          target: {
            date: result.date || date,
            targetHarianKwh: Number(result.target?.targetHarianKwh || result.target?.Target_Harian_kWh) || 0,
            targetKumulatifKwh: Number(result.target?.targetKumulatifKwh || result.target?.Target_Kumulatif_kWh) || 0,
            targetLkbkPlg: Number(result.target?.targetLkbkPlg || result.target?.Target_LKBK_Plg) || 0,
            target3PhasaPlg: Number(result.target?.target3PhasaPlg || result.target?.Target_3Phasa_Plg) || 0,
            targetDlpdPlg: Number(result.target?.targetDlpdPlg || result.target?.Target_DLPD_Plg) || 0,
            targetPengembanganPlg: Number(result.target?.targetPengembanganPlg || result.target?.Target_Pengembangan_Plg) || 0,
            targetTsPeriodikPlg: Number(result.target?.targetTsPeriodikPlg || result.target?.Target_TS_Periodik_Plg) || 0,
            targetTsMacetPlg: Number(result.target?.targetTsMacetPlg || result.target?.Target_TS_Macet_Plg) || 0,
            targetLainnyaPlg: Number(result.target?.targetLainnyaPlg || result.target?.Target_Lainnya_Plg) || 0,
          },
          realization: {
            realisasiHarianKwh: Number(result.realization?.realisasiHarianKwh) || 0,
            realisasiKumulatifKwh: Number(result.realization?.realisasiKumulatifKwh) || 0,
            realisasiHarianTs: Number(result.realization?.realisasiHarianTs) || 0,
            realisasiKumulatifTs: Number(result.realization?.realisasiKumulatifTs) || 0,
            inspectionsCountHarian: Number(result.realization?.inspectionsCountHarian) || 0,
            inspectionsCountKumulatif: Number(result.realization?.inspectionsCountKumulatif) || 0,
          },
          execSummary: {
            totalCasesYear: Number(result.execSummary?.totalCasesYear) || 0,
            totalKwhYear: Number(result.execSummary?.totalKwhYear) || 0,
            totalTsYear: Number(result.execSummary?.totalTsYear) || 0,
            monthlyTrend: Array.isArray(result.execSummary?.monthlyTrend) ? result.execSummary.monthlyTrend : [],
            tariffBreakdown: Array.isArray(result.execSummary?.tariffBreakdown) ? result.execSummary.tariffBreakdown : [],
            golonganBreakdown: Array.isArray(result.execSummary?.golonganBreakdown) ? result.execSummary.golonganBreakdown : [],
            dayaBreakdown: Array.isArray(result.execSummary?.dayaBreakdown) ? result.execSummary.dayaBreakdown : [],
            kwhBreakdown: Array.isArray(result.execSummary?.kwhBreakdown) ? result.execSummary.kwhBreakdown : [],
            prevTotalCasesYear: Number(result.execSummary?.prevTotalCasesYear) || 0,
            prevTotalKwhYear: Number(result.execSummary?.prevTotalKwhYear) || 0,
            prevTotalTsYear: Number(result.execSummary?.prevTotalTsYear) || 0,
            prevMonthlyTrend: Array.isArray(result.execSummary?.prevMonthlyTrend) ? result.execSummary.prevMonthlyTrend : [],
            topFindings: Array.isArray(result.execSummary?.topFindings) ? result.execSummary.topFindings : [],
          }
        };

        setData(dashData);
        setIsOnline(true);
        setLastFetch(new Date());
        // Cache the data
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(dashData));
        } catch {
          // Ignored
        }
      } else {
        throw new Error(result.message || 'Invalid response');
      }
    } catch (err) {
      console.warn('Dashboard fetch failed, using cache:', err);
      setIsOnline(false);

      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Update date in cached data
          setData({ ...parsed, target: { ...parsed.target, date } });
          setError('Menggunakan data cache. Koneksi ke backend gagal.');
        } catch {
          setData(buildDefaultData(date));
          setError('Koneksi ke backend gagal dan tidak ada cache tersedia.');
        }
      } else {
        setData(buildDefaultData(date));
        setError('Koneksi ke backend gagal. Pastikan URL backend dikonfigurasi di halaman Pengaturan.');
      }
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData(selectedDate);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedDate, fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData(selectedDate);
  };

  const currentYear = getYearFromDate(selectedDate);

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ── Unified Command Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Date + Status + Refresh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all w-[148px]"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Inline status indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-amber-500 shadow-sm shadow-amber-500/50'}`} />
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hidden sm:block">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {lastFetch && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:block">
                · {lastFetch.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Sub-tab navigation pills */}
        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 px-3 py-2 text-[11px] font-bold rounded-[10px] transition-all duration-200 ${
                subTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700/80'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.id === 'summary' ? `${tab.label} (${currentYear})` : tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold leading-relaxed">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-4 animate-pulse">
          <div className="h-36 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
            <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          </div>
        </div>
      )}

      {/* Main Analytics Dashboard */}
      {data && (
        <DashboardAnalytics
          targets={{ ...data.target, date: selectedDate }}
          realization={data.realization}
          execSummary={data.execSummary}
          backendUrl={backendUrl}
          subTab={subTab}
        />
      )}
    </div>
  );
}
