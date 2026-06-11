import { useState, useEffect, useMemo } from 'react';
import { Save, AlertTriangle, CheckCircle2, TrendingUp, Zap, Target, BarChart3 } from 'lucide-react';

// Design tokens (inlined from tokens.ts)
const colors = {
  card: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none transition-all duration-200',
  border: 'border-slate-200 dark:border-slate-800 transition-colors duration-200',
  accentBg: 'bg-emerald-500',
  accentHoverBg: 'hover:bg-emerald-600',
  textDark: 'text-slate-950 dark:text-slate-50 transition-colors duration-200',
};
const borderRadius = { xl: 'rounded-lg', xxl: 'rounded-xl', xxxl: 'rounded-2xl' };
const shadows = { md: 'shadow-md', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' };

function formatIndoNumber(value) {
  if (value === undefined || value === null || value === '') return '..........';
  const num = Number(value);
  if (isNaN(num)) return '..........';
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function getWorkingDaysCount(monthIndex, yearStr, checklist) {
  const year = parseInt(yearStr, 10);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  let workingDays = 0;
  
  const { monFri = true, sat = true, sun = true } = checklist || {};

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, monthIndex, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (monFri) workingDays++;
    } else if (dayOfWeek === 6) {
      if (sat) workingDays++;
    } else if (dayOfWeek === 0) {
      if (sun) workingDays++;
    }
  }
  return workingDays;
}

export default function MonthlyTargets({ workingDays, backendUrl }) {
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
        // ignore
      }
    }
    const oldSetting = localStorage.getItem('p2tl_working_days') || '7';
    if (oldSetting === '5') return { monFri: true, sat: false, sun: false };
    if (oldSetting === '6') return { monFri: true, sat: true, sun: false };
    return { monFri: true, sat: true, sun: true };
  }, [workingDays]);
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [targets, setTargets] = useState(() => {
    const initialYear = String(new Date().getFullYear());
    const cacheKey = `p2tl_monthly_targets_cache_${initialYear}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const mappedTargets = Array(12).fill(0);
        parsed.forEach(item => {
          const mIdx = Number(item.Month) - 1;
          if (mIdx >= 0 && mIdx < 12) mappedTargets[mIdx] = Number(item.Target_kWh) || 0;
        });
        return mappedTargets;
      } catch {
        // ignore
      }
    }
    return Array(12).fill(0);
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  useEffect(() => {
    let active = true;

    // 1. Instantly load from cache for the selected year to prevent layout shifts or empty state
    const cacheKey = `p2tl_monthly_targets_cache_${selectedYear}`;
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
        
        // Defer state update to next tick to avoid synchronous setState inside effect warning
        setTimeout(() => {
          if (active) {
            setTargets(mappedTargets);
          }
        }, 0);
        cacheLoaded = true;
      } catch {
        // ignore
      }
    }

    // 2. Background revalidation (stale-while-revalidate)
    const fetchFromNetwork = async () => {
      // Only show full loading spinner if we don't have cached data
      if (!cacheLoaded) {
        setLoading(true);
      }
      
      try {
        const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
        if (url) {
          const response = await fetch(`${url}?action=get_monthly_targets&year=${selectedYear}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          if (!response.ok) throw new Error('Network error');
          const result = await response.json();
          if (result.status === 'success' && Array.isArray(result.data) && active) {
            localStorage.setItem(cacheKey, JSON.stringify(result.data));
            const mappedTargets = Array(12).fill(0);
            result.data.forEach(item => {
              const mIdx = Number(item.Month) - 1;
              if (mIdx >= 0 && mIdx < 12) mappedTargets[mIdx] = Number(item.Target_kWh) || 0;
            });
            setTargets(mappedTargets);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat target dari network:', err);
        // Only show error banner if we don't have any cached data at all
        if (!cacheLoaded && active) {
          setTargets(Array(12).fill(0));
          setStatus({ show: true, success: false, message: 'Gagal mengambil data target. Menggunakan nilai default.' });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchFromNetwork();

    return () => {
      active = false;
    };
  }, [selectedYear, backendUrl]);

  const handleTargetChange = (monthIdx, value) => {
    const newTargets = [...targets];
    if (value === '') { newTargets[monthIdx] = 0; }
    else {
      const num = parseInt(value, 10);
      if (!isNaN(num)) newTargets[monthIdx] = num;
    }
    setTargets(newTargets);
  };

  const handleSaveTargets = async () => {
    setSaving(true);
    setStatus(null);
    const cacheKey = `p2tl_monthly_targets_cache_${selectedYear}`;
    const cachedData = targets.map((val, i) => ({ Month: i + 1, Target_kWh: val }));
    localStorage.setItem(cacheKey, JSON.stringify(cachedData));

    try {
      const baseUrl = localStorage.getItem('p2tl_backend_url') || backendUrl;
      if (!baseUrl) throw new Error('No URL');
      const postUrl = baseUrl.includes('?') ? `${baseUrl}&action=save_monthly_targets` : `${baseUrl}?action=save_monthly_targets`;
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'save_monthly_targets', year: selectedYear, targets: cachedData })
      });
      const result = await response.json();
      if (result.status === 'success') {
        setStatus({ show: true, success: true, message: `Target bulanan tahun ${selectedYear} berhasil disimpan ke Google Sheets!` });
      } else {
        setStatus({ show: true, success: false, message: 'Koneksi gagal. Target bulanan disimpan secara lokal sebagai draft (Offline Mode).' });
      }
    } catch {
      setStatus({ show: true, success: false, message: 'Koneksi gagal. Target bulanan disimpan secara lokal sebagai draft (Offline Mode).' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(prev => prev ? { ...prev, show: false } : null), 4000);
    }
  };

  const cumulativeTargets = targets.reduce((acc, currentVal, idx) => {
    if (idx === 0) { acc.push(currentVal); }
    else { acc.push(acc[idx - 1] + currentVal); }
    return acc;
  }, []);

  const totalYearTarget = targets.reduce((sum, val) => sum + val, 0);
  const targetSemester1 = targets.slice(0, 6).reduce((sum, val) => sum + val, 0);
  const targetSemester2 = targets.slice(6, 12).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      {status?.show && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border text-sm transition-all ${
          status.success
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        }`}>
          {status.success ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="font-semibold">{status.message}</span>
        </div>
      )}

       {/* Split Layout: Left for summary & control sidebar, Right for input table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Sticky Summary & Controls Sidebar (Col Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          
          {/* Controls Card (Title, Subtitle, Year Selector, Save Button) */}
          <div className={`p-6 ${colors.card} ${borderRadius.xxl} border ${colors.border} ${shadows.md} space-y-5 relative overflow-hidden animate-fade-in-up`}>
            {/* Top accent gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
            
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Target className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-tight mb-1 text-slate-800 dark:text-slate-50">Target Bulanan</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Kelola target kWh untuk setiap bulan untuk menghitung kumulatif tahunan.
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Pilih Tahun</span>
                <div className="flex flex-wrap gap-1.5">
                  {['2024', '2025', '2026', '2027'].map((yr) => {
                    const isActive = selectedYear === yr;
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setSelectedYear(yr)}
                        className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all active:scale-[0.97] ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-[0_4px_12px_rgba(16,185,129,0.25)] border border-emerald-400/10'
                            : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSaveTargets}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold tracking-wide rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 hover:text-black shadow-[0_4px_15px_rgba(16,185,129,0.15)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.25)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/20"
              >
                {saving ? (
                  <svg className="animate-spin h-3.5 w-3.5 text-current" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Simpan Target ke Sheets</span>
              </button>
            </div>
          </div>

          {/* Main Summary Card */}
          <div className={`p-6 ${colors.card} ${borderRadius.xxl} border ${colors.border} ${shadows.md} flex-1 flex flex-col justify-between relative overflow-hidden animate-fade-in-up delay-75`}>
            {/* Top accent gradient line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-500 via-cyan-550 to-blue-500" />
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex-shrink-0">
                  <BarChart3 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight mb-1 text-slate-800 dark:text-slate-50">Ringkasan Target</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Distribusi target kWh tahun {selectedYear} berdasarkan semester dan rata-rata.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-6">
                {/* Hero Total Target */}
                <div className="group p-4 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/5 rounded-xl border border-emerald-500/10 dark:border-emerald-400/10 flex items-center justify-between gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-emerald-500/20 cursor-pointer">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Target Setahun</span>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatIndoNumber(totalYearTarget)} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">kWh</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

                {/* Average Monthly Target */}
                <div className="group p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/5 rounded-xl border border-blue-500/10 dark:border-blue-400/10 flex items-center justify-between gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-blue-500/20 cursor-pointer">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Rata-Rata Bulanan</span>
                    <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                      {formatIndoNumber(Math.round(totalYearTarget / 12))} <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">kWh</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                    <Zap className="w-4.5 h-4.5" />
                  </div>
                </div>

                {/* Semester Breakdown Section */}
                <div className="space-y-4 pt-2">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Distribusi Semester</div>

                  {/* Semester 1 */}
                  {(() => {
                    const s1Percent = totalYearTarget > 0 ? Math.round((targetSemester1 / totalYearTarget) * 100) : 0;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-300">Semester 1 (Jan - Jun)</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{formatIndoNumber(targetSemester1)} kWh</span>
                        </div>
                        <div className="h-5 w-full bg-slate-150/60 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-850/80 rounded-lg overflow-hidden relative hover:scale-[1.01] hover:shadow-[0_0_12px_rgba(16,185,129,0.15)] transition-all duration-300 cursor-pointer">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                            style={{ width: `${s1Percent}%` }}
                          >
                            {s1Percent > 12 && (
                              <span className="text-[9px] font-black text-slate-950 select-none animate-fade-in">
                                {s1Percent}%
                              </span>
                            )}
                          </div>
                          {s1Percent <= 12 && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 dark:text-slate-400 select-none">
                              {s1Percent}%
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">Porsi: {s1Percent}% dari setahun</div>
                      </div>
                    );
                  })()}

                  {/* Semester 2 */}
                  {(() => {
                    const s2Percent = totalYearTarget > 0 ? Math.round((targetSemester2 / totalYearTarget) * 100) : 0;
                    return (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-300">Semester 2 (Jul - Des)</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">{formatIndoNumber(targetSemester2)} kWh</span>
                        </div>
                        <div className="h-5 w-full bg-slate-150/60 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-850/80 rounded-lg overflow-hidden relative hover:scale-[1.01] hover:shadow-[0_0_12px_rgba(59,130,246,0.15)] transition-all duration-300 cursor-pointer">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                            style={{ width: `${s2Percent}%` }}
                          >
                            {s2Percent > 12 && (
                              <span className="text-[9px] font-black text-white select-none animate-fade-in">
                                {s2Percent}%
                              </span>
                            )}
                          </div>
                          {s2Percent <= 12 && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 dark:text-slate-400 select-none">
                              {s2Percent}%
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">Porsi: {s2Percent}% dari setahun</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Subtle help note */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
              * Perubahan target bulanan di sebelah kanan akan langsung memperbarui kalkulasi aggregasi semester dan rata-rata tahunan secara real-time. Tekan tombol **Simpan Target ke Sheets** untuk menyimpan.
            </div>
          </div>
        </div>

        {/* Right Column: Months Input Form (Col Span 8) */}
        <div className={`p-6 ${colors.card} ${borderRadius.xxl} border ${colors.border} ${shadows.md} lg:col-span-8 flex flex-col relative overflow-hidden`}>
          {/* Top accent gradient line for right card */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-400" />
          
          {loading && (
            <div className="absolute inset-0 bg-slate-100/60 dark:bg-slate-950/60 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-col gap-2 z-10">
              <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Memuat target tahun {selectedYear}...</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black">
                  <th className="pb-3 pl-3 md:pl-4 w-8 md:w-12">No</th>
                  <th className="pb-3 w-20 md:w-40">Bulan</th>
                  <th className="pb-3 w-20 md:w-32 text-center">Hari Kerja</th>
                  <th className="pb-3 pl-2 md:pl-8">Target Bulanan (kWh)</th>
                </tr>
              </thead>
              <tbody>
                {monthNames.map((month, idx) => {
                  const days = getWorkingDaysCount(idx, selectedYear, activeWorkingDaysChecklist);
                  const dailyAvg = targets[idx] > 0 ? Math.round(targets[idx] / days) : 0;
                  return (
                    <tr key={idx} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-slate-700 dark:text-slate-300">
                      <td className="py-3 pl-3 md:pl-4 font-bold text-slate-400 dark:text-slate-500">{idx + 1}</td>
                      <td className="py-3 font-extrabold text-slate-800 dark:text-slate-200">{month}</td>
                      <td className="py-3 text-center font-bold text-slate-650 dark:text-slate-400">
                        {days} Hari
                      </td>
                      <td className="py-3 pl-2 md:pl-8">
                        <div className="flex flex-col gap-1 w-full max-w-[200px] md:max-w-[240px]">
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="number"
                              value={targets[idx] === 0 ? '' : targets[idx]}
                              onChange={(e) => handleTargetChange(idx, e.target.value)}
                              placeholder="0"
                              className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 rounded-lg outline-none text-slate-800 dark:text-slate-100 transition-all focus:ring-2 focus:ring-emerald-500/10"
                            />
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex-shrink-0">kWh</span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 px-0.5 mt-0.5">
                            <div className="flex justify-between items-center gap-2">
                              <span>Kumulatif:</span>
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatIndoNumber(cumulativeTargets[idx])} kWh</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span>Rata-rata:</span>
                              <span className="font-extrabold text-slate-700 dark:text-slate-200">{formatIndoNumber(dailyAvg)}/hari</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
