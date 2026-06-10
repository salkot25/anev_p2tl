import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  MapPin, 
  Hash, 
  User, 
  Clock, 
  Settings, 
  Layers, 
  Zap 
} from 'lucide-react';

export default function DetailDrawer({ target, isOpen, onClose }) {
  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !target) return null;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      // Clean string (e.g., "2026-06-08 01:38:03.982418+00")
      const clean = dateStr.split('+')[0].replace(' ', 'T');
      const date = new Date(clean);
      if (isNaN(date.getTime())) return dateStr; // fallback to raw string
      return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const isTemuan = String(target.StatusProgress).toLowerCase().includes('temuan');
  const statusBadgeColor = isTemuan 
    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30';

  const details = [
    { label: 'ID Pelanggan', value: target.IDPel, icon: Hash },
    { label: 'Tarif / Daya', value: `${target.Tarif || '-'} / ${target.Daya || 0} VA`, icon: Zap },
    { label: 'Gardu / Tiang', value: `${target.Gardu || '-'} / ${target.Tiang || '-'}`, icon: MapPin },
    { label: 'Regu Petugas', value: target.ReguPetugas || 'Tidak Ditentukan', icon: User },
    { label: 'Sumber Data', value: target.Sumber || '-', icon: Layers },
    { label: 'Durasi Pengerjaan', value: `${target.DurasiMenit || 0} Menit`, icon: Clock },
    { label: 'DLPD / Sub DLPD', value: `${target.DLPD || '-'} ${target.SubDLPD ? `(${target.SubDLPD})` : ''}`, icon: Settings },
    { label: 'Bank ID', value: target.bank_id || '-', icon: Hash, mono: true }
  ];

  const dates = [
    { label: 'Tanggal Upload', value: target.TanggalUpload },
    { label: 'Tanggal Order', value: target.TanggalOrder },
    { label: 'Tanggal Pelaksanaan', value: target.TanggalPelaksanaan }
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-stretch md:justify-end animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Sheet / Drawer content */}
      <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[2.5rem] md:rounded-t-none md:rounded-l-[2.5rem] shadow-2xl transition-all duration-300 transform translate-y-0 md:translate-y-0 md:w-[480px] max-h-[85vh] md:max-h-full flex flex-col z-10 overflow-hidden">
        
        {/* Mobile Swipe Bar Indicator */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-3 md:hidden" onClick={onClose} />

        {/* Header */}
        <div className="px-6 pb-4 pt-2 md:pt-8 flex justify-between items-start border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest leading-none">
              Detail Target P2TL
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight font-sans">
              {target.NamaPelanggan || 'Tanpa Nama'}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeColor}`}>
                {target.StatusProgress}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-full text-slate-400 hover:text-slate-655 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          
          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-4">
            {details.map((detail, idx) => {
              const Icon = detail.icon;
              return (
                <div key={idx} className="flex gap-4 items-center">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-500 dark:text-slate-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                      {detail.label}
                    </span>
                    <span className={`text-sm font-bold text-slate-800 dark:text-slate-200 ${detail.mono ? 'font-mono text-xs' : ''}`}>
                      {detail.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <hr className="border-slate-100 dark:border-slate-800/80" />

          {/* Dates Section */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Linimasa & Tanggal
            </h4>
            <div className="flex flex-col gap-4 pl-1 border-l-2 border-slate-100 dark:border-slate-800/60">
              {dates.map((d, idx) => (
                <div key={idx} className="relative pl-5 flex flex-col gap-0.5">
                  {/* Timeline bullet */}
                  <span className="absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-brand-500 flex items-center justify-center" />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none">
                    {d.label}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-450" />
                    {formatDate(d.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
