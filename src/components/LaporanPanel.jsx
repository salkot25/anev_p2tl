import { useState, useMemo, useEffect } from 'react';
import { Copy, CheckCircle2, Send, RefreshCw, Calendar, Zap, Users, Target, SearchCheck } from 'lucide-react';

// Helper to format last updated timestamp
function formatLastFetch(date) {
  if (!date) return '';
  const now = new Date();
  const isToday = date.getDate() === now.getDate() &&
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear();
  
  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return timeStr;
  } else {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month} ${timeStr}`;
  }
}

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

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function LaporanPanel({ targets = [], backendUrl, ulp = '', up3 = '' }) {
  const targetPercent = Number(localStorage.getItem('p2tl_target_multiplier_percent')) || 110;
  const targetMultiplier = targetPercent / 100;

  const [rawDate, setRawDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });

  // 1. Petugas P2TL & Organik
  const [petugasRegu, setPetugasRegu] = useState('3');
  const [petugasJumlah, setPetugasJumlah] = useState('6');
  const [organikJumlah, setOrganikJumlah] = useState('1');
  const [trPotensialRegu, setTrPotensialRegu] = useState('..');
  const [trPotensialOrang, setTrPotensialOrang] = useState('..');

  // 2. Rencana TO Hari Ini
  const [toTurun40, setToTurun40] = useState('2');
  const [toLpbPasif, setToLpbPasif] = useState('0');
  const [toJamNyala400, setToJamNyala400] = useState('5');
  const [toLbkb, setToLbkb] = useState('1');
  const [toSambungLangsung, setToSambungLangsung] = useState('0');
  const [toPotensialAmr, setToPotensialAmr] = useState('0');

  // 3. Rincian Pemeriksaan
  const [rincianBongkar, setRincianBongkar] = useState('..');
  const [rincianNormal, setRincianNormal] = useState('..');
  const [p1Plg, setP1Plg] = useState('0');
  const [p2Plg, setP2Plg] = useState('0');
  const [p2Kwh, setP2Kwh] = useState('0');
  const [p3Plg, setP3Plg] = useState('0');
  const [p3Kwh, setP3Kwh] = useState('0');
  const [p4Plg, setP4Plg] = useState('0');
  const [p4Kwh, setP4Kwh] = useState('0');
  const [k2Plg, setK2Plg] = useState('0');
  const [k2Kwh, setK2Kwh] = useState('0');

  // 4. Target & Realisasi Parameters
  const [targetHarianKwh, setTargetHarianKwh] = useState('0');
  const [realisasiHarianKwh, setRealisasiHarianKwh] = useState('0');
  const [realisasiBulanKwh, setRealisasiBulanKwh] = useState('0');
  const [targetBulanKwh, setTargetBulanKwh] = useState('0');
  const [targetKumulatifKwh, setTargetKumulatifKwh] = useState('0');
  const [realisasiKumulatifKemarinKwh, setRealisasiKumulatifKemarinKwh] = useState('0');
  const [targetTahunanKwh, setTargetTahunanKwh] = useState('0');
  const [realisasiTahunanKwh, setRealisasiTahunanKwh] = useState('0');

  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(() => {
    const saved = localStorage.getItem('p2tl_laporan_last_fetch');
    if (saved) {
      const parsed = new Date(saved);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  });

  // Helper to format number to Indonesian format (thousand separator with dot)
  const formatKwh = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '0';
    return new Intl.NumberFormat('id-ID').format(Math.round(Number(val)));
  };

  const parseNum = (str) => {
    if (!str) return 0;
    const cleaned = String(str).replace(/\./g, '').replace(/,/g, '.').trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // Date objects & labels
  const dateInfo = useMemo(() => {
    if (!rawDate) return { tanggalReport: '..', tanggalKemarin: '..', namaBulan: '..', year: new Date().getFullYear() };
    const parts = rawDate.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const d = parseInt(parts[2], 10) || new Date().getDate();

    const dateObj = new Date(y, m - 1, d);
    const dayNum = dateObj.getDate();
    const namaBulan = MONTH_NAMES[dateObj.getMonth()];
    const tanggalReport = `${dayNum} ${namaBulan} ${y}`;

    // Kemarin
    const yObj = new Date(dateObj.getTime() - 24 * 60 * 60 * 1000);
    const yDay = String(yObj.getDate()).padStart(2, '0');
    const yMonth = MONTH_NAMES[yObj.getMonth()];
    const yYear = yObj.getFullYear();
    const tanggalKemarin = `${yDay} ${yMonth} ${yYear}`;

    return { tanggalReport, tanggalKemarin, namaBulan, year: y, month: m, day: d };
  }, [rawDate]);

  // Unit label formatted nicely
  const unitLabel = useMemo(() => {
    const u = (ulp || '').trim();
    if (u) {
      if (u.toUpperCase().startsWith('ULP')) {
        const parts = u.split(' ');
        return parts[0].toUpperCase() + ' ' + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
      }
      return 'ULP ' + u.charAt(0).toUpperCase() + u.slice(1).toLowerCase();
    }
    const up = (up3 || '').trim();
    if (up) return up;
    return 'ULP Ungaran';
  }, [ulp, up3]);

  // Auto-count Rencana TO from local targets if available
  useEffect(() => {
    if (!Array.isArray(targets) || targets.length === 0) return;

    const timer = setTimeout(() => {
      const todayTargets = targets.filter(t => {
        const d = normalizeDateString(t.TanggalOrder || t.TanggalUpload || '');
        return d === rawDate;
      });

      if (todayTargets.length === 0) return;

      let turun40 = 0;
      let lpbPasif = 0;
      let jamNyala400 = 0;
      let lbkb = 0;
      let sambungLangsung = 0;
      let potensialAmr = 0;

      todayTargets.forEach(t => {
        const sub = String(t.SubDLPD || t.DLPD || t.Sumber || '').toUpperCase();
        const jenis = String(t.JENIS_TO || '').toUpperCase();
        const allText = `${sub} ${jenis}`;

        if (allText.includes('40%') || allText.includes('TURUN')) {
          turun40++;
        } else if (allText.includes('PASIF') || allText.includes('LPB')) {
          lpbPasif++;
        } else if (allText.includes('400') || allText.includes('JAM NYALA')) {
          jamNyala400++;
        } else if (allText.includes('LKBK') || allText.includes('LBKB') || allText.includes('MACET')) {
          lbkb++;
        } else if (allText.includes('SAMBUNG') || allText.includes('LANGSUNG')) {
          sambungLangsung++;
        } else if (allText.includes('AMR') || allText.includes('POTENSIAL')) {
          potensialAmr++;
        }
      });

      if (turun40 > 0) setToTurun40(String(turun40));
      if (lpbPasif > 0) setToLpbPasif(String(lpbPasif));
      if (jamNyala400 > 0) setToJamNyala400(String(jamNyala400));
      if (lbkb > 0) setToLbkb(String(lbkb));
      if (sambungLangsung > 0) setToSambungLangsung(String(sambungLangsung));
      if (potensialAmr > 0) setToPotensialAmr(String(potensialAmr));
    }, 0);

    return () => clearTimeout(timer);
  }, [targets, rawDate]);

  // Fetch target and realization data matching rawDate
  useEffect(() => {
    const fetchReportDateData = async () => {
      if (!rawDate) return;
      
      const { year, month, day } = dateInfo;

      // Active working days checklist
      let activeWorkingDaysChecklist = { monFri: true, sat: true, sun: true };
      const savedChecklist = localStorage.getItem('p2tl_working_days_checklist');
      if (savedChecklist) {
        try {
          activeWorkingDaysChecklist = JSON.parse(savedChecklist);
        } catch {
          // ignore
        }
      }

      const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
      if (!url) return;

      setIsLoading(true);
      try {
        const unitCode = localStorage.getItem('p2tl_default_unit_code') || '52350';
        const [dashRes, targetsRes] = await Promise.all([
          fetch(`${url}?action=get_dashboard_data&date=${rawDate}&unit_code=${unitCode}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          }),
          fetch(`${url}?action=get_monthly_targets&year=${year}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          })
        ]);

        let monthlyTargetsArray = Array(12).fill(0);
        if (targetsRes.ok) {
          const targetsResult = await targetsRes.json();
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

        if (dashRes.ok) {
          const result = await dashRes.json();
          if (result.status === 'success') {
            const realData = result.realization || {};
            const execData = result.execSummary || {};

            const realHarian = Number(realData.realisasiHarianKwh) || 0;
            const realKumulatif = Number(realData.realisasiKumulatifKwh) || 0;
            const realKumKemarin = Math.max(0, realKumulatif - realHarian);
            const totalKwhYear = Number(execData.totalKwhYear) || realKumulatif;

            setRealisasiHarianKwh(formatKwh(realHarian));
            setRealisasiKumulatifKemarinKwh(formatKwh(realKumKemarin));
            setRealisasiTahunanKwh(formatKwh(totalKwhYear));

            // Monthly realization from monthlyTrend
            const monthShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][month - 1];
            const currentMonthObj = Array.isArray(execData.monthlyTrend) 
              ? execData.monthlyTrend.find(m => m.month === monthShort) 
              : null;
            const realBulan = currentMonthObj?.kwh || realHarian;
            setRealisasiBulanKwh(formatKwh(realBulan));

            // Targets calculation
            const targetBulan = (monthlyTargetsArray[month - 1] || 0) * targetMultiplier;
            setTargetBulanKwh(formatKwh(targetBulan));

            const totalTargetYear = monthlyTargetsArray.reduce((s, v) => s + v, 0) * targetMultiplier;
            setTargetTahunanKwh(formatKwh(totalTargetYear));

            const targetKumulatifCalc = Math.round(monthlyTargetsArray.slice(0, month).reduce((sum, val) => sum + val, 0) * targetMultiplier);
            setTargetKumulatifKwh(formatKwh(targetKumulatifCalc));

            // Target Harian calculation
            let targetPeriod = 0;
            let remainingWorkingDays = 0;
            if (month <= 6) {
              targetPeriod = monthlyTargetsArray.slice(0, 6).reduce((s, v) => s + v, 0) * targetMultiplier;
              const totalDaysInCurrentMonth = new Date(year, month, 0).getDate();
              for (let d = day; d <= totalDaysInCurrentMonth; d++) {
                if (isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist)) remainingWorkingDays++;
              }
              for (let m = month; m < 6; m++) {
                remainingWorkingDays += getWorkingDaysCount(year, m, activeWorkingDaysChecklist);
              }
            } else {
              targetPeriod = monthlyTargetsArray.reduce((s, v) => s + v, 0) * targetMultiplier;
              const totalDaysInCurrentMonth = new Date(year, month, 0).getDate();
              for (let d = day; d <= totalDaysInCurrentMonth; d++) {
                if (isDateWorkingDay(year, month - 1, d, activeWorkingDaysChecklist)) remainingWorkingDays++;
              }
              for (let m = month; m < 12; m++) {
                remainingWorkingDays += getWorkingDaysCount(year, m, activeWorkingDaysChecklist);
              }
            }
            remainingWorkingDays = Math.max(1, remainingWorkingDays);
            const sisaTarget = Math.max(0, targetPeriod - realKumKemarin);
            const calculatedTargetHarian = Math.round(sisaTarget / remainingWorkingDays);
            setTargetHarianKwh(formatKwh(calculatedTargetHarian));

            // Auto-populate daily findings breakdown if present in golonganBreakdownDay
            if (Array.isArray(execData.golonganBreakdownDay) && execData.golonganBreakdownDay.length > 0) {
              let p1Cases = 0, p2Cases = 0, p3Cases = 0, p4Cases = 0, k2Cases = 0;
              let p2KwhVal = 0, p3KwhVal = 0, p4KwhVal = 0, k2KwhVal = 0;

              execData.golonganBreakdownDay.forEach(g => {
                const c = String(g.class || '').toUpperCase().trim();
                if (c === 'P1') { p1Cases += g.cases || 0; }
                else if (c === 'P2') { p2Cases += g.cases || 0; p2KwhVal += g.kwh || 0; }
                else if (c === 'P3') { p3Cases += g.cases || 0; p3KwhVal += g.kwh || 0; }
                else if (c === 'P4') { p4Cases += g.cases || 0; p4KwhVal += g.kwh || 0; }
                else if (c === 'K2') { k2Cases += g.cases || 0; k2KwhVal += g.kwh || 0; }
              });

              setP1Plg(String(p1Cases));
              setP2Plg(String(p2Cases));
              setP2Kwh(formatKwh(p2KwhVal));
              setP3Plg(String(p3Cases));
              setP3Kwh(formatKwh(p3KwhVal));
              setP4Plg(String(p4Cases));
              setP4Kwh(formatKwh(p4KwhVal));
              setK2Plg(String(k2Cases));
              setK2Kwh(formatKwh(k2KwhVal));
            }

            const now = new Date();
            setLastFetch(now);
            localStorage.setItem('p2tl_laporan_last_fetch', now.toISOString());
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data for report date:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportDateData();
  }, [rawDate, backendUrl, targetMultiplier, dateInfo]);

  // Derived calculations: Temuan & Percentages
  const temuanTotalPlg = useMemo(() => {
    return (parseInt(p1Plg, 10) || 0) +
           (parseInt(p2Plg, 10) || 0) +
           (parseInt(p3Plg, 10) || 0) +
           (parseInt(p4Plg, 10) || 0) +
           (parseInt(k2Plg, 10) || 0);
  }, [p1Plg, p2Plg, p3Plg, p4Plg, k2Plg]);

  const percentages = useMemo(() => {
    const tH = parseNum(targetHarianKwh);
    const rH = parseNum(realisasiHarianKwh);
    const persenH = tH > 0 ? (rH / tH) * 100 : 0;

    const tB = parseNum(targetBulanKwh);
    const rB = parseNum(realisasiBulanKwh);
    const persenB = tB > 0 ? (rB / tB) * 100 : 0;

    const tK = parseNum(targetKumulatifKwh);
    const rK = parseNum(realisasiKumulatifKemarinKwh);
    const persenK = tK > 0 ? (rK / tK) * 100 : 0;

    const tY = parseNum(targetTahunanKwh);
    const rY = parseNum(realisasiTahunanKwh);
    const persenY = tY > 0 ? Math.round((rY / tY) * 100) : 0;

    const fmtDec = (val) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

    return {
      persenHarianFormatted: `${fmtDec(persenH)}%`,
      persenBulanFormatted: `${fmtDec(persenB)}%`,
      persenKumulatifFormatted: `${fmtDec(persenK)}%`,
      persenTahunanFormatted: `${persenY}%`
    };
  }, [targetHarianKwh, realisasiHarianKwh, targetBulanKwh, realisasiBulanKwh, targetKumulatifKwh, realisasiKumulatifKemarinKwh, targetTahunanKwh, realisasiTahunanKwh]);

  // Generate WhatsApp Message text template
  const generatedText = useMemo(() => {
    return `Ysh. Bapak Manager UP3
         Bapak Asman TEL

Berikut kami sampaikan Pelaksanaan P2TL ${unitLabel}, Tanggal ${dateInfo.tanggalReport} :

1. Petugas P2TL
* ${petugasRegu} Regu / ${petugasJumlah} Petugas
2. Petugas P2TL Organik : ${organikJumlah} orang
* Pemeriksaan Plg TR Potensial = ${trPotensialRegu} Regu/ ${trPotensialOrang} orang
3. Rencana TO hari ini :
- Plg Pemakaian Turun 40 % : ${toTurun40} Plg
- LPB Pasif : ${toLpbPasif} Plg
- Jam nyala >400 : ${toJamNyala400} Plg
- LBKB : ${toLbkb} Plg
- Sambung Lagsung : ${toSambungLangsung} Plg
- TO Potensial AMR : ${toPotensialAmr} Plg
4. Rincian Pemeriksaan :   
* Pembongkaran = ${rincianBongkar} Plg
* Normal = ${rincianNormal} Plg
* Temuan = ${temuanTotalPlg > 0 ? temuanTotalPlg : '..'} Plg   
* P1 = ${p1Plg} Plg  
* P2 = ${p2Plg} Plg  --> ${p2Kwh} kWh
* P3 = ${p3Plg} Plg  --> ${p3Kwh} kWh
* P4 = ${p4Plg} Plg  --> ${p4Kwh} kWh
* K2 = ${k2Plg} Plg  --> ${k2Kwh} kWh

4. Target Harian : ${targetHarianKwh || '0'} kWh
* Realisasi Harian : ${realisasiHarianKwh || '0'} kWh ( ${percentages.persenHarianFormatted} )
* Realisasi bulan ${dateInfo.namaBulan} : ${realisasiBulanKwh || '0'} kWh (${percentages.persenBulanFormatted})
5. Target kumulatif : ${targetKumulatifKwh || '0'} kWh
* Realisasi Kumulatif s.d ${dateInfo.tanggalKemarin} : ${realisasiKumulatifKemarinKwh || '0'} kWh (${percentages.persenKumulatifFormatted})
6. Target Tahunan : ${targetTahunanKwh || '0'} kWh
* Realisasi Kumulatif Tahunan : ${realisasiTahunanKwh || '0'} kWh (${percentages.persenTahunanFormatted})`;
  }, [unitLabel, dateInfo, petugasRegu, petugasJumlah, organikJumlah, trPotensialRegu, trPotensialOrang, toTurun40, toLpbPasif, toJamNyala400, toLbkb, toSambungLangsung, toPotensialAmr, rincianBongkar, rincianNormal, temuanTotalPlg, p1Plg, p2Plg, p2Kwh, p3Plg, p3Kwh, p4Plg, p4Kwh, k2Plg, k2Kwh, targetHarianKwh, realisasiHarianKwh, percentages, realisasiBulanKwh, targetKumulatifKwh, realisasiKumulatifKemarinKwh, targetTahunanKwh, realisasiTahunanKwh]);

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

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in">

      {/* ══════════════════════════════════════════════
           01. CONFIGURATION BAR
      ══════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tanggal Laporan</label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-9 w-fit">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input type="date" value={rawDate} onChange={e => setRawDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-[130px]" />
              </div>
            </div>

            {/* Formatted Date & Unit */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Unit & Periode</label>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                <span className="text-blue-600 dark:text-blue-400">{unitLabel}</span> · {dateInfo.tanggalReport}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-blue-500 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memuat data...</span>
              </div>
            ) : (
              lastFetch && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  <span>Diperbarui: {formatLastFetch(lastFetch)}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
           02. MAIN GRID
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ──────── LEFT 7 cols (Form Controls) ──────── */}
        <div className="lg:col-span-7 flex flex-col gap-5">

          {/* ── 1. Petugas P2TL & Organik ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">1 & 2. Petugas P2TL & Organik</h3>
                <p className="text-[9px] sm:text-xs text-slate-400 font-medium">Jumlah regu lapangan & personil organik</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Regu P2TL</label>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                  <input type="text" value={petugasRegu} onChange={e => setPetugasRegu(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                  <span className="text-[10px] text-slate-400 font-bold">Regu</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Total Petugas</label>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                  <input type="text" value={petugasJumlah} onChange={e => setPetugasJumlah(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                  <span className="text-[10px] text-slate-400 font-bold">Orang</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Petugas Organik</label>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                  <input type="text" value={organikJumlah} onChange={e => setOrganikJumlah(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                  <span className="text-[10px] text-slate-400 font-bold">Orang</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 col-span-2 sm:col-span-3">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Pemeriksaan Plg TR Potensial</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                    <input type="text" value={trPotensialRegu} onChange={e => setTrPotensialRegu(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                    <span className="text-[10px] text-slate-400 font-bold">Regu</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                    <input type="text" value={trPotensialOrang} onChange={e => setTrPotensialOrang(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                    <span className="text-[10px] text-slate-400 font-bold">Orang</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Rencana TO Hari Ini ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">3. Rencana TO Hari Ini</h3>
                  <p className="text-[9px] sm:text-xs text-slate-400 font-medium">Kategori sasaran target operasi pelanggan</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Pemakaian Turun 40%', val: toTurun40, set: setToTurun40 },
                { label: 'LPB Pasif', val: toLpbPasif, set: setToLpbPasif },
                { label: 'Jam Nyala > 400', val: toJamNyala400, set: setToJamNyala400 },
                { label: 'LBKB', val: toLbkb, set: setToLbkb },
                { label: 'Sambung Langsung', val: toSambungLangsung, set: setToSambungLangsung },
                { label: 'TO Potensial AMR', val: toPotensialAmr, set: setToPotensialAmr }
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase truncate" title={item.label}>{item.label}</label>
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                    <input type="text" value={item.val} onChange={e => item.set(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                    <span className="text-[10px] text-slate-400 font-bold">Plg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. Rincian Pemeriksaan & Temuan ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <SearchCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">4. Rincian Pemeriksaan & Temuan</h3>
                  <p className="text-[9px] sm:text-xs text-slate-400 font-medium">Hasil pemeriksaan lapangan & temuan per golongan</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400">{temuanTotalPlg} Plg</span>
                <span className="text-[9px] text-slate-400 block font-bold">Total Temuan</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Pembongkaran</label>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                  <input type="text" value={rincianBongkar} onChange={e => setRincianBongkar(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                  <span className="text-[10px] text-slate-400 font-bold">Plg</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Normal</label>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                  <input type="text" value={rincianNormal} onChange={e => setRincianNormal(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                  <span className="text-[10px] text-slate-400 font-bold">Plg</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Temuan P1</label>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                  <input type="text" value={p1Plg} onChange={e => setP1Plg(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                  <span className="text-[10px] text-slate-400 font-bold">Plg</span>
                </div>
              </div>
            </div>

            {/* Golongan breakdown: P2, P3, P4, K2 */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detail Temuan & kWh</span>
              {[
                { label: 'P2', plg: p2Plg, setPlg: setP2Plg, kwh: p2Kwh, setKwh: setP2Kwh },
                { label: 'P3', plg: p3Plg, setPlg: setP3Plg, kwh: p3Kwh, setKwh: setP3Kwh },
                { label: 'P4', plg: p4Plg, setPlg: setP4Plg, kwh: p4Kwh, setKwh: setP4Kwh },
                { label: 'K2', plg: k2Plg, setPlg: setK2Plg, kwh: k2Kwh, setKwh: setK2Kwh },
              ].map(item => (
                <div key={item.label} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  <div className="col-span-2 text-xs font-black text-slate-700 dark:text-slate-300 pl-1">{item.label}</div>
                  <div className="col-span-4 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <input type="text" value={item.plg} onChange={e => item.setPlg(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none" />
                    <span className="text-[9px] text-slate-400 font-bold">Plg</span>
                  </div>
                  <div className="col-span-6 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <input type="text" value={item.kwh} onChange={e => item.setKwh(e.target.value)}
                      className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none text-right" />
                    <span className="text-[9px] text-slate-400 font-bold shrink-0">kWh</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 4. Parameter Target & Realisasi kWh ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">Parameter Target & Realisasi kWh</h3>
                <p className="text-[9px] sm:text-xs text-slate-400 font-medium">Harian, Bulanan, Kumulatif, dan Tahunan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Target & Realisasi Harian */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-[9px] font-black text-slate-400 uppercase">Target Harian (kWh)</label>
                <input type="text" value={targetHarianKwh} onChange={e => setTargetHarianKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-slate-900 dark:text-white mt-1" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Realisasi Harian</label>
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 font-mono">{percentages.persenHarianFormatted}</span>
                </div>
                <input type="text" value={realisasiHarianKwh} onChange={e => setRealisasiHarianKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-emerald-600 dark:text-emerald-400 mt-1" />
              </div>

              {/* Realisasi Bulan & Target Bulan */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Realisasi Bulan {dateInfo.namaBulan}</label>
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 font-mono">{percentages.persenBulanFormatted}</span>
                </div>
                <input type="text" value={realisasiBulanKwh} onChange={e => setRealisasiBulanKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-blue-600 dark:text-blue-400 mt-1" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-[9px] font-black text-slate-400 uppercase">Target Bulan {dateInfo.namaBulan}</label>
                <input type="text" value={targetBulanKwh} onChange={e => setTargetBulanKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-slate-900 dark:text-white mt-1" />
              </div>

              {/* Target Kumulatif & Realisasi Kumulatif Kemarin */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-[9px] font-black text-slate-400 uppercase">Target Kumulatif (kWh)</label>
                <input type="text" value={targetKumulatifKwh} onChange={e => setTargetKumulatifKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-slate-900 dark:text-white mt-1" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase truncate" title={`Realisasi Kumulatif s.d ${dateInfo.tanggalKemarin}`}>
                    Kumulatif s.d {dateInfo.tanggalKemarin}
                  </label>
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 font-mono">{percentages.persenKumulatifFormatted}</span>
                </div>
                <input type="text" value={realisasiKumulatifKemarinKwh} onChange={e => setRealisasiKumulatifKemarinKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-emerald-600 dark:text-emerald-400 mt-1" />
              </div>

              {/* Target Tahunan & Realisasi Tahunan */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-[9px] font-black text-slate-400 uppercase">Target Tahunan (kWh)</label>
                <input type="text" value={targetTahunanKwh} onChange={e => setTargetTahunanKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-slate-900 dark:text-white mt-1" />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Realisasi Kumulatif Tahunan</label>
                  <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 font-mono">{percentages.persenTahunanFormatted}</span>
                </div>
                <input type="text" value={realisasiTahunanKwh} onChange={e => setRealisasiTahunanKwh(e.target.value)}
                  className="w-full text-base font-black font-mono bg-transparent outline-none text-purple-600 dark:text-purple-400 mt-1" />
              </div>
            </div>
          </div>

        </div> {/* end LEFT col */}

        {/* ──────── RIGHT 5 cols (WhatsApp Preview & Buttons) ──────── */}
        <div className="lg:col-span-5 lg:sticky lg:top-[90px] flex flex-col gap-4">

          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pratinjau Pesan WhatsApp</span>
            </div>
            <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">Siap Kirim</span>
          </div>

          {/* Chat Container */}
          <div className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 shadow-md">
            {/* WA Header */}
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-black shrink-0 border border-white/20">UP3</div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">Manager UP3 · Asman TEL</div>
                <div className="text-green-200 text-[9px] font-bold">Pelaksanaan P2TL {unitLabel}</div>
              </div>
              <div className="text-[9px] text-green-200/60 font-bold hidden sm:block">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            {/* Messages Area */}
            <div className="p-4 min-h-[420px] flex flex-col items-start"
              style={{
                background: '#e5ddd5',
                backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                backgroundSize: '200px',
                backgroundRepeat: 'repeat',
              }}>
              {/* Message Bubble */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm max-w-[98%] shadow-sm overflow-hidden">
                <div className="px-3.5 pt-3.5 pb-1">
                  <pre className="font-mono text-[10.5px] whitespace-pre-wrap leading-relaxed break-words text-slate-800 dark:text-slate-200 tracking-tight select-text">{generatedText}</pre>
                </div>
                <div className="flex items-center justify-end gap-1 px-3.5 pb-2.5 mt-0.5">
                  <span className="text-[9px] font-bold text-slate-400">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
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
