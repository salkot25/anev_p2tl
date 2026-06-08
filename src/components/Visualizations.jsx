import React from 'react';

export default function Visualizations({ targets }) {
  const total = targets.length;

  if (total === 0) return null;

  // 1. Status breakdown (Donut Chart)
  const sesuai = targets.filter(t => String(t.StatusProgress).toLowerCase().includes('sesuai')).length;
  const k2 = targets.filter(t => String(t.StatusProgress).toLowerCase().includes('k2')).length;
  const pOther = targets.filter(t => String(t.StatusProgress).toLowerCase().includes('temuan') && !String(t.StatusProgress).toLowerCase().includes('k2')).length;
  const pending = total - sesuai - k2 - pOther;

  const statusData = [
    { label: 'Sesuai (Normal)', count: sesuai, color: 'stroke-emerald-500 text-emerald-500 bg-emerald-500', fill: '#10b981' },
    { label: 'Temuan K2', count: k2, color: 'stroke-amber-500 text-amber-500 bg-amber-500', fill: '#f59e0b' },
    { label: 'Temuan P1/P4', count: pOther, color: 'stroke-rose-500 text-rose-500 bg-rose-500', fill: '#f43f5e' },
    { label: 'Belum Periksa', count: pending, color: 'stroke-slate-300 text-slate-400 bg-slate-300 dark:stroke-slate-700 dark:bg-slate-700', fill: '#94a3b8' }
  ].filter(item => item.count > 0);

  // Donut values calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.16
  
  let accumulatedPercent = 0;
  const donutSegments = statusData.map(item => {
    const percent = item.count / total;
    const strokeLength = percent * circumference;
    const strokeOffset = circumference - (accumulatedPercent * circumference);
    accumulatedPercent += percent;
    return {
      ...item,
      percent: Math.round(percent * 100),
      strokeDasharray: `${strokeLength} ${circumference}`,
      strokeDashoffset: strokeOffset
    };
  });

  // 2. Sumber distribution (Bar Chart)
  const sumberMap = {};
  targets.forEach(t => {
    const src = t.Sumber || 'LAINNYA';
    sumberMap[src] = (sumberMap[src] || 0) + 1;
  });

  const sumberData = Object.keys(sumberMap).map(key => ({
    label: key,
    count: sumberMap[key],
    percent: Math.round((sumberMap[key] / total) * 100)
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Donut Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 dark:bg-slate-900 dark:border-slate-900/60 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans tracking-wide">
            Distribusi Status Pemeriksaan
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Breakdown dari total target yang diperiksa
          </p>
        </div>

        <div className="flex flex-row items-center justify-around mt-6 gap-2">
          {/* SVG Donut */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle 
                cx="60" 
                cy="60" 
                r={radius} 
                className="fill-none stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="12"
              />
              {donutSegments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="60"
                  cy="60"
                  r={radius}
                  className={`fill-none ${seg.color} transition-all duration-500 ease-out`}
                  strokeWidth="12"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="round"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-800 dark:text-white leading-none">
                {total}
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">
                Target
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2.5">
            {donutSegments.map((seg, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${seg.bgClass || seg.color} flex-shrink-0`} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-400 leading-none">
                    {seg.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {seg.count} item ({seg.percent}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 dark:bg-slate-900 dark:border-slate-900/60 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-sans tracking-wide">
            Sumber Target Operasi
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Proporsi asal data target P2TL
          </p>
        </div>

        <div className="flex flex-col gap-4 mt-6">
          {sumberData.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-400">
                  {item.label}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {item.count} Target ({item.percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    idx === 0 
                      ? 'bg-brand-500 dark:bg-brand-600' 
                      : idx === 1 
                        ? 'bg-sky-400 dark:bg-sky-500' 
                        : 'bg-emerald-400 dark:bg-emerald-500'
                  }`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
