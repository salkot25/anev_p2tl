import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Plus, 
  Upload, 
  Download, 
  X, 
  RefreshCw, 
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  Zap
} from 'lucide-react';
import { parseExcel } from '../utils/excelParser';
import * as XLSX from 'xlsx';

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

function createNewRecord(manualForm) {
  const timestamp = Date.now();
  const dateStr = new Date().toISOString().replace('T', ' ').split('.')[0] + '+00';
  return {
    ...manualForm,
    bank_id: manualForm.bank_id || `BTO${manualForm.IDPel}${timestamp}`,
    TanggalUpload: dateStr,
    TanggalOrder: dateStr,
    TanggalPelaksanaan: dateStr
  };
}

function MultiSelectDropdown({ label, options, selectedValues, onChange, allLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOption = (val) => {
    let next;
    const currentSelected = selectedValues === null ? options : selectedValues;
    if (currentSelected.includes(val)) {
      next = currentSelected.filter(v => v !== val);
    } else {
      next = [...currentSelected, val];
    }
    
    if (next.length === options.length) {
      onChange(null);
    } else {
      onChange(next);
    }
  };

  const handleSelectAll = () => {
    onChange(null);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const isSelected = (val) => {
    if (selectedValues === null) return true;
    return selectedValues.includes(val);
  };

  const filteredOptions = useMemo(() => {
    return options.filter(o => {
      const displayStr = String(o === '' ? '(Tanpa Data)' : o);
      return displayStr.toLowerCase().includes(search.toLowerCase());
    });
  }, [options, search]);

  const displayText = useMemo(() => {
    if (selectedValues === null) return allLabel;
    if (selectedValues.length === 0) return 'Tidak ada data';
    if (selectedValues.length === options.length) return allLabel;
    return `${selectedValues.length} Terpilih`;
  }, [selectedValues, options, allLabel]);

  return (
    <div className="relative flex flex-col gap-1.5 w-full" ref={dropdownRef}>
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-700 dark:text-slate-300 transition-all flex items-center justify-between hover:border-slate-350 dark:hover:border-slate-750 cursor-pointer active:scale-[0.98]"
      >
        <span className="truncate pr-2">{displayText}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-450 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in min-w-[200px]">
          {options.length > 5 && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
              <input
                type="text"
                placeholder="Cari..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full py-1 px-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-300"
              />
            </div>
          )}
          
          <div className="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-slate-50/30 dark:bg-slate-950/10 shrink-0">
            <button type="button" onClick={handleSelectAll} className="hover:underline cursor-pointer">Pilih Semua</button>
            <button type="button" onClick={handleClearAll} className="hover:underline cursor-pointer">Hapus Semua</button>
          </div>
          
          <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-slate-450 dark:text-slate-550 text-[11px]">Tidak ada kecocokan</div>
            ) : (
              filteredOptions.map(o => {
                const isItemSel = isSelected(o);
                return (
                  <label
                    key={o}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                      isItemSel 
                        ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100 font-semibold' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isItemSel}
                      onChange={() => handleToggleOption(o)}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer w-3.5 h-3.5"
                    />
                    <span className="truncate">{o === '' ? '(Tanpa Data)' : o}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DataList({ targets, onSelectRecord, onAddRecord, onDataLoaded }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubDlpds, setSelectedSubDlpds] = useState(null);
  const [selectedRegus, setSelectedRegus] = useState(null);
  const [selectedDlpds, setSelectedDlpds] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDateType, setSelectedDateType] = useState('pelaksanaan'); // pelaksanaan, order, upload
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const statusOptions = useMemo(() => ['Sesuai (Normal)', 'Temuan (Pelanggaran)', 'Pending'], []);
  
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('NONE'); // NONE, ASC, DESC

  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDirection === 'ASC') {
        setSortDirection('DESC');
      } else if (sortDirection === 'DESC') {
        setSortDirection('NONE');
        setSortField(null);
      } else {
        setSortDirection('ASC');
      }
    } else {
      setSortField(field);
      setSortDirection('ASC');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40 ml-1.5 inline-block" />;
    if (sortDirection === 'ASC') return <ArrowUp className="w-3 h-3 text-blue-500 ml-1.5 inline-block" />;
    if (sortDirection === 'DESC') return <ArrowDown className="w-3 h-3 text-blue-500 ml-1.5 inline-block" />;
    return <ArrowUpDown className="w-3 h-3 opacity-40 ml-1.5 inline-block" />;
  };
  
  // Unified Add Target Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState('manual'); // manual, excel
  const [manualForm, setManualForm] = useState({
    IDPel: '',
    NamaPelanggan: '',
    Tarif: 'R1',
    Daya: 450,
    Gardu: '000',
    Tiang: '000',
    ULP: 'ULP SALATIGA KOTA',
    UP3: 'UP3 SALATIGA',
    DLPD: 'SISIR TARGET',
    SubDLPD: '',
    ReguPetugas: '52351.A',
    StatusProgress: 'Target Operasi - Periksa - Sesuai',
    DurasiMenit: 0,
    Sumber: 'DLPD',
    bank_id: ''
  });
  const [manualErrors, setManualErrors] = useState({});

  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, parsing, success, error
  const [uploadReport, setUploadReport] = useState(null); 
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      setUploadStatus('error');
      setUploadReport({ 
        errors: ['Tipe file tidak didukung. Harap unggah file Excel (.xlsx atau .xls).'] 
      });
      return;
    }

    setFileName(file.name);
    setUploadStatus('parsing');
    setUploadReport(null);

    try {
      const result = await parseExcel(file);
      setParsedData(result.data);
      setUploadReport({
        successCount: result.data.length,
        errors: result.errors
      });
      setUploadStatus('success');
    } catch (err) {
      setUploadStatus('error');
      setUploadReport({ errors: [err.message] });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirmMerge = () => {
    onDataLoaded(parsedData, 'merge');
    resetUploader();
    setIsAddModalOpen(false);
  };

  const handleConfirmOverwrite = () => {
    onDataLoaded(parsedData, 'overwrite');
    resetUploader();
    setIsAddModalOpen(false);
  };

  const resetUploader = () => {
    setUploadStatus('idle');
    setUploadReport(null);
    setFileName('');
    setParsedData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualForm(prev => ({
      ...prev,
      [name]: name === 'Daya' || name === 'DurasiMenit' ? (parseInt(value, 10) || 0) : value
    }));
    if (manualErrors[name]) {
      setManualErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!manualForm.IDPel) {
      newErrors.IDPel = 'ID Pelanggan wajib diisi.';
    } else if (!/^\d+$/.test(manualForm.IDPel)) {
      newErrors.IDPel = 'ID Pelanggan harus berupa angka.';
    }
    
    if (!manualForm.NamaPelanggan.trim()) {
      newErrors.NamaPelanggan = 'Nama Pelanggan wajib diisi.';
    }

    if (Object.keys(newErrors).length > 0) {
      setManualErrors(newErrors);
      return;
    }

    const finalData = createNewRecord(manualForm);

    onAddRecord(finalData);
    setIsAddModalOpen(false);
    resetManualForm();
  };

  const resetManualForm = () => {
    setManualForm({
      IDPel: '',
      NamaPelanggan: '',
      Tarif: 'R1',
      Daya: 450,
      Gardu: '000',
      Tiang: '000',
      ULP: 'ULP SALATIGA KOTA',
      UP3: 'UP3 SALATIGA',
      DLPD: 'SISIR TARGET',
      SubDLPD: '',
      ReguPetugas: '52351.A',
      StatusProgress: 'Target Operasi - Periksa - Sesuai',
      DurasiMenit: 0,
      Sumber: 'DLPD',
      bank_id: ''
    });
    setManualErrors({});
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["DATA TO"],
      [],
      [
        "No", "IDPel", "Nama Pelanggan", "Tarif", "Daya", "Gardu", "Tiang", 
        "ULP", "UP3", "DLPD", "Sub DLPD", "Tanggal Upload", "Regu Petugas", 
        "Tanggal Order", "Tanggal Pelaksanaan", "Status Progress", "Durasi (Menit)", 
        "Sumber", "bank_id"
      ],
      [
        1, 15120018728, "BALAI / BADERI", "S1", 450, "000", "000", 
        "ULP SALATIGA KOTA", "UP3 SALATIGA", "SISIR TARGET", "", "2026-06-08 01:04:22+00", "52351.C", 
        "2026-06-08 01:04:22+00", "2026-06-08 01:04:22+00", "Target Operasi - Temuan - P4", 0, 
        "SISIR", "BTO151200187281780880662.000000"
      ]
    ]);
    
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 22 }, { wch: 12 },
      { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DATA TO");
    XLSX.writeFile(wb, "Template_Data_TO.xlsx");
  };

  const itemsPerPage = 10;

  // Helper to map and compute matches per target row
  const targetMatches = useMemo(() => {
    return targets.map(t => {
      const matchesSearch = 
        String(t.IDPel || '').includes(searchQuery) ||
        String(t.NamaPelanggan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(t.Gardu || t.GARDU || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(t.Alamat || t.ALAMAT || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const subVal = t.SubDLPD ? String(t.SubDLPD).trim() : '';
      const matchesSubDlpd = selectedSubDlpds === null || selectedSubDlpds.includes(subVal);
      
      const reguVal = t.ReguPetugas ? String(t.ReguPetugas).trim() : '';
      const matchesRegu = selectedRegus === null || selectedRegus.includes(reguVal);
      
      const dlpdVal = t.DLPD ? String(t.DLPD).trim() : '';
      const matchesDlpd = selectedDlpds === null || selectedDlpds.includes(dlpdVal);
      
      let matchesStatus = false;
      if (selectedStatuses === null) {
        matchesStatus = true;
      } else {
        const statusLower = String(t.StatusProgress || '').toLowerCase();
        if (selectedStatuses.includes('Sesuai (Normal)') && statusLower.includes('sesuai')) matchesStatus = true;
        if (selectedStatuses.includes('Temuan (Pelanggaran)') && statusLower.includes('temuan')) matchesStatus = true;
        if (selectedStatuses.includes('Pending') && !statusLower.includes('sesuai') && !statusLower.includes('temuan')) matchesStatus = true;
      }

      let matchesDate = true;
      if (selectedDate) {
        const targetDateStr = 
          selectedDateType === 'order' ? (t.TanggalOrder || t.TanggalUpload) :
          selectedDateType === 'upload' ? t.TanggalUpload :
          t.TanggalPelaksanaan;
        
        matchesDate = normalizeDateString(targetDateStr) === selectedDate;
      }

      return {
        target: t,
        search: matchesSearch,
        subDlpd: matchesSubDlpd,
        regu: matchesRegu,
        dlpd: matchesDlpd,
        status: matchesStatus,
        date: matchesDate
      };
    });
  }, [targets, searchQuery, selectedSubDlpds, selectedRegus, selectedDlpds, selectedStatuses, selectedDate, selectedDateType]);

  // Extract unique filter options dynamically linked based on other active filters
  const filterOptions = useMemo(() => {
    const subDlpds = new Set();
    const regus = new Set();
    const dlpds = new Set();

    targetMatches.forEach(m => {
      // Options for Sub DLPD (filtered by search, regu, dlpd, status, date)
      if (m.search && m.regu && m.dlpd && m.status && m.date) {
        subDlpds.add(m.target.SubDLPD ? String(m.target.SubDLPD).trim() : '');
      }
      // Options for Regu (filtered by search, subDlpd, dlpd, status, date)
      if (m.search && m.subDlpd && m.dlpd && m.status && m.date) {
        regus.add(m.target.ReguPetugas ? String(m.target.ReguPetugas).trim() : '');
      }
      // Options for DLPD (filtered by search, subDlpd, regu, status, date)
      if (m.search && m.subDlpd && m.regu && m.status && m.date) {
        dlpds.add(m.target.DLPD ? String(m.target.DLPD).trim() : '');
      }
    });

    return {
      subDlpds: Array.from(subDlpds).sort(),
      regus: Array.from(regus).sort(),
      dlpds: Array.from(dlpds).sort()
    };
  }, [targetMatches]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [targetMatches]);

  // Filter data based on choices
  const filteredTargets = useMemo(() => {
    return targetMatches
      .filter(m => m.search && m.subDlpd && m.regu && m.dlpd && m.status && m.date)
      .map(m => m.target);
  }, [targetMatches]);

  // Sort data based on sort configuration
  const sortedTargets = useMemo(() => {
    if (!sortField || sortDirection === 'NONE') return filteredTargets;
    
    return [...filteredTargets].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'Daya') {
        valA = parseInt(a.Daya, 10) || 0;
        valB = parseInt(b.Daya, 10) || 0;
      } else if (sortField === 'DurasiMenit') {
        valA = parseInt(a.DurasiMenit, 10) || 0;
        valB = parseInt(b.DurasiMenit, 10) || 0;
      }
      
      if (typeof valA === 'string') {
        return sortDirection === 'ASC' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'ASC' 
          ? (valA > valB ? 1 : -1) 
          : (valA < valB ? 1 : -1);
      }
    });
  }, [filteredTargets, sortField, sortDirection]);

  // Pagination calculations
  const totalItems = filteredTargets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  const paginatedTargets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTargets.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTargets, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // --- Selection states and actions ---
  const paginatedIds = useMemo(() => paginatedTargets.map(t => String(t.IDPel)), [paginatedTargets]);
  
  const isAllSelected = useMemo(() => {
    if (paginatedIds.length === 0) return false;
    return paginatedIds.every(id => selectedIds.has(id));
  }, [paginatedIds, selectedIds]);

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllSelected) {
        paginatedIds.forEach(id => next.delete(id));
      } else {
        paginatedIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (idpel) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const idStr = String(idpel);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      return next;
    });
  };

  const handleExportSelected = () => {
    const selectedTargets = targets.filter(t => selectedIds.has(String(t.IDPel)));
    if (selectedTargets.length === 0) return;

    const dataToExport = selectedTargets.map((t, index) => ({
      'No': index + 1,
      'IDPel': parseInt(t.IDPel, 10) || t.IDPel,
      'Nama Pelanggan': t.NamaPelanggan || '',
      'Tarif': t.Tarif || '',
      'Daya': t.Daya || 0,
      'Gardu': t.Gardu || '',
      'Tiang': t.Tiang || '',
      'ULP': t.ULP || '',
      'UP3': t.UP3 || '',
      'DLPD': t.DLPD || '',
      'Sub DLPD': t.SubDLPD || '',
      'Tanggal Upload': t.TanggalUpload || '',
      'Regu Petugas': t.ReguPetugas || '',
      'Tanggal Order': t.TanggalOrder || '',
      'Tanggal Pelaksanaan': t.TanggalPelaksanaan || '',
      'Status Progress': t.StatusProgress || '',
      'Durasi (Menit)': t.DurasiMenit || 0,
      'Sumber': t.Sumber || '',
      'bank_id': t.bank_id || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 22 }, { wch: 12 },
      { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DATA TO");
    
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `${dateStr}_DATA_TO_Export.xlsx`);
    
    setSelectedIds(new Set());
  };

  // Status badge styling helper
  const getStatusBadge = (statusStr) => {
    const statusLower = String(statusStr).toLowerCase();
    
    if (statusLower.includes('sesuai')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">
          <CheckCircle2 className="w-3 h-3" />
          Sesuai
        </span>
      );
    } else if (statusLower.includes('temuan')) {
      // Find what type (P1, P4, K2)
      let type = 'Temuan';
      if (statusLower.includes('k2')) type = 'Temuan K2';
      else if (statusLower.includes('p1')) type = 'Temuan P1';
      else if (statusLower.includes('p4')) type = 'Temuan P4';

      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450 border border-rose-100 dark:border-rose-900/20">
          <AlertTriangle className="w-3 h-3" />
          {type}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-655 dark:bg-slate-800 dark:text-slate-400">
          <AlertCircle className="w-3 h-3" />
          Pending
        </span>
      );
    }
  };

  // --- Summary stats ---
  const totalCount = targets.length;
  const inspectedCount = targets.filter(t => t.StatusProgress && t.StatusProgress !== 'Target Operasi').length;
  const temuanCount = targets.filter(t => t.StatusProgress && String(t.StatusProgress).toLowerCase().includes('temuan')).length;
  const highPowerCount = targets.filter(t => parseInt(t.Daya, 10) >= 6600).length;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* 01. Summary Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Target TO', 
            value: totalCount, 
            sub: 'Pelanggan terdaftar', 
            color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/10 dark:border-blue-500/10',
            icon: FileText
          },
          { 
            label: 'Selesai Diperiksa', 
            value: inspectedCount, 
            sub: `${totalCount > 0 ? ((inspectedCount / totalCount) * 100).toFixed(0) : 0}% terealisasi`, 
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/10 dark:border-emerald-500/10',
            icon: CheckCircle
          },
          { 
            label: 'Temuan Pelanggaran', 
            value: temuanCount, 
            sub: `${inspectedCount > 0 ? ((temuanCount / inspectedCount) * 100).toFixed(0) : 0}% rasio temuan`, 
            color: 'text-rose-600 dark:text-rose-455 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/10 dark:border-rose-500/10',
            icon: AlertTriangle
          },
          { 
            label: 'Daya ≥ 6,6 kVA', 
            value: highPowerCount, 
            sub: 'Pelanggan 3 phasa', 
            color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/10 dark:border-amber-500/10',
            icon: Zap
          },
        ].map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/85 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{s.label}</span>
                <span className="text-2xl font-black font-mono leading-none text-slate-900 dark:text-white block">{s.value.toLocaleString('id-ID')}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">{s.sub}</span>
              </div>
              <div className={`p-3 rounded-xl border ${s.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>
      {/* 02. Toolbar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        {/* Search and Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search Input wrapper */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Cari IDPel atau Nama Pelanggan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-text pl-10 text-xs sm:text-sm font-sans"
            />
          </div>

          {/* Buttons wrapper */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0">
            {selectedIds.size > 0 && (
              <button onClick={handleExportSelected}
                className="hidden sm:inline-flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-sans font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/10 transition-all cursor-pointer shrink-0 w-full sm:w-auto"
              >
                <Download className="w-4 h-4" />
                <span>Ekspor ({selectedIds.size})</span>
              </button>
            )}

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary py-2.5 px-3 flex gap-2 items-center justify-center text-xs sm:text-sm font-sans w-full sm:w-auto ${
                showFilters ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700' : ''
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {(selectedSubDlpds !== null || selectedRegus !== null || selectedDlpds !== null || selectedStatuses !== null || selectedDate !== '') && (
                <span className="w-2 h-2 bg-brand-500 rounded-full" />
              )}
            </button>

            <button 
              onClick={() => {
                setIsAddModalOpen(true);
                setAddMode('manual');
              }}
              className="btn-primary py-2.5 px-3.5 flex gap-2 items-center justify-center text-xs sm:text-sm font-sans w-full sm:w-auto"
            >
              <Plus className="w-4.5 h-4.5" />
              Tambah Data
            </button>
          </div>
        </div>

        {/* Filter panel dropdown */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
            {/* Regu Petugas */}
            <MultiSelectDropdown
              label="Regu Petugas"
              options={filterOptions.regus}
              selectedValues={selectedRegus}
              onChange={setSelectedRegus}
              allLabel="Semua Regu"
            />

            {/* DLPD */}
            <MultiSelectDropdown
              label="DLPD"
              options={filterOptions.dlpds}
              selectedValues={selectedDlpds}
              onChange={setSelectedDlpds}
              allLabel="Semua DLPD"
            />

            {/* Sub DLPD */}
            <MultiSelectDropdown
              label="Sub DLPD"
              options={filterOptions.subDlpds}
              selectedValues={selectedSubDlpds}
              onChange={setSelectedSubDlpds}
              allLabel="Semua Sub DLPD"
            />

            {/* Status Progress */}
            <MultiSelectDropdown
              label="Status Progress"
              options={statusOptions}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              allLabel="Semua Status"
            />

            {/* Filter Tanggal */}
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Filter Tanggal
              </span>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-text py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl outline-none text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              />
            </div>

            {/* Jenis Tanggal */}
            <div className="flex flex-col gap-1.5 w-full">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Jenis Tanggal
              </span>
              <select 
                value={selectedDateType}
                onChange={(e) => setSelectedDateType(e.target.value)}
                className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                <option value="pelaksanaan">Tgl Pelaksanaan</option>
                <option value="order">Tgl Order</option>
                <option value="upload">Tgl Upload</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Target count display */}
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-sans">
          Menampilkan <strong className="text-slate-800 dark:text-slate-205">{totalItems}</strong> Target P2TL
        </span>
        {currentPage > 1 && (
          <span className="text-xs text-slate-400">Halaman {currentPage} dari {totalPages}</span>
        )}
      </div>

      {/* Initial empty state (when no data loaded at all) */}
      {targets.length === 0 && (
        <div className="card text-center p-8 flex flex-col items-center justify-center min-h-[200px] border border-slate-100 dark:border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Data Tidak Ditemukan</p>
          <p className="text-xs text-slate-400 dark:text-slate-550 mt-1 max-w-[280px]">
            Silakan unggah data Excel atau tambahkan target manual baru.
          </p>
        </div>
      )}

      {/* Filter empty state for mobile (only when targets.length > 0 but filtered to 0) */}
      {targets.length > 0 && totalItems === 0 && (
        <div className="card text-center p-8 flex flex-col items-center justify-center min-h-[200px] border border-slate-100 dark:border-slate-800 md:hidden">
          <AlertCircle className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Data Tidak Ditemukan</p>
          <p className="text-xs text-slate-400 dark:text-slate-555 mt-1 max-w-[280px]">
            Silakan sesuaikan kata kunci pencarian Anda atau reset filter panel.
          </p>
          {(searchQuery || selectedSubDlpds !== null || selectedRegus !== null || selectedDlpds !== null || selectedStatuses !== null || selectedDate !== '') && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedSubDlpds(null);
                setSelectedRegus(null);
                setSelectedDlpds(null);
                setSelectedStatuses(null);
                setSelectedDate('');
                setSelectedDateType('pelaksanaan');
              }}
              className="btn-secondary py-1.5 px-3 text-xs mt-4 font-sans font-semibold"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      )}

      {/* Mobile-First Layout: Card Grid */}
      {totalItems > 0 && (
        <div className="grid grid-cols-1 gap-3 md:hidden">
        {paginatedTargets.map((target) => {
          const isSelected = selectedIds.has(String(target.IDPel));
          return (
            <div 
              key={target.No || target.IDPel}
              onClick={() => onSelectRecord(target)}
              className={`border p-4.5 rounded-2xl active:scale-[0.99] transition-all cursor-pointer flex flex-col justify-between gap-3.5 shadow-sm ${
                isSelected 
                  ? 'bg-blue-500/5 border-blue-250 dark:border-blue-900/50 shadow-sm shadow-blue-500/5'
                  : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800/80 hover:border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 pr-2 min-w-0">
                  <input type="checkbox" checked={isSelected}
                    onChange={() => toggleSelect(target.IDPel)} 
                    onClick={e => e.stopPropagation()}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-650 focus:ring-blue-500 cursor-pointer w-4 h-4 shrink-0" 
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest leading-none">
                      {target.IDPel}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-150 leading-tight mt-1 truncate font-sans">
                      {target.NamaPelanggan}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(target.StatusProgress)}
                </div>
              </div>

              {/* Specifications row */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-550 dark:text-slate-400 font-medium pt-1">
                <span>{target.Tarif} / {target.Daya} VA</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>Gardu: {target.Gardu || target.GARDU || '-'}</span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/40 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Regu
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {target.ReguPetugas || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    DLPD
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[80px] truncate" title={target.DLPD || ''}>
                    {target.DLPD || '-'}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  Detail
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Desktop Layout: Dense Tabular Grid */}
      {targets.length > 0 && (
        <div className="hidden md:block overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 dark:bg-slate-800 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans select-none">
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-650 focus:ring-blue-500 cursor-pointer w-4 h-4" />
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('IDPel')}>
                    <div className="flex items-center gap-1">
                      <span>ID Pelanggan</span>
                      {getSortIcon('IDPel')}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('NamaPelanggan')}>
                    <div className="flex items-center gap-1">
                      <span>Nama Pelanggan</span>
                      {getSortIcon('NamaPelanggan')}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('Daya')}>
                    <div className="flex items-center gap-1">
                      <span>Tarif/Daya</span>
                      {getSortIcon('Daya')}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('DLPD')}>
                    <div className="flex items-center gap-1">
                      <span>DLPD / Sub DLPD</span>
                      {getSortIcon('DLPD')}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('StatusProgress')}>
                    <div className="flex items-center gap-1">
                      <span>Status Progress</span>
                      {getSortIcon('StatusProgress')}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors" onClick={() => handleSort('DurasiMenit')}>
                    <div className="flex items-center justify-center gap-1">
                      <span>Durasi (m)</span>
                      {getSortIcon('DurasiMenit')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                {totalItems === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 px-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
                          <AlertCircle className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Data Tidak Ditemukan</p>
                        <p className="text-xs text-slate-400 mt-1.5 max-w-xs">Coba ubah kata kunci pencarian atau hapus filter kolom/tabel yang aktif.</p>
                        {(searchQuery || selectedSubDlpds !== null || selectedRegus !== null || selectedDlpds !== null || selectedStatuses !== null || selectedDate !== '') && (
                          <button onClick={() => {
                            setSearchQuery('');
                            setSelectedSubDlpds(null);
                            setSelectedRegus(null);
                            setSelectedDlpds(null);
                            setSelectedStatuses(null);
                            setSelectedDate('');
                            setSelectedDateType('pelaksanaan');
                          }}
                            className="mt-4 px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer transition-all">
                            Reset Semua Filter
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTargets.map((target) => {
                    const isSelected = selectedIds.has(String(target.IDPel));
                    return (
                      <tr 
                        key={target.No || target.IDPel}
                        onClick={() => onSelectRecord(target)}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-500/5 dark:bg-blue-500/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(target.IDPel)} onClick={e => e.stopPropagation()}
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-650 focus:ring-blue-500 cursor-pointer w-4 h-4" />
                        </td>
                        <td className="py-3 px-4 font-semibold font-mono tracking-tight text-slate-800 dark:text-slate-200">
                          {target.IDPel}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-[150px] truncate font-sans">
                          {target.NamaPelanggan}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-550 dark:text-slate-400">
                          {target.Tarif} / {target.Daya} VA
                        </td>
                        <td className="py-3 px-4 max-w-[160px]">
                          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={target.DLPD || ''}>
                            {target.DLPD || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={target.SubDLPD || ''}>
                            {target.SubDLPD || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(target.StatusProgress)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {target.DurasiMenit || 0}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-4 px-1 mt-1.5">
          <button 
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="btn-secondary py-2 px-3 flex gap-1 items-center text-xs cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>
          
          <span className="text-xs text-slate-400 select-none">
            Hal {currentPage} dari {totalPages}
          </span>

          <button 
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="btn-secondary py-2 px-3 flex gap-1 items-center text-xs cursor-pointer disabled:opacity-45 disabled:pointer-events-none"
          >
            Berikutnya
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- Unified Tambah Target P2TL Modal --- */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => {
            if (uploadStatus === 'parsing') return;
            setIsAddModalOpen(false);
            setUploadStatus('idle');
            setParsedData([]);
            setUploadReport(null);
            resetManualForm();
          }} />
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Tambah Target Baru
              </h3>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setUploadStatus('idle');
                  setParsedData([]);
                  setUploadReport(null);
                  resetManualForm();
                }} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 focus:outline-none"
                disabled={uploadStatus === 'parsing'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 animate-fade-in">
              
              {/* Mode Selector Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-950/40 border border-slate-200/40 dark:border-slate-850 p-1 rounded-2xl w-full shrink-0">
                <button
                  type="button"
                  onClick={() => setAddMode('manual')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer focus:outline-none ${
                    addMode === 'manual'
                      ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-755 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                  disabled={uploadStatus === 'parsing'}
                >
                  Input Manual
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('excel')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer focus:outline-none ${
                    addMode === 'excel'
                      ? 'bg-white dark:bg-slate-800 text-slate-850 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-755 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                  disabled={uploadStatus === 'parsing'}
                >
                  Unggah Excel
                </button>
              </div>

              {/* MODE 1: MANUAL FORM */}
              {addMode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    {/* IDPel */}
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">ID Pelanggan (IDPel)</label>
                      <input type="text" name="IDPel" value={manualForm.IDPel} onChange={handleManualChange} placeholder="Contoh: 523511200668" className={`input-text text-sm ${manualErrors.IDPel ? 'border-rose-450 focus:ring-rose-500/20' : ''}`} />
                      {manualErrors.IDPel && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{manualErrors.IDPel}</p>}
                    </div>

                    {/* Nama Pelanggan */}
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Nama Pelanggan</label>
                      <input type="text" name="NamaPelanggan" value={manualForm.NamaPelanggan} onChange={handleManualChange} placeholder="Contoh: ANDI WIJAYA" className={`input-text text-sm ${manualErrors.NamaPelanggan ? 'border-rose-450 focus:ring-rose-500/20' : ''}`} />
                      {manualErrors.NamaPelanggan && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{manualErrors.NamaPelanggan}</p>}
                    </div>

                    {/* Tarif */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Tarif</label>
                      <input type="text" name="Tarif" value={manualForm.Tarif} onChange={handleManualChange} placeholder="R1 / S1 / P3" className="input-text text-sm" />
                    </div>

                    {/* Daya */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Daya (VA)</label>
                      <input type="number" name="Daya" value={manualForm.Daya} onChange={handleManualChange} placeholder="450 / 900 / 1300" className="input-text text-sm" />
                    </div>

                    {/* Gardu */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Gardu</label>
                      <input type="text" name="Gardu" value={manualForm.Gardu} onChange={handleManualChange} placeholder="LAAAADE15200" className="input-text text-sm" />
                    </div>

                    {/* Tiang */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Tiang</label>
                      <input type="text" name="Tiang" value={manualForm.Tiang} onChange={handleManualChange} placeholder="SA2-204" className="input-text text-sm" />
                    </div>

                    {/* Sub DLPD */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Sub DLPD</label>
                      <input type="text" name="SubDLPD" value={manualForm.SubDLPD} onChange={handleManualChange} placeholder="Contoh: STAND ACMT TIDAK SESUAI / KWH MACET" className="input-text text-sm" />
                    </div>

                    {/* Regu Petugas */}
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Regu Petugas</label>
                      <input type="text" name="ReguPetugas" value={manualForm.ReguPetugas} onChange={handleManualChange} placeholder="52351.A" className="input-text text-sm" />
                    </div>

                    {/* DLPD */}
                    <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">DLPD</label>
                      <input type="text" name="DLPD" value={manualForm.DLPD} onChange={handleManualChange} placeholder="DLPD CATER / JAM NYALA < 40" className="input-text text-sm" />
                    </div>

                    {/* Status Progress */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Status Progress</label>
                      <select name="StatusProgress" value={manualForm.StatusProgress} onChange={handleManualChange} className="input-text text-sm select-arrow bg-white dark:bg-slate-800">
                        <option value="Target Operasi - Periksa - Sesuai">Target Operasi - Periksa - Sesuai</option>
                        <option value="Target Operasi - Temuan - K2">Target Operasi - Temuan - K2</option>
                        <option value="Target Operasi - Temuan - P1">Target Operasi - Temuan - P1</option>
                        <option value="Target Operasi - Temuan - P4">Target Operasi - Temuan - P4</option>
                        <option value="Target Operasi">Target Operasi (Pending)</option>
                      </select>
                    </div>

                    {/* Durasi */}
                    <div className="flex flex-col gap-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Durasi (Menit)</label>
                      <input type="number" name="DurasiMenit" value={manualForm.DurasiMenit} onChange={handleManualChange} placeholder="Menit" className="input-text text-sm" />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 pb-2">
                    <button type="button" onClick={() => { setIsAddModalOpen(false); resetManualForm(); }} className="btn-secondary py-2 px-4 text-xs font-sans">Batal</button>
                    <button type="submit" className="btn-primary py-2 px-5 text-xs font-sans">Simpan Target</button>
                  </div>
                </form>
              )}

              {/* MODE 2: EXCEL UPLOAD */}
              {addMode === 'excel' && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/80 p-4 rounded-2xl">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Template Format</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350 font-sans">Gunakan template resmi Data Target</span>
                    </div>
                    <button onClick={downloadTemplate} className="btn-secondary py-1.5 px-3 text-xs flex gap-2 items-center hover:bg-slate-100 transition-all font-sans font-semibold">
                      <Download className="w-3.5 h-3.5" />
                      Unduh Template
                    </button>
                  </div>

                  {uploadStatus === 'idle' && (
                    <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current.click()} className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[160px] ${
                      dragActive ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10' : 'border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700'
                    }`}>
                      <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                      <div className="p-3 bg-brand-50 dark:bg-brand-950/30 text-brand-600 rounded-xl mb-3">
                        <Upload className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-205 font-sans">Seret file Excel ke sini atau klik untuk memilih</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Mendukung file spreadsheet Data Target (.xlsx, .xls) sesuai template.</p>
                    </div>
                  )}

                  {uploadStatus === 'parsing' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[160px]">
                      <RefreshCw className="w-9 h-9 text-brand-500 animate-spin mb-3" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-205 font-sans">Menganalisa berkas spreadsheet...</p>
                    </div>
                  )}

                  {uploadStatus === 'success' && uploadReport && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm">
                      <div className="flex items-start gap-4 text-left">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 rounded-xl shrink-0">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Berkas Target Berhasil Dibaca</h4>
                          <p className="text-xs text-slate-550 mt-0.5 font-mono truncate max-w-[240px]">{fileName}</p>
                          <div className="mt-3 py-1.5 px-3 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-355 text-xs font-bold rounded-xl inline-block">
                            {uploadReport.successCount} data target P2TL terdeteksi.
                          </div>
                        </div>
                      </div>

                      {uploadReport.errors.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-3 text-left">
                          <div className="flex items-center gap-1.5 text-amber-600 mb-2">
                            <AlertTriangle className="w-4.5 h-4.5" />
                            <span className="text-xs font-bold font-sans">Warning Logs ({uploadReport.errors.length})</span>
                          </div>
                          <div className="max-h-24 overflow-y-auto bg-amber-50/20 dark:bg-amber-950/10 rounded-xl p-3 flex flex-col gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                            {uploadReport.errors.map((err, i) => <p key={i}>• {err}</p>)}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                        <button onClick={handleConfirmMerge} className="btn-primary flex justify-center text-xs sm:text-sm font-sans font-bold py-2">Gabungkan Data</button>
                        <button onClick={handleConfirmOverwrite} className="btn-secondary flex justify-center text-xs sm:text-sm border-rose-200 hover:border-rose-300 dark:border-rose-900/40 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 py-2">Ganti Semua</button>
                      </div>
                      <button onClick={() => setUploadStatus('idle')} className="w-full text-center text-xs text-slate-450 hover:text-slate-600 mt-4 underline block">Batal & Pilih Ulang</button>
                    </div>
                  )}

                  {uploadStatus === 'error' && uploadReport && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-5 text-center">
                      <div className="mx-auto w-12 h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl mb-3">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-205 font-sans">Gagal Memproses Berkas</h4>
                      <div className="my-3 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 rounded-xl max-h-24 overflow-y-auto text-left text-[11px] text-rose-700 dark:text-rose-455 font-mono">
                        {uploadReport.errors.map((err, i) => <p key={i}>[Error] {err}</p>)}
                      </div>
                      <button onClick={() => setUploadStatus('idle')} className="btn-primary py-1.5 px-3 text-xs font-sans mt-2">Pilih File Lain</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Sticky Mobile Multi-Select Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between animate-fade-in-up">
          <div className="flex flex-col">
            <span className="text-xs font-semibold">{selectedIds.size} terpilih</span>
            <span className="text-[10px] text-slate-400">Aksi massal aktif</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportSelected}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Ekspor
            </button>
            <button onClick={() => setSelectedIds(new Set())}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Batal seleksi">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
