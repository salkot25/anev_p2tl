import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileText, 
  Zap, 
  MapPin, 
  Activity, 
  Search, 
  SlidersHorizontal, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Map, 
  X, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';
import { parseBankToExcel } from '../utils/excelParser';
import * as XLSX from 'xlsx';

export default function BankToPanel({ targets, realizedTargets = [], onDataLoaded, onAddRecord }) {
  // Navigation & Sub-views states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedJenis, setSelectedJenis] = useState('ALL');
  const [selectedSub, setSelectedSub] = useState('ALL');
  const [selectedGardu, setSelectedGardu] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState('manual'); // 'manual' or 'excel'
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const itemsPerPage = 10;

  // Uploader State
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, parsing, success, error
  const [uploadReport, setUploadReport] = useState(null); 
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setUploadStatus('idle');
    setParsedData([]);
    setUploadReport(null);
    setAddMode('manual');
  };

  // Helper to resolve inspection history from main targets (realizedTargets)
  const getInspectionHistory = (idpel) => {
    if (!realizedTargets || !idpel) return null;
    return realizedTargets.find(r => String(r.IDPel).trim() === String(idpel).trim());
  };

  const drawerHistory = useMemo(() => {
    return selectedRecord ? getInspectionHistory(selectedRecord.IDPEL) : null;
  }, [selectedRecord, realizedTargets]);

  // Haversine distance helper (KM)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Distance clustering analysis
  const distanceAnalysis = useMemo(() => {
    const selectedTargets = targets.filter(t => selectedIds.has(String(t.IDPEL)));
    const validCoords = selectedTargets.filter(t => t.LATITUDE && t.LONGITUDE);
    
    if (validCoords.length <= 1) {
      return {
        maxDistance: 0,
        status: 'Pilih Data Koordinat',
        badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        desc: 'Pilih minimal 2 target dengan data koordinat untuk melihat analisis sebaran rute.'
      };
    }
    
    let maxD = 0;
    for (let i = 0; i < validCoords.length; i++) {
      for (let j = i + 1; j < validCoords.length; j++) {
        const d = getDistance(
          validCoords[i].LATITUDE, validCoords[i].LONGITUDE,
          validCoords[j].LATITUDE, validCoords[j].LONGITUDE
        );
        if (d > maxD) maxD = d;
      }
    }
    
    let status = '';
    let badgeClass = '';
    let desc = '';
    
    if (maxD < 1) {
      status = 'Sangat Berdekatan';
      badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20';
      desc = 'Sangat efisien untuk 1 regu pelaksana karena berada dalam 1 klaster mikro.';
    } else if (maxD < 3) {
      status = 'Berdekatan / Satu Klaster';
      badgeClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/20';
      desc = 'Efisien untuk rute harian regu karena sebaran lokasi relatif dekat.';
    } else if (maxD < 7) {
      status = 'Menyebar / Agak Jauh';
      badgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/20';
      desc = 'Sebaran sedang. Direkomendasikan membagi regu atau mengatur rute prioritas.';
    } else {
      status = 'Berjauhan / Menyebar Luas';
      badgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-455 border-rose-100 dark:border-rose-900/20';
      desc = 'Lokasi sangat menyebar. Disarankan ditugaskan ke beberapa regu berbeda.';
    }
    
    return {
      maxDistance: maxD.toFixed(2),
      status,
      badgeClass,
      desc
    };
  }, [targets, selectedIds]);

  const initMap = () => {
    if (!window.L || mapRef.current || !document.getElementById('selected-map-container')) return;
    
    const selectedTargets = targets.filter(t => selectedIds.has(String(t.IDPEL)));
    const validCoords = selectedTargets.filter(t => t.LATITUDE && t.LONGITUDE);
    
    if (validCoords.length === 0) return;
    
    // Create map instance
    const map = window.L.map('selected-map-container');
    mapRef.current = map;
    
    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'Â© OpenStreetMap contributors'
    }).addTo(map);
    
    const markerGroup = window.L.featureGroup();
    
    validCoords.forEach(t => {
      const marker = window.L.marker([t.LATITUDE, t.LONGITUDE])
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 140px;">
            <strong style="color: #1e293b; display: block; margin-bottom: 3px;">${t.NAMA}</strong>
            <span style="color: #64748b; font-family: monospace; font-size: 11px;">IDPEL: ${t.IDPEL}</span><br/>
            <span style="color: #64748b; font-size: 11px;">Gardu: ${t.GARDU || '-'} / ${t.TIANG || '-'}</span><br/>
            <span style="color: #2563eb; font-weight: bold; font-size: 11px; display: block; margin-top: 3px;">${t.TARIF} / ${t.DAYA} VA</span>
          </div>
        `);
      marker.addTo(markerGroup);
    });
    
    markerGroup.addTo(map);
    
    // Fit map bounds to show all markers
    map.fitBounds(markerGroup.getBounds(), { padding: [40, 40] });
  };

  // Load Leaflet dynamically
  useEffect(() => {
    if (!isMapOpen) return;
    
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    
    if (!window.L) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      setTimeout(initMap, 100);
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isMapOpen]);

  // --- 1. Filtering and Paging logic ---
  const filterOptions = useMemo(() => {
    const units = new Set();
    const jenises = new Set();
    const subs = new Set();
    const gardus = new Set();
    targets.forEach(t => {
      if (t.UNIT) units.add(t.UNIT);
      if (t.JENIS_TO) jenises.add(t.JENIS_TO);
      if (t.SUBDLPD) subs.add(t.SUBDLPD);
      if (t.GARDU) {
        const prefix = String(t.GARDU).trim().substring(0, 7);
        if (prefix) gardus.add(prefix);
      }
    });
    return {
      units: Array.from(units).sort(),
      jenises: Array.from(jenises).sort(),
      subs: Array.from(subs).sort(),
      gardus: Array.from(gardus).sort()
    };
  }, [targets]);

  const filteredTargets = useMemo(() => {
    setCurrentPage(1);
    return targets.filter(t => {
      const matchesSearch = 
        String(t.IDPEL).includes(searchQuery) ||
        String(t.NAMA).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUnit = selectedUnit === 'ALL' || String(t.UNIT) === selectedUnit;
      const matchesJenis = selectedJenis === 'ALL' || t.JENIS_TO === selectedJenis;
      const matchesSub = selectedSub === 'ALL' || t.SUBDLPD === selectedSub;
      
      const prefix = t.GARDU ? String(t.GARDU).trim().substring(0, 7) : '';
      const matchesGardu = selectedGardu === 'ALL' || prefix === selectedGardu;
      
      return matchesSearch && matchesUnit && matchesJenis && matchesSub && matchesGardu;
    });
  }, [targets, searchQuery, selectedUnit, selectedJenis, selectedSub, selectedGardu]);

  const totalItems = filteredTargets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  const paginatedTargets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTargets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTargets, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // --- 2. Selection states and actions ---
  const paginatedIds = useMemo(() => paginatedTargets.map(t => String(t.IDPEL)), [paginatedTargets]);
  
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
    const selectedTargets = targets.filter(t => selectedIds.has(String(t.IDPEL)));
    if (selectedTargets.length === 0) return;

    // Map selected targets to exact columns in 20260608 TO EPM.xlsx format:
    // IDPEL, NAMA, TARIF, DAYA, GARDU, TIANG, UNIT, JAM NYALA, JENIS TO, LATITUDE, LONGITUDE, SUBDLPD
    const dataToExport = selectedTargets.map(t => ({
      'IDPEL': parseInt(t.IDPEL, 10) || t.IDPEL,
      'NAMA': t.NAMA || '',
      'TARIF': t.TARIF || '',
      'DAYA': t.DAYA || 0,
      'GARDU': t.GARDU || '',
      'TIANG': t.TIANG || '',
      'UNIT': t.UNIT || 52351,
      'JAM NYALA': t.JAM_NYALA || '',
      'JENIS TO': t.JENIS_TO || '',
      'LATITUDE': t.LATITUDE || 0,
      'LONGITUDE': t.LONGITUDE || 0,
      'SUBDLPD': t.SUBDLPD || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, 
      { wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BANK TO");
    
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `${dateStr}_TO_EPM_Export.xlsx`);
    
    // Clear selections on success
    setSelectedIds(new Set());
  };

  const openMap = (lat, lng, e) => {
    e.stopPropagation();
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  // --- 4. Excel Upload handlers ---
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setUploadStatus('error');
      setUploadReport({ errors: ['Format file harus Excel (.xlsx atau .xls).'] });
      return;
    }
    setFileName(file.name);
    setUploadStatus('parsing');
    try {
      const res = await parseBankToExcel(file);
      setParsedData(res.data);
      setUploadReport({ successCount: res.data.length, errors: res.errors });
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['IDPEL', 'NAMA', 'ALAMAT', 'TARIF', 'DAYA', 'GARDU', 'TIANG', 'UNIT', 'JAM NYALA', 'JENIS TO', 'LATITUDE', 'LONGITUDE', 'SUBDLPD'],
      [523510136588, 'S KAMSO', 'Jl. Sukowati No. 5', 'R1M', 900, 'LAAAADE01400', 'SA2-208/', 52351, '', 'SOREK 1 PHASA', -7.422084, 110.526313, 'STAND ACMT TIDAK SESUAI DENGAN AP2T']
    ]);
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, 
      { wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BANK TO");
    XLSX.writeFile(wb, "Template_Bank_TO.xlsx");
  };

  // --- 5. Manual entry modal handler ---
  const [manualForm, setManualForm] = useState({
    IDPEL: '',
    NAMA: '',
    ALAMAT: '',
    TARIF: 'R1',
    DAYA: 900,
    GARDU: '000',
    TIANG: '000',
    UNIT: 52351,
    JAM_NYALA: '',
    JENIS_TO: 'DLPD CATER',
    LATITUDE: '',
    LONGITUDE: '',
    SUBDLPD: 'KWH MACET'
  });
  const [manualErrors, setManualErrors] = useState({});

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!manualForm.IDPEL || !/^\d+$/.test(manualForm.IDPEL)) errs.IDPEL = 'IDPEL harus berupa angka.';
    if (!manualForm.NAMA.trim()) errs.NAMA = 'NAMA wajib diisi.';
    if (manualForm.LATITUDE && isNaN(parseFloat(manualForm.LATITUDE))) errs.LATITUDE = 'LATITUDE harus angka.';
    if (manualForm.LONGITUDE && isNaN(parseFloat(manualForm.LONGITUDE))) errs.LONGITUDE = 'LONGITUDE harus angka.';

    if (Object.keys(errs).length > 0) {
      setManualErrors(errs);
      return;
    }

    onAddRecord({
      ...manualForm,
      LATITUDE: parseFloat(manualForm.LATITUDE) || 0,
      LONGITUDE: parseFloat(manualForm.LONGITUDE) || 0
    });
    setIsAddModalOpen(false);
    setManualForm({
      IDPEL: '', NAMA: '', ALAMAT: '', TARIF: 'R1', DAYA: 900, GARDU: '000', TIANG: '000', 
      UNIT: 52351, JAM_NYALA: '', JENIS_TO: 'DLPD CATER', LATITUDE: '', LONGITUDE: '', SUBDLPD: 'KWH MACET'
    });
    setManualErrors({});
  };

  // â”€â”€ Summary stats â”€â”€
  const totalCount   = targets.length;
  const withCoords   = targets.filter(t => t.LATITUDE && t.LONGITUDE).length;
  const inspected    = targets.filter(t => getInspectionHistory(t.IDPEL)).length;
  const highPower    = targets.filter(t => parseInt(t.DAYA, 10) >= 6600).length;
  const activeFilters = [selectedUnit !== 'ALL', selectedJenis !== 'ALL', selectedSub !== 'ALL', selectedGardu !== 'ALL'].filter(Boolean).length;

  return (
    <>
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
           MAIN PANEL
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="flex flex-col gap-5">

        {/* â”€â”€ 01. Summary Stats Bar â”€â”€ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Bank TO',    value: totalCount,  sub: 'pelanggan',          color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-950/40',    border: 'border-blue-100 dark:border-blue-900/40'   },
            { label: 'Punya Koordinat',  value: withCoords,  sub: 'titik dipetakan',    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-100 dark:border-emerald-900/40' },
            { label: 'Pernah Diperiksa', value: inspected,   sub: 'ada riwayat',        color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-100 dark:border-violet-900/40'  },
            { label: 'Daya â‰¥ 6,6 kVA',  value: highPower,   sub: '3 phasa atau lebih', color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/40',  border: 'border-amber-100 dark:border-amber-900/40'   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl px-4 py-3.5 flex flex-col gap-1`}>
              <div className={`text-2xl font-black font-mono leading-none ${s.color}`}>{s.value.toLocaleString('id-ID')}</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</div>
              <div className="text-[10px] text-slate-400">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* â”€â”€ 02. Toolbar â”€â”€ */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl px-4 py-3 shadow-sm flex flex-col gap-3">

          {/* Row 1: Search + Actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari IDPEL atau nama pelangganâ€¦"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-slate-400 text-slate-700 dark:text-slate-300"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Filter toggle */}
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${
                  showFilters || activeFilters > 0
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {activeFilters > 0 && (
                  <span className="bg-blue-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">{activeFilters}</span>
                )}
              </button>

              {/* Selection actions */}
              {selectedIds.size > 0 && (
                <>
                  <button onClick={() => setIsMapOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 transition-all cursor-pointer">
                    <Map className="w-3.5 h-3.5" />
                    Peta ({selectedIds.size})
                  </button>
                  <button onClick={handleExportSelected}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border-2 border-emerald-400/60 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                    Ekspor ({selectedIds.size})
                  </button>
                </>
              )}

              {/* Add button */}
              <button onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 border-blue-500/60 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
                Tambah TO
              </button>
            </div>
          </div>

          {/* Row 2: Filters (collapsible) */}
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              {[
                { label: 'Unit Pelayanan', value: selectedUnit,  set: setSelectedUnit,  options: filterOptions.units,  allLabel: 'Semua Unit'    },
                { label: 'Jenis TO',       value: selectedJenis, set: setSelectedJenis, options: filterOptions.jenises, allLabel: 'Semua Jenis'   },
                { label: 'Sub-DLPD',       value: selectedSub,   set: setSelectedSub,   options: filterOptions.subs,   allLabel: 'Semua Sub-DLPD' },
                { label: 'Gardu (7 kar.)', value: selectedGardu, set: setSelectedGardu, options: filterOptions.gardus,  allLabel: 'Semua Gardu'   },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{f.label}</label>
                  <select value={f.value} onChange={e => f.set(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 text-slate-700 dark:text-slate-300 transition-all cursor-pointer">
                    <option value="ALL">{f.allLabel}</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* â”€â”€ 03. Result Info bar â”€â”€ */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-bold">{totalItems.toLocaleString('id-ID')}</strong>
            {' '}dari{' '}
            <strong className="text-slate-700 dark:text-slate-300 font-bold">{totalCount.toLocaleString('id-ID')}</strong>
            {' '}data
            {activeFilters > 0 && <span className="ml-1.5 text-blue-500 font-semibold">({activeFilters} filter aktif)</span>}
          </span>
          {selectedIds.size > 0 && (
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {selectedIds.size} dipilih
              <button onClick={() => setSelectedIds(new Set())} className="ml-2 text-slate-400 hover:text-slate-600 underline cursor-pointer">Batal pilih</button>
            </span>
          )}
        </div>

        {/* â”€â”€ 04. Main Data Table / Card Grid â”€â”€ */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl shadow-sm overflow-hidden">

          {/* Empty state */}
          {totalItems === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Data Tidak Ditemukan</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs">Coba ubah kata kunci pencarian atau hapus filter yang aktif.</p>
              {activeFilters > 0 && (
                <button onClick={() => { setSelectedUnit('ALL'); setSelectedJenis('ALL'); setSelectedSub('ALL'); setSelectedGardu('ALL'); }}
                  className="mt-4 px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer transition-all">
                  Reset Filter
                </button>
              )}
            </div>
          )}

          {/* Mobile Card Grid */}
          {totalItems > 0 && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40 md:hidden">
              {paginatedTargets.map(item => {
                const history = getInspectionHistory(item.IDPEL);
                const isSelected = selectedIds.has(String(item.IDPEL));
                return (
                  <div key={item.No || item.IDPEL}
                    onClick={() => handleSelectRecord(item)}
                    className={`px-4 py-4 flex gap-3 items-start cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60 dark:bg-blue-950/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/20'}`}>
                    <input type="checkbox" checked={isSelected}
                      onChange={() => toggleSelect(item.IDPEL)} onClick={e => e.stopPropagation()}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold font-mono text-slate-400">{item.IDPEL}</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">{item.NAMA}</div>
                          {item.ALAMAT && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{item.ALAMAT}</div>}
                          {history && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20 w-fit">
                              <CheckCircle className="w-2.5 h-2.5 shrink-0" /> Pernah Diperiksa
                            </span>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase shrink-0">{item.JENIS_TO}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-slate-500 border-t border-slate-50 dark:border-slate-800/40 pt-2">
                        <span>{item.TARIF} / {item.DAYA} VA Â· Unit: {item.UNIT}</span>
                        <div className="flex gap-1.5">
                          <button onClick={e => openMap(item.LATITUDE, item.LONGITUDE, e)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-emerald-600 transition-colors">
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desktop Table */}
          {totalItems > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-4 w-10">
                      <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4" />
                    </th>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">IDPEL</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Alamat</th>
                    <th className="py-3 px-4">Tarif / Daya</th>
                    <th className="py-3 px-4">Gardu / Tiang</th>
                    <th className="py-3 px-4">Jenis TO</th>
                    <th className="py-3 px-4">Sub-DLPD</th>
                    <th className="py-3 px-4 text-center w-10">Peta</th>
                    <th className="py-3 px-4 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs text-slate-700 dark:text-slate-300">
                  {paginatedTargets.map((item, idx) => {
                    const history = getInspectionHistory(item.IDPEL);
                    const isSelected = selectedIds.has(String(item.IDPEL));
                    const isHighPower = parseInt(item.DAYA, 10) >= 6600;
                    return (
                      <tr key={item.No || item.IDPEL}
                        className={`transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}>
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.IDPEL)} onClick={e => e.stopPropagation()}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4" />
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300 dark:text-slate-600 text-[11px]">
                          {idx + 1 + (currentPage - 1) * itemsPerPage}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold font-mono text-slate-700 dark:text-slate-200 text-[11px]">{item.IDPEL}</span>
                        </td>
                        <td className="py-3 px-4 max-w-[180px]">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-900 dark:text-white truncate">{item.NAMA}</span>
                            {history && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20 w-fit">
                                <CheckCircle className="w-2.5 h-2.5 shrink-0" /> Diperiksa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[180px] truncate text-slate-400 dark:text-slate-500" title={item.ALAMAT || '-'}>
                          {item.ALAMAT || <span className="text-slate-300 dark:text-slate-700">â€”</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{item.TARIF}</span>
                            <span className={`text-[10px] font-bold font-mono ${isHighPower ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{item.DAYA?.toLocaleString('id-ID')} VA</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[120px]">
                          <div className="text-[11px] font-mono text-slate-500 truncate">{item.GARDU || 'â€”'}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.TIANG || 'â€”'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase whitespace-nowrap">
                            {item.JENIS_TO || 'â€”'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[140px] truncate text-slate-400 dark:text-slate-500 text-[11px]" title={item.SUBDLPD || ''}>
                          {item.SUBDLPD || <span className="text-slate-300 dark:text-slate-700">â€”</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={e => openMap(item.LATITUDE, item.LONGITUDE, e)}
                            className={`p-1.5 rounded-lg transition-colors ${item.LATITUDE && item.LONGITUDE ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'text-slate-200 dark:text-slate-700 cursor-not-allowed'}`}
                            title={item.LATITUDE && item.LONGITUDE ? 'Buka Google Maps' : 'Koordinat tidak tersedia'}
                            disabled={!item.LATITUDE || !item.LONGITUDE}>
                            <MapPin className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => handleSelectRecord(item)}
                            className="inline-flex items-center gap-1 py-1.5 px-2.5 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-900/40 rounded-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold text-[11px] transition-all cursor-pointer">
                            <Eye className="w-3 h-3" /> Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/20">
              <button onClick={handlePrevPage} disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{currentPage}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs text-slate-400">{totalPages}</span>
              </div>
              <button onClick={handleNextPage} disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer">
                Berikutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
           DETAIL DRAWER
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {isDrawerOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => { setIsDrawerOpen(false); setSelectedRecord(null); }} />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[2.5rem] md:rounded-t-none md:rounded-l-3xl shadow-2xl md:w-[440px] max-h-[90vh] md:max-h-full flex flex-col z-10 overflow-hidden border-t md:border-t-0 md:border-l border-slate-200/60 dark:border-slate-800">

            {/* Drag handle (mobile) */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 md:hidden" />

            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Detail Target Bank TO</div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">{selectedRecord.NAMA}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase">{selectedRecord.JENIS_TO}</span>
                  {drawerHistory && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">
                      <CheckCircle className="w-3 h-3" /> Pernah Diperiksa
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => { setIsDrawerOpen(false); setSelectedRecord(null); }}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors shrink-0 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* Info Grid */}
              <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl overflow-hidden">
                {[
                  { label: 'ID Pelanggan',       value: selectedRecord.IDPEL,  mono: true   },
                  { label: 'Alamat',              value: selectedRecord.ALAMAT || 'â€”'         },
                  { label: 'Tarif / Daya',        value: `${selectedRecord.TARIF || 'â€”'} / ${selectedRecord.DAYA || 0} VA` },
                  { label: 'Gardu / Tiang',       value: `${selectedRecord.GARDU || 'â€”'} / ${selectedRecord.TIANG || 'â€”'}` },
                  { label: 'Unit Pelayanan',      value: selectedRecord.UNIT   },
                  { label: 'Sub-DLPD',            value: selectedRecord.SUBDLPD || 'â€”'       },
                  { label: 'Jam Nyala',           value: selectedRecord.JAM_NYALA || 'â€”'     },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between items-center px-4 py-2.5 gap-4 ${i < 6 ? 'border-b border-slate-100 dark:border-slate-800/40' : ''}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">{row.label}</span>
                    <span className={`text-xs font-bold text-slate-800 dark:text-slate-200 text-right ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Inspection History */}
              {drawerHistory && (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Riwayat Pemeriksaan</span>
                  </div>
                  {[
                    { label: 'Tgl. Pelaksanaan', value: drawerHistory.TanggalPelaksanaan || 'â€”' },
                    { label: 'Regu Petugas',     value: drawerHistory.ReguPetugas || 'â€”'         },
                    { label: 'Status Progress',  value: drawerHistory.StatusProgress || 'â€”'      },
                    { label: 'Durasi',           value: drawerHistory.DurasiMenit ? `${drawerHistory.DurasiMenit} menit` : 'â€”' },
                  ].map((row, i, arr) => (
                    <div key={i} className={`flex justify-between items-center px-4 py-2.5 gap-4 ${i < arr.length - 1 ? 'border-b border-emerald-100/60 dark:border-emerald-900/20' : ''}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">{row.label}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Map Action */}
              <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Koordinat Geografis</div>
                  <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {selectedRecord.LATITUDE && selectedRecord.LONGITUDE
                      ? `${selectedRecord.LATITUDE}, ${selectedRecord.LONGITUDE}`
                      : <span className="text-slate-400">Tidak tersedia</span>}
                  </div>
                </div>
                <button onClick={e => openMap(selectedRecord.LATITUDE, selectedRecord.LONGITUDE, e)}
                  disabled={!selectedRecord.LATITUDE || !selectedRecord.LONGITUDE}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 border-emerald-400/60 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/15 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0">
                  <Map className="w-3.5 h-3.5" /> Buka Maps
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
           ADD / IMPORT MODAL
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={handleCloseAddModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden border border-slate-200/60 dark:border-slate-800">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Target Bank TO</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Input manual atau impor dari berkas Excel</p>
              </div>
              <button onClick={handleCloseAddModal} disabled={uploadStatus === 'parsing'}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors cursor-pointer disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="px-6 pt-4 shrink-0">
              <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                {[{ id: 'manual', label: 'Input Manual' }, { id: 'excel', label: 'Unggah Excel' }].map(m => (
                  <button key={m.id} type="button" onClick={() => setAddMode(m.id)} disabled={uploadStatus === 'parsing'}
                    className={`flex-1 py-2 text-xs font-bold rounded-[10px] transition-all cursor-pointer ${
                      addMode === m.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">

              {/* â”€â”€ Manual Form â”€â”€ */}
              {addMode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* IDPEL */}
                    <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Pelanggan (IDPEL)</label>
                      <input type="text" value={manualForm.IDPEL} onChange={e => setManualForm({...manualForm, IDPEL: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300 font-mono"
                        placeholder="523510136588" required />
                      {manualErrors.IDPEL && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.IDPEL}</p>}
                    </div>
                    {/* Nama */}
                    <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Pelanggan</label>
                      <input type="text" value={manualForm.NAMA} onChange={e => setManualForm({...manualForm, NAMA: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300"
                        placeholder="S KAMSO" required />
                      {manualErrors.NAMA && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.NAMA}</p>}
                    </div>
                    {/* Alamat */}
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alamat</label>
                      <input type="text" value={manualForm.ALAMAT} onChange={e => setManualForm({...manualForm, ALAMAT: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300"
                        placeholder="Jl. Diponegoro No. 12" />
                    </div>
                    {/* Tarif */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarif</label>
                      <input type="text" value={manualForm.TARIF} onChange={e => setManualForm({...manualForm, TARIF: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300"
                        placeholder="R1 / R1M" />
                    </div>
                    {/* Daya */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daya (VA)</label>
                      <input type="number" value={manualForm.DAYA} onChange={e => setManualForm({...manualForm, DAYA: parseInt(e.target.value, 10) || 0})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300 font-mono" />
                    </div>
                    {/* Gardu & Tiang */}
                    <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gardu / Tiang</label>
                      <div className="flex gap-2">
                        <input type="text" value={manualForm.GARDU} onChange={e => setManualForm({...manualForm, GARDU: e.target.value})}
                          className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300" placeholder="Gardu" />
                        <input type="text" value={manualForm.TIANG} onChange={e => setManualForm({...manualForm, TIANG: e.target.value})}
                          className="flex-1 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300" placeholder="Tiang" />
                      </div>
                    </div>
                    {/* Unit */}
                    <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit (UNIT)</label>
                      <input type="number" value={manualForm.UNIT} onChange={e => setManualForm({...manualForm, UNIT: parseInt(e.target.value, 10) || 52351})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300 font-mono" />
                    </div>
                    {/* Jenis TO */}
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jenis TO</label>
                      <input type="text" value={manualForm.JENIS_TO} onChange={e => setManualForm({...manualForm, JENIS_TO: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300"
                        placeholder="SOREK 1 PHASA / DLPD CATER" />
                    </div>
                    {/* Latitude */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitude</label>
                      <input type="text" value={manualForm.LATITUDE} onChange={e => setManualForm({...manualForm, LATITUDE: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300 font-mono"
                        placeholder="-7.422084" />
                      {manualErrors.LATITUDE && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.LATITUDE}</p>}
                    </div>
                    {/* Longitude */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitude</label>
                      <input type="text" value={manualForm.LONGITUDE} onChange={e => setManualForm({...manualForm, LONGITUDE: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300 font-mono"
                        placeholder="110.526313" />
                      {manualErrors.LONGITUDE && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.LONGITUDE}</p>}
                    </div>
                    {/* Sub-DLPD */}
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-DLPD</label>
                      <input type="text" value={manualForm.SUBDLPD} onChange={e => setManualForm({...manualForm, SUBDLPD: e.target.value})}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all text-slate-700 dark:text-slate-300"
                        placeholder="STAND ACMT TIDAK SESUAI / KWH MACET" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <button type="button" onClick={handleCloseAddModal}
                      className="px-4 py-2 text-xs font-bold border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all">
                      Batal
                    </button>
                    <button type="submit"
                      className="px-5 py-2 text-xs font-bold border-2 border-blue-500/60 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/15 cursor-pointer transition-all">
                      Simpan Target
                    </button>
                  </div>
                </form>
              )}

              {/* â”€â”€ Excel Uploader â”€â”€ */}
              {addMode === 'excel' && (
                <div className="flex flex-col gap-4">
                  {/* Template download row */}
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 rounded-xl px-4 py-3">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Format Template</div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Gunakan template resmi Bank TO</div>
                    </div>
                    <button type="button" onClick={downloadTemplate}
                      className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 cursor-pointer transition-all">
                      <Download className="w-3.5 h-3.5" /> Unduh Template
                    </button>
                  </div>

                  {/* Drop zone */}
                  {uploadStatus === 'idle' && (
                    <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                      onClick={() => fileInputRef.current.click()}
                      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        dragActive ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/20'
                      }`}>
                      <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-center mb-4 text-blue-500">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Seret file ke sini atau klik untuk memilih</p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">Format Bank TO (.xlsx, .xls) sesuai template</p>
                    </div>
                  )}

                  {/* Parsing */}
                  {uploadStatus === 'parsing' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Menganalisa berkas spreadsheetâ€¦</p>
                    </div>
                  )}

                  {/* Success */}
                  {uploadStatus === 'success' && uploadReport && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Berkas Berhasil Dibaca</div>
                          <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">{fileName}</div>
                          <div className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {uploadReport.successCount} data target Bank TO terdeteksi
                          </div>
                        </div>
                      </div>
                      {uploadReport.errors.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-bold">Warning Logs ({uploadReport.errors.length})</span>
                          </div>
                          <div className="max-h-24 overflow-y-auto text-[11px] font-mono text-amber-700 dark:text-amber-400 flex flex-col gap-1">
                            {uploadReport.errors.map((err, i) => <p key={i}>â€¢ {err}</p>)}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <button type="button" onClick={() => { onDataLoaded(parsedData, 'merge'); handleCloseAddModal(); }}
                          className="py-2.5 text-xs font-bold border-2 border-blue-500/60 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/15 cursor-pointer transition-all">
                          Gabungkan Data
                        </button>
                        <button type="button" onClick={() => { onDataLoaded(parsedData, 'overwrite'); handleCloseAddModal(); }}
                          className="py-2.5 text-xs font-bold border-2 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer transition-all">
                          Ganti Semua
                        </button>
                      </div>
                      <button type="button" onClick={() => setUploadStatus('idle')}
                        className="text-xs text-slate-400 hover:text-slate-600 underline text-center cursor-pointer">
                        Batal &amp; Pilih Ulang
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {uploadStatus === 'error' && uploadReport && (
                    <div className="flex flex-col items-center text-center gap-4 py-4">
                      <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Gagal Memproses Berkas</p>
                        <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl text-left text-[11px] font-mono text-rose-700 dark:text-rose-400 max-h-24 overflow-y-auto">
                          {uploadReport.errors.map((err, i) => <p key={i}>[Error] {err}</p>)}
                        </div>
                      </div>
                      <button type="button" onClick={() => setUploadStatus('idle')}
                        className="px-4 py-2 text-xs font-bold border-2 border-blue-500/60 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-all">
                        Pilih File Lain
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
           MAP MODAL
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {isMapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMapOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl shadow-2xl z-10 flex flex-col h-[88vh] overflow-hidden border border-slate-200/60 dark:border-slate-800 animate-fade-in">

            {/* Map Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-center">
                  <Map className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Peta Sebaran Lokasi Target</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {targets.filter(t => selectedIds.has(String(t.IDPEL)) && t.LATITUDE && t.LONGITUDE).length} titik koordinat dipetakan
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMapOpen(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Distance Analysis Bar */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analisis Jarak:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${distanceAnalysis.badgeClass}`}>
                {distanceAnalysis.status}
              </span>
              {parseFloat(distanceAnalysis.maxDistance) > 0 && (
                <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">
                  Rentang max: {distanceAnalysis.maxDistance} km
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">{distanceAnalysis.desc}</span>
            </div>

            {/* Map Body */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Sidebar list */}
              <div className="hidden md:flex flex-col w-72 border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto p-4 gap-3 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pelanggan Dipilih ({selectedIds.size})</span>
                <div className="flex flex-col gap-2">
                  {targets.filter(t => selectedIds.has(String(t.IDPEL))).map(t => {
                    const hasCoords = t.LATITUDE && t.LONGITUDE;
                    return (
                      <div key={t.IDPEL} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-xl flex flex-col gap-1">
                        <span className="text-[10px] font-bold font-mono text-slate-400">{t.IDPEL}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{t.NAMA}</span>
                        {t.ALAMAT && <span className="text-[10px] text-slate-500 truncate">{t.ALAMAT}</span>}
                        <span className="text-[10px] text-slate-400">{t.TARIF} / {t.DAYA} VA Â· {t.GARDU || 'â€”'}</span>
                        {!hasCoords && (
                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/20 w-fit mt-0.5">
                            Koordinat Tidak Ada
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Map canvas */}
              <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-0">
                <div id="selected-map-container" className="absolute inset-0 z-0 h-full w-full" />
                {targets.filter(t => selectedIds.has(String(t.IDPEL)) && t.LATITUDE && t.LONGITUDE).length === 0 && (
                  <div className="relative z-10 text-center p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl max-w-sm flex flex-col items-center">
                    <AlertCircle className="w-9 h-9 text-rose-500 mb-3" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Koordinat Tidak Tersedia</h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Semua data yang dipilih tidak memiliki data koordinat Latitude dan Longitude.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
