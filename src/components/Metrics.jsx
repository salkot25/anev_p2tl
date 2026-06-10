import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  Activity 
} from 'lucide-react';

export default function Metrics({ targets }) {
  // Calculations
  const total = targets.length;
  
  const sesuai = targets.filter(t => 
    String(t.StatusProgress).toLowerCase().includes('sesuai')
  ).length;
  
  const temuan = targets.filter(t => 
    String(t.StatusProgress).toLowerCase().includes('temuan')
  ).length;
  
  const pending = total - sesuai - temuan;
  
  const totalDuration = targets.reduce((acc, t) => acc + (t.DurasiMenit || 0), 0);
  const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;
  
  const uniqueRegu = new Set(
    targets.map(t => t.ReguPetugas).filter(Boolean)
  ).size;

  const cardData = [
    {
      title: 'Total Target P2TL',
      value: total,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-100 dark:border-blue-900/30'
    },
    {
      title: 'Pemeriksaan Sesuai',
      value: sesuai,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-100 dark:border-emerald-900/30'
    },
    {
      title: 'Temuan Pelanggaran',
      value: temuan,
      icon: AlertTriangle,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-100 dark:border-rose-900/30'
    },
    {
      title: 'Belum Diperiksa (Pending)',
      value: pending,
      icon: Activity,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-100 dark:border-amber-900/30'
    },
    {
      title: 'Rata-rata Durasi',
      value: `${avgDuration} m`,
      subtitle: `Total: ${totalDuration} menit`,
      icon: Clock,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/40',
      borderColor: 'border-violet-100 dark:border-violet-900/30'
    },
    {
      title: 'Regu Petugas Aktif',
      value: uniqueRegu,
      icon: Users,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/40',
      borderColor: 'border-sky-100 dark:border-sky-900/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cardData.map((card, index) => {
        const Icon = card.icon;
        return (
          <div 
            key={index}
            className={`bg-white rounded-2xl border ${card.borderColor} p-4 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans tracking-wide uppercase">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="mt-4">
              <div className="text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </div>
              {card.subtitle && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
