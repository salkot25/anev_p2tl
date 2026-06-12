import { useState, useMemo, useEffect } from 'react';
import { Copy, CheckCircle2, Send, RefreshCw, Calendar, Zap, BarChart2 } from 'lucide-react';

// Helper to calculate working days in a month
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

function normalizeDateString(dateVal) {
  if (!dateVal) return '';
  if (typeof dateVal !== 'string') {
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch {
      // ignore
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
    // ignore
  }
  return str;
}

export default function LaporanPanel({ targets = [], backendUrl }) {
  const [reportType, setReportType] = useState('realisasi'); // rencana, realisasi
  const [rawDate, setRawDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });
  
  // kWh parameters
  const [targetHarianKwh, setTargetHarianKwh] = useState('0');
  const [realisasiHarianKwh, setRealisasiHarianKwh] = useState('0');
  const [targetKumulatifKwh, setTargetKumulatifKwh] = useState('0');
  const [realisasiKumulatifKwh, setRealisasiKumulatifKwh] = useState('0');
  
  // Custom manual override state for Sasaran Operasi categories 4, 5, and 6
  const [overrideTargetDev, setOverrideTargetDev] = useState('0');
  const [overrideRealDev, setOverrideRealDev] = useState('0');
  
  const [overrideTargetPeriodik, setOverrideTargetPeriodik] = useState('0');
  const [overrideRealPeriodik, setOverrideRealPeriodik] = useState('0');
  
  const [overrideTargetKuning, setOverrideTargetKuning] = useState('0');
  const [overrideRealKuning, setOverrideRealKuning] = useState('0');
  
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to format number to Indonesian format (thousand separator with dot)
  const formatKwh = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '';
    return new Intl.NumberFormat('id-ID').format(val);
  };

  // Fetch target and realization data matching rawDate
  useEffect(() => {
    const fetchReportDateData = async () => {
      if (!rawDate) return;
      
      const dateParts = rawDate.split('-');
      const year = parseInt(dateParts[0], 10) || new Date().getFullYear();
      const month = parseInt(dateParts[1], 10) || (new Date().getMonth() + 1);
      const day = parseInt(dateParts[2], 10) || new Date().getDate();

      // Read active working days checklist setting
      let activeWorkingDaysChecklist = { monFri: true, sat: true, sun: true };
      const savedChecklist = localStorage.getItem('p2tl_working_days_checklist');
      if (savedChecklist) {
        try {
          activeWorkingDaysChecklist = JSON.parse(savedChecklist);
        } catch {
          // ignore
        }
      } else {
        const oldSetting = localStorage.getItem('p2tl_working_days') || '7';
        if (oldSetting === '5') activeWorkingDaysChecklist = { monFri: true, sat: false, sun: false };
        if (oldSetting === '6') activeWorkingDaysChecklist = { monFri: true, sat: true, sun: false };
      }

      // 1. Try local logs cache first for instant update of realization values
      const cachedLogs = localStorage.getItem('p2tl_logs_cache');
      if (cachedLogs) {
        try {
          const logsList = JSON.parse(cachedLogs);
          const matchedLog = logsList.find(log => {
            const logDate = log.Date || log.date || '';
            return logDate === rawDate;
          });
          if (matchedLog) {
            setRealisasiHarianKwh(formatKwh(matchedLog.Realisasi_Harian_kWh || matchedLog.realisasi_harian_kwh || 0));
            setRealisasiKumulatifKwh(formatKwh(matchedLog.Realisasi_Kumulatif_kWh || matchedLog.realisasi_kumulatif_kwh || 0));
          } else {
            // Clear realization if not found in logs to avoid displaying stale data of another day
            setRealisasiHarianKwh('0');
            setRealisasiKumulatifKwh('0');
          }
        } catch (err) {
          console.error('Error reading logs cache in LaporanPanel:', err);
        }
      }

      // Helper for local calculations when offline or fetch fails
      const calculateTargetsLocally = (yr, mo, dy, activeWD) => {
        let monthlyTargetsArray = Array(12).fill(0);
        const cachedTargets = localStorage.getItem(`p2tl_monthly_targets_cache_${yr}`);
        if (cachedTargets) {
          try {
            const parsed = JSON.parse(cachedTargets);
            parsed.forEach(item => {
              const mIdx = Number(item.Month) - 1;
              if (mIdx >= 0 && mIdx < 12) {
                monthlyTargetsArray[mIdx] = Number(item.Target_kWh) || 0;
              }
            });
          } catch {
            // ignore
          }
        }

        // Read totalRealYear from logs cache
        let totalRealYear = 0;
        if (cachedLogs) {
          try {
            const logsList = JSON.parse(cachedLogs);
            logsList.forEach(log => {
              const logDate = log.Date || log.date || '';
              if (logDate.startsWith(String(yr))) {
                totalRealYear += Number(log.Realisasi_Harian_kWh || log.realisasiHarianKwh || 0);
              }
            });
          } catch {
            // ignore
          }
        }

        let targetPeriod;
        let remainingWorkingDays = 0;

        if (mo <= 6) {
          // Semester 1 (Jan-Jun)
          targetPeriod = monthlyTargetsArray.slice(0, 6).reduce((s, v) => s + v, 0);
          
          // Sisa Hari Kerja s.d. Juni
          const totalDaysInCurrentMonth = new Date(yr, mo, 0).getDate();
          for (let d = dy; d <= totalDaysInCurrentMonth; d++) {
            if (isDateWorkingDay(yr, mo - 1, d, activeWD)) {
              remainingWorkingDays++;
            }
          }
          for (let m = mo; m < 6; m++) {
            remainingWorkingDays += getWorkingDaysCount(yr, m, activeWD);
          }
        } else {
          // Semester 2 (Jul-Des)
          targetPeriod = monthlyTargetsArray.reduce((s, v) => s + v, 0);
          
          // Sisa Hari Kerja s.d. Desember
          const totalDaysInCurrentMonth = new Date(yr, mo, 0).getDate();
          for (let d = dy; d <= totalDaysInCurrentMonth; d++) {
            if (isDateWorkingDay(yr, mo - 1, d, activeWD)) {
              remainingWorkingDays++;
            }
          }
          for (let m = mo; m < 12; m++) {
            remainingWorkingDays += getWorkingDaysCount(yr, m, activeWD);
          }
        }

        remainingWorkingDays = Math.max(1, remainingWorkingDays);
        const sisaTarget = Math.max(0, targetPeriod - totalRealYear);
        const calculatedTargetHarian = Math.round(sisaTarget / remainingWorkingDays);
        const calculatedTargetKumulatif = monthlyTargetsArray.slice(0, mo).reduce((sum, val) => sum + val, 0);
        
        setTargetHarianKwh(formatKwh(calculatedTargetHarian));
        setTargetKumulatifKwh(formatKwh(calculatedTargetKumulatif));
      };

      // 2. Fetch fresh data from backend
      const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
      if (!url) {
        calculateTargetsLocally(year, month, day, activeWorkingDaysChecklist);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch dashboard data
        const response = await fetch(`${url}?action=get_dashboard_data&date=${rawDate}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        // Fetch monthly targets
        const targetsResponse = await fetch(`${url}?action=get_monthly_targets&year=${year}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        let monthlyTargetsArray = Array(12).fill(0);
        if (targetsResponse.ok) {
          const targetsResult = await targetsResponse.json();
          if (targetsResult.status === 'success' && Array.isArray(targetsResult.data)) {
            targetsResult.data.forEach(item => {
              const mIdx = Number(item.Month) - 1;
              if (mIdx >= 0 && mIdx < 12) {
                monthlyTargetsArray[mIdx] = Number(item.Target_kWh) || 0;
              }
            });
            localStorage.setItem(`p2tl_monthly_targets_cache_${year}`, JSON.stringify(targetsResult.data));
          }
        }

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            const targetData = result.target || {};
            const realData = result.realization || {};
            const execSummaryData = result.execSummary || {};
            
            if (realData.realisasiHarianKwh !== undefined) {
              setRealisasiHarianKwh(formatKwh(realData.realisasiHarianKwh));
            }
            if (realData.realisasiKumulatifKwh !== undefined) {
              setRealisasiKumulatifKwh(formatKwh(realData.realisasiKumulatifKwh));
            }
            
            // Calculate targets matching semester / cumulative projections logic
            let targetPeriod = 0;
            let remainingWorkingDays = 0;

            if (month <= 6) {
              // Semester 1
              targetPeriod = monthlyTargetsArray.slice(0, 6).reduce((s, v) => s + v, 0);
              
              // Count remaining working days in current month
              const totalDaysInCurrentMonth = new Date(year, month, 0).getDate();
              for (let d = day; d <= totalDaysInCurrentMonth; d++) {
                if (isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist)) {
                  remainingWorkingDays++;
                }
              }
              // Add full working days for subsequent months in Semester 1 (from month to index 5)
              for (let m = month; m < 6; m++) {
                remainingWorkingDays += getWorkingDaysCount(year, m, activeWorkingDaysChecklist);
              }
            } else {
              // Semester 2
              targetPeriod = monthlyTargetsArray.reduce((s, v) => s + v, 0);
              
              // Count remaining working days in current month
              const totalDaysInCurrentMonth = new Date(year, month, 0).getDate();
              for (let d = day; d <= totalDaysInCurrentMonth; d++) {
                if (isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist)) {
                  remainingWorkingDays++;
                }
              }
              // Add full working days for subsequent months in the year (from month to index 11)
              for (let m = month; m < 12; m++) {
                remainingWorkingDays += getWorkingDaysCount(year, m, activeWorkingDaysChecklist);
              }
            }

            remainingWorkingDays = Math.max(1, remainingWorkingDays);
            
            const totalRealYear = execSummaryData.totalKwhYear || 0;
            const sisaTarget = Math.max(0, targetPeriod - totalRealYear);
            
            const calculatedTargetHarian = Math.round(sisaTarget / remainingWorkingDays);
            const calculatedTargetKumulatif = monthlyTargetsArray.slice(0, month).reduce((sum, val) => sum + val, 0);
            
            setTargetHarianKwh(formatKwh(calculatedTargetHarian));
            setTargetKumulatifKwh(formatKwh(calculatedTargetKumulatif));

            // Also populate overrides for targets if present
            if (targetData.targetPengembanganPlg !== undefined) {
              setOverrideTargetDev(String(targetData.targetPengembanganPlg));
            }
            if (targetData.targetTsPeriodikPlg !== undefined) {
              setOverrideTargetPeriodik(String(targetData.targetTsPeriodikPlg));
            }
            if (targetData.targetTsMacetPlg !== undefined) {
              setOverrideTargetKuning(String(targetData.targetTsMacetPlg));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data for report date:', err);
        calculateTargetsLocally(year, month, day, activeWorkingDaysChecklist);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportDateData();
  }, [rawDate, backendUrl]);

  // Format rawDate into Indonesian long format dynamically
  const reportDate = useMemo(() => {
    if (!rawDate) return '......';
    const dateObj = new Date(rawDate);
    if (isNaN(dateObj.getTime())) return '......';
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[dateObj.getDay()];
    const dayNum = String(dateObj.getDate()).padStart(2, '0');
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  }, [rawDate]);

  // Calculate targets & realizations from database state
  const metrics = useMemo(() => {
    const getTargetCategory = (t) => {
      const sub = String(t.SubDLPD || '').toUpperCase();
      if (sub.includes('KWH MACET') || sub.includes('STAND ACMT TIDAK SESUAI')) {
        return 'lkbk';
      }
      
      const dayaVal = parseInt(t.Daya, 10) || 0;
      if (dayaVal >= 6600) {
        return 'phase3';
      }
      
      const dlpdVal = String(t.DLPD || '').toUpperCase();
      if (dlpdVal.includes('SISIR')) {
        return 'lainnya';
      }
      
      return 'toDlpd';
    };

    // Filter targets by category
    const categorized = targets.map(t => ({
      category: getTargetCategory(t),
      dateOrder: normalizeDateString(t.TanggalOrder || t.TanggalUpload),
      dateExec: normalizeDateString(t.TanggalPelaksanaan)
    }));

    // 1. LKBK Macet / Numpuk (Filtered by report date rawDate)
    const lkbkTarget = categorized.filter(t => t.category === 'lkbk' && t.dateOrder === rawDate).length;
    const lkbkReal = categorized.filter(t => t.category === 'lkbk' && t.dateExec === rawDate).length;

    // 2. Periksa Plg 3 Phasa (Filtered by report date rawDate)
    const phase3Target = 5; // Target selalu 5
    const phase3Real = categorized.filter(t => t.category === 'phase3' && t.dateExec === rawDate).length;

    // 3. Periksa TO DLPD (Filtered by report date rawDate)
    const toDlpdTarget = categorized.filter(t => t.category === 'toDlpd' && t.dateOrder === rawDate).length;
    const toDlpdReal = categorized.filter(t => t.category === 'toDlpd' && t.dateExec === rawDate).length;

    // 4, 5, 6 are mapped to overrides or default to 0
    const devTarget = parseInt(overrideTargetDev, 10) || 0;
    const devReal = parseInt(overrideRealDev, 10) || 0;
    
    const periodikTarget = parseInt(overrideTargetPeriodik, 10) || 0;
    const periodikReal = parseInt(overrideRealPeriodik, 10) || 0;
    
    const kuningTarget = parseInt(overrideTargetKuning, 10) || 0;
    const kuningReal = parseInt(overrideRealKuning, 10) || 0;

    // 7. lainnya: sisa dari 33 dikurangi poin 1-6. Jika poin 1-6 melebihi 33, maka poin 7 = 0
    const sumOthers = lkbkTarget + phase3Target + toDlpdTarget + devTarget + periodikTarget + kuningTarget;
    const lainTarget = sumOthers >= 33 ? 0 : (33 - sumOthers);
    const lainReal = categorized.filter(t => t.category === 'lainnya' && t.dateExec === rawDate).length;

    // Totals: jika melebihi 33, total target = jumlah aktual semua kategori
    const totalTarget = sumOthers + lainTarget; // = sumOthers jika >= 33, else always 33
    const totalReal = lkbkReal + phase3Real + toDlpdReal + devReal + periodikReal + kuningReal + lainReal;

    return {
      lkbkTarget, lkbkReal,
      phase3Target, phase3Real,
      toDlpdTarget, toDlpdReal,
      devTarget, devReal,
      periodikTarget, periodikReal,
      kuningTarget, kuningReal,
      lainTarget, lainReal,
      totalTarget, totalReal
    };
  }, [targets, rawDate, overrideTargetDev, overrideRealDev, overrideTargetPeriodik, overrideRealPeriodik, overrideTargetKuning, overrideRealKuning]);

  // Helper to clean and calculate GAP/Percentage from custom text inputs
  const calculatedKwh = useMemo(() => {
    const parseNum = (str) => {
      if (!str) return NaN;
      return parseFloat(String(str).replace(/\./g, '').replace(/,/g, '.').trim());
    };

    const targetK = parseNum(targetKumulatifKwh);
    const realK = parseNum(realisasiKumulatifKwh);

    let gap = '......';
    let percent = '......';

    if (!isNaN(targetK) && !isNaN(realK)) {
      gap = new Intl.NumberFormat('id-ID').format(targetK - realK);
      percent = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format((realK / targetK) * 100) + '%';
    }

    return { gap, percent };
  }, [targetKumulatifKwh, realisasiKumulatifKwh]);

  // Generate WhatsApp Message text template
  const generatedText = useMemo(() => {
    const isRencana = reportType === 'rencana';
    
    const realHarian = isRencana ? '......' : (realisasiHarianKwh || '......');
    const realKumulatif = isRencana ? '......' : (realisasiKumulatifKwh || '......');
    
    let gapText = isRencana ? '438.403' : calculatedKwh.gap;
    if (!isRencana && calculatedKwh.gap === '......') {
      gapText = '......';
    }

    const percentText = isRencana ? '71,94%' : calculatedKwh.percent;

    // Sasaran Operasi realizations fallback to ...... if Rencana
    const fmtPlg = (tCount, rCount) => {
      const realStr = isRencana ? '......' : rCount;
      return `${tCount} Plg / ${realStr} Plg`;
    };

    // Total header line
    const totalLine = fmtPlg(metrics.totalTarget, metrics.totalReal);

    return `Assalamualaikum Wr. Wb.
Yth.
MUP3 Salatiga
Asman TEL
Semangat Pagi

Berikut disampaikan ${reportType === 'rencana' ? 'Rencana' : 'Realisasi'} P2TL ULP Salatiga Kota
${reportDate || 'Senin, 08 Juni 2026'}
1. Target / Realisasi Harian : ${targetHarianKwh || '......'}/ ${realHarian} kWh
2. Target/ Realisasi Kumulatif : ${targetKumulatifKwh || '......'}/ ${realKumulatif} kWh (${percentText})
3. GAP Kumulatif : ${gapText} kWh
Sasaran Operasi :   ${totalLine} (target diperiksa/ yang diperiksa)
1. LKBK Macet / Numpuk : ${fmtPlg(metrics.lkbkTarget, metrics.lkbkReal)}
2. Periksa Plg 3 Phasa : ${fmtPlg(metrics.phase3Target, metrics.phase3Real)}
3. Periksa TO DLPD : ${fmtPlg(metrics.toDlpdTarget, metrics.toDlpdReal)}
4. Pengembangan TO  : ${fmtPlg(metrics.devTarget, metrics.devReal)}
5. Penagihan TS kWh Periodik : ${fmtPlg(metrics.periodikTarget, metrics.periodikReal)}
6. Penagihan TS Macet (Kuning): ${fmtPlg(metrics.kuningTarget, metrics.kuningReal)}
7. lainnya : ${fmtPlg(metrics.lainTarget, metrics.lainReal)}

Demikian disampaikan 
Terima kasih`;
  }, [reportType, reportDate, targetHarianKwh, realisasiHarianKwh, targetKumulatifKwh, realisasiKumulatifKwh, metrics, calculatedKwh]);

  // Copy trigger
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // WhatsApp send trigger
  const handleSendWa = () => {
    const encodedText = encodeURIComponent(generatedText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const isRealisasi = reportType === 'realisasi';

  // Helper: achievement badge style
  const achStyle = (target, real) => {
    if (target <= 0) return { color: '#94a3b8', bg: 'transparent', pct: null };
    const pct = Math.round((real / target) * 100);
    if (pct >= 100) return { color: '#059669', bg: 'rgba(16,185,129,0.09)', pct };
    if (pct >= 50)  return { color: '#d97706', bg: 'rgba(245,158,11,0.09)',  pct };
    return            { color: '#dc2626', bg: 'rgba(239,68,68,0.09)',   pct };
  };

  // Progress bar fill color
  const barColor = (target, real) => {
    if (target <= 0) return '#94a3b8';
    const p = real / target;
    return p >= 1 ? '#10b981' : p >= 0.5 ? '#f59e0b' : '#ef4444';
  };

  // Grid template: #, label, target, real, [%, realisasi only]
  const colTpl = isRealisasi ? '28px 1fr 64px 64px 52px' : '28px 1fr 64px 64px';

  return (
    <div className="w-full flex flex-col gap-5">

      {/* ══════════════════════════════════════════════
           01. CONFIGURATION BAR
      ══════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          {/* Report Type */}
          <div className="flex flex-col gap-1.5 w-full sm:w-64">
            <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Jenis Laporan</label>
            <div className="flex w-full gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl h-8">
              {['rencana', 'realisasi'].map(t => (
                <button key={t} type="button" onClick={() => setReportType(t)}
                  className={`flex-1 text-xs font-bold rounded-[10px] transition-all capitalize ${
                    reportType === t
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:block self-stretch w-px bg-slate-200 dark:bg-slate-700 my-0.5" />

          {/* Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tanggal Laporan</label>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-8 w-fit">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input type="date" value={rawDate} onChange={e => setRawDate(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer w-[130px]" />
            </div>
          </div>

          {/* Formatted date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Periode</label>
            <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 h-8 flex items-center">{reportDate}</div>
          </div>

          {isLoading && (
            <div className="ml-auto flex items-center gap-2 text-xs text-blue-500 font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Memuat data…
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
           02. MAIN GRID
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ──────── LEFT 7 cols ──────── */}
        <div className="lg:col-span-7 flex flex-col gap-5">



          {/* ── Energy KPI Cards ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Parameter Energi kWh</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Target Harian', val: targetHarianKwh, set: setTargetHarianKwh, disabled: false, numCls: 'text-slate-900 dark:text-white', focusCls: 'focus:border-blue-400 dark:focus:border-blue-500' },
                { label: 'Realisasi Harian', val: realisasiHarianKwh, set: setRealisasiHarianKwh, disabled: !isRealisasi, numCls: 'text-emerald-600 dark:text-emerald-400', focusCls: 'focus:border-emerald-400 dark:focus:border-emerald-500' },
                { label: 'Target Kumulatif', val: targetKumulatifKwh, set: setTargetKumulatifKwh, disabled: false, numCls: 'text-slate-900 dark:text-white', focusCls: 'focus:border-blue-400 dark:focus:border-blue-500' },
                { label: 'Realisasi Kumulatif', val: realisasiKumulatifKwh, set: setRealisasiKumulatifKwh, disabled: !isRealisasi, numCls: 'text-emerald-600 dark:text-emerald-400', focusCls: 'focus:border-emerald-400 dark:focus:border-emerald-500' },
              ].map(kpi => (
                <div key={kpi.label} className={`bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm transition-opacity ${kpi.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">{kpi.label}</div>
                  <input type="text" value={kpi.val} onChange={e => kpi.set(e.target.value)} disabled={kpi.disabled}
                    className={`w-full text-lg sm:text-xl font-black font-mono bg-transparent outline-none border-b-2 border-dashed border-slate-200 dark:border-slate-700 pb-1 transition-colors disabled:cursor-not-allowed ${kpi.numCls} ${kpi.focusCls}`} />
                  <div className="text-[8px] sm:text-xs font-medium text-slate-400 mt-1">kWh</div>
                </div>
              ))}
            </div>

            {/* GAP Summary Dark Banner */}
            <div className="bg-slate-900 dark:bg-slate-800/90 border border-slate-800 dark:border-slate-700/60 rounded-2xl px-5 py-3.5 flex items-center gap-0">
              <div className="flex-1">
                <div className="text-[8px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-1">GAP Kumulatif</div>
                <div className="text-lg sm:text-xl font-black font-mono text-white tracking-tight">
                  {isRealisasi ? calculatedKwh.gap : '438.403'}
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 ml-1.5">kWh</span>
                </div>
              </div>
              <div className="w-px h-10 bg-slate-700 mx-5" />
              <div>
                <div className="text-[8px] sm:text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Capaian</div>
                <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 tracking-tight">
                  {isRealisasi ? calculatedKwh.percent : '71,94%'}
                </div>
              </div>
              <span className="ml-4 sm:ml-6 shrink-0 text-[8px] sm:text-xs bg-slate-800 border border-slate-700 text-slate-500 px-2 py-1 rounded-lg font-bold tracking-wide">AUTO</span>
            </div>
          </div>


          {/* ── Sasaran Operasi Table ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden">

            {/* Card Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-center shrink-0">
                  <BarChart2 className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200">Sasaran Operasi Pelanggan</h3>
                  <p className="text-[8px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">Real-time · sinkron dari data target</p>
                </div>
              </div>
              <div className="text-right shrink-0 pl-4">
                <div className="text-[28px] font-black font-mono leading-none text-blue-600 dark:text-blue-400">{metrics.totalTarget}</div>
                <div className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">Total Plg</div>
                {metrics.totalTarget > 33 && <div className="text-[8px] sm:text-xs font-black text-amber-500 mt-1">+{metrics.totalTarget - 33} melebihi batas 33</div>}
                {metrics.totalTarget === 33 && <div className="text-[8px] sm:text-xs font-black text-emerald-500 mt-1">✓ Tepat 33 target</div>}
                {metrics.totalTarget < 33 && <div className="text-[8px] sm:text-xs font-black text-slate-400 mt-1">−{33 - metrics.totalTarget} dari batas 33</div>}
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid px-5 py-2 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/40"
              style={{ gridTemplateColumns: colTpl }}>
              <div className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">#</div>
              <div className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kategori Sasaran</div>
              <div className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Target</div>
              <div className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Real.</div>
              {isRealisasi && <div className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">%</div>}
            </div>

            {/* ─── Auto rows: 1, 2, 3 ─── */}
            {[
              { num: 1, label: 'LKBK Macet / Numpuk',  target: metrics.lkbkTarget,   real: metrics.lkbkReal,   dot: '#ef4444' },
              { num: 2, label: 'Periksa Plg 3 Phasa',  target: metrics.phase3Target, real: metrics.phase3Real, dot: '#f59e0b' },
              { num: 3, label: 'Periksa TO DLPD',       target: metrics.toDlpdTarget, real: metrics.toDlpdReal, dot: '#3b82f6' },
            ].map(row => {
              const s = achStyle(row.target, row.real);
              const fillW = row.target > 0 ? Math.min(100, Math.round((row.real / row.target) * 100)) : 0;
              return (
                <div key={row.num}
                  className="grid items-center px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                  style={{ gridTemplateColumns: colTpl }}>
                  <div className="text-xs font-bold text-slate-300 dark:text-slate-700">{row.num}</div>
                  <div className="pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.dot }} />
                      <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">{row.label}</span>
                    </div>
                    {isRealisasi && row.target > 0 && (
                      <div className="ml-3.5 mt-1.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${fillW}%`, backgroundColor: barColor(row.target, row.real) }} />
                      </div>
                    )}
                  </div>
                  <div className="text-center font-mono font-bold text-sm text-slate-900 dark:text-white">{row.target}</div>
                  <div className="text-center font-mono font-bold text-sm">
                    {isRealisasi
                      ? <span className="text-slate-600 dark:text-slate-300">{row.real}</span>
                      : <span className="text-slate-300 dark:text-slate-700">—</span>}
                  </div>
                  {isRealisasi && (
                    <div className="text-center">
                      {s.pct !== null
                        ? <span className="text-[8px] sm:text-xs font-black px-1.5 py-0.5 rounded-md" style={{ color: s.color, backgroundColor: s.bg }}>{s.pct}%</span>
                        : <span className="text-slate-300 dark:text-slate-700">—</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ─── Override rows: 4, 5, 6 ─── */}
            {[
              { num: 4, label: 'Pengembangan TO',             dot: '#8b5cf6', tVal: overrideTargetDev,      rVal: overrideRealDev,      tSet: setOverrideTargetDev,      rSet: setOverrideRealDev      },
              { num: 5, label: 'Penagihan TS kWh Periodik',   dot: '#06b6d4', tVal: overrideTargetPeriodik, rVal: overrideRealPeriodik, tSet: setOverrideTargetPeriodik, rSet: setOverrideRealPeriodik },
              { num: 6, label: 'Penagihan TS Macet (Kuning)', dot: '#f59e0b', tVal: overrideTargetKuning,   rVal: overrideRealKuning,   tSet: setOverrideTargetKuning,   rSet: setOverrideRealKuning   },
            ].map(row => {
              const tNum = parseInt(row.tVal, 10) || 0;
              const rNum = parseInt(row.rVal, 10) || 0;
              const s = achStyle(tNum, rNum);
              const fillW = tNum > 0 ? Math.min(100, Math.round((rNum / tNum) * 100)) : 0;
              return (
                <div key={row.num}
                  className="grid items-center px-5 py-3 border-b border-slate-100 dark:border-slate-800/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors bg-amber-50/20 dark:bg-amber-950/5"
                  style={{ gridTemplateColumns: colTpl }}>
                  <div className="text-xs font-bold text-slate-300 dark:text-slate-700">{row.num}</div>
                  <div className="pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.dot }} />
                      <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">{row.label}</span>
                    </div>
                    <div className="text-[8px] sm:text-xs text-amber-500/90 font-black mt-0.5 ml-3.5">Override manual</div>
                    {isRealisasi && tNum > 0 && (
                      <div className="ml-3.5 mt-1.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${fillW}%`, backgroundColor: barColor(tNum, rNum) }} />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <input type="number" value={row.tVal} onChange={e => row.tSet(e.target.value)} min="0"
                      className="w-12 text-center font-mono font-bold text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-all" />
                  </div>
                  <div className="text-center">
                    {isRealisasi
                      ? <input type="number" value={row.rVal} onChange={e => row.rSet(e.target.value)} min="0"
                          className="w-12 text-center font-mono font-bold text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 transition-all" />
                      : <span className="text-slate-300 dark:text-slate-700 font-mono font-bold text-sm">—</span>}
                  </div>
                  {isRealisasi && (
                    <div className="text-center">
                      {s.pct !== null
                        ? <span className="text-[8px] sm:text-xs font-black px-1.5 py-0.5 rounded-md" style={{ color: s.color, backgroundColor: s.bg }}>{s.pct}%</span>
                        : <span className="text-slate-300 dark:text-slate-700">—</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ─── Row 7: Lainnya ─── */}
            {(() => {
              const s = achStyle(metrics.lainTarget, metrics.lainReal);
              const fillW = metrics.lainTarget > 0 ? Math.min(100, Math.round((metrics.lainReal / metrics.lainTarget) * 100)) : 0;
              return (
                <div className="grid items-center px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                  style={{ gridTemplateColumns: colTpl }}>
                  <div className="text-xs font-bold text-slate-300 dark:text-slate-700">7</div>
                  <div className="pr-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">Lainnya (Sisir)</span>
                    </div>
                    <div className="text-[8px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold mt-0.5 ml-3.5">Sisa dari total referensi 33</div>
                    {isRealisasi && metrics.lainTarget > 0 && (
                      <div className="ml-3.5 mt-1.5 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${fillW}%`, backgroundColor: barColor(metrics.lainTarget, metrics.lainReal) }} />
                      </div>
                    )}
                  </div>
                  <div className="text-center font-mono font-bold text-sm text-slate-900 dark:text-white">{metrics.lainTarget}</div>
                  <div className="text-center font-mono font-bold text-sm">
                    {isRealisasi
                      ? <span className="text-slate-600 dark:text-slate-300">{metrics.lainReal}</span>
                      : <span className="text-slate-300 dark:text-slate-700">—</span>}
                  </div>
                  {isRealisasi && (
                    <div className="text-center">
                      {s.pct !== null
                        ? <span className="text-[8px] sm:text-xs font-black px-1.5 py-0.5 rounded-md" style={{ color: s.color, backgroundColor: s.bg }}>{s.pct}%</span>
                        : <span className="text-slate-300 dark:text-slate-700">—</span>}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── Total Footer ─── */}
            <div className="grid items-center px-5 py-4 bg-gradient-to-r from-blue-50/70 to-transparent dark:from-blue-950/20 dark:to-transparent border-t-2 border-blue-100 dark:border-blue-900/50"
              style={{ gridTemplateColumns: colTpl }}>
              <div />
              <div className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400">Total Sasaran Operasi</div>
              <div className="text-center font-mono font-black text-sm sm:text-base text-blue-700 dark:text-blue-400">{metrics.totalTarget}</div>
              <div className="text-center font-mono font-black text-base">
                {isRealisasi
                  ? <span className="text-emerald-600 dark:text-emerald-400">{metrics.totalReal}</span>
                  : <span className="text-slate-300 dark:text-slate-700">—</span>}
              </div>
              {isRealisasi && (
                <div className="text-center">
                  {metrics.totalTarget > 0 ? (() => {
                    const s = achStyle(metrics.totalTarget, metrics.totalReal);
                    return <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-lg" style={{ color: s.color, backgroundColor: s.bg }}>{s.pct}%</span>;
                  })() : <span className="text-slate-300">—</span>}
                </div>
              )}
            </div>
          </div>

        </div> {/* end LEFT col */}

        {/* ──────── RIGHT 5 cols (sticky) ──────── */}
        <div className="lg:col-span-5 lg:sticky lg:top-[90px] flex flex-col gap-4">

          {/* Label Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pratinjau Pesan WhatsApp</span>
            </div>
            <span className={`text-[8px] sm:text-xs font-black px-2.5 py-1 rounded-full ${
              isRealisasi
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
            }`}>{isRealisasi ? 'Realisasi' : 'Rencana'}</span>
          </div>

          {/* Chat Container */}
          <div className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-md">
            {/* WA Header */}
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-[8px] sm:text-xs font-black shrink-0 border border-white/20">MUP</div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">MUP3 Salatiga · Asman TEL</div>
                <div className="text-green-200 text-[8px] sm:text-xs font-bold">P2TL ULP Salatiga Kota</div>
              </div>
              <div className="text-[8px] sm:text-xs text-green-200/60 font-bold hidden sm:block">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            {/* Messages Area */}
            <div className="p-4 min-h-[320px] flex flex-col items-start"
              style={{
                background: '#e5ddd5',
                backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                backgroundSize: '200px',
                backgroundRepeat: 'repeat',
              }}>
              {/* Message Bubble */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm max-w-[97%] shadow-sm overflow-hidden">
                <div className="px-3.5 pt-3.5 pb-1">
                  <pre className="font-mono text-[10px] sm:text-xs whitespace-pre-wrap leading-relaxed break-words text-slate-800 dark:text-slate-200 tracking-tight select-text">{generatedText}</pre>
                </div>
                <div className="flex-1 min-h-0" />
                <div className="flex items-center justify-end gap-1 px-3.5 pb-2.5 mt-0.5">
                  <span className="text-[8px] sm:text-xs font-bold text-slate-400">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleCopy}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs border-2 transition-all cursor-pointer select-none ${
                copied
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}>
              {copied
                ? <><CheckCircle2 className="w-4 h-4" /> Tersalin!</>
                : <><Copy className="w-4 h-4" /> Salin Teks</>}
            </button>
            <button onClick={handleSendWa}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs border-2 border-[#25d366]/60 bg-[#25d366] hover:bg-[#20bd5a] text-white shadow-lg shadow-emerald-500/20 cursor-pointer transition-all select-none">
              <Send className="w-4 h-4" />
              Kirim WA
            </button>
          </div>

        </div> {/* end RIGHT col */}

      </div> {/* end Main Grid */}
    </div>
  );
}
