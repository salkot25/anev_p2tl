import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const markersRef = useRef({});

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
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    const markerGroup = window.L.featureGroup();
    markersRef.current = {};
    
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
      markersRef.current[String(t.IDPEL)] = marker;
    });
    
    markerGroup.addTo(map);
    
    // Fit map bounds to show all markers
    map.fitBounds(markerGroup.getBounds(), { padding: [40, 40] });
  };

  const focusCustomerOnMap = (t) => {
    if (!t.LATITUDE || !t.LONGITUDE || !mapRef.current) return;
    mapRef.current.setView([t.LATITUDE, t.LONGITUDE], 16, { animate: true });
    const marker = markersRef.current[String(t.IDPEL)];
    if (marker) {
      marker.openPopup();
    }
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
      markersRef.current = {};
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

  // --- Summary stats ---
  const totalCount   = targets.length;
  const withCoords   = targets.filter(t => t.LATITUDE && t.LONGITUDE).length;
  const inspected    = targets.filter(t => getInspectionHistory(t.IDPEL)).length;
  const highPower    = targets.filter(t => parseInt(t.DAYA, 10) >= 6600).length;
  const activeFilters = [selectedUnit !== 'ALL', selectedJenis !== 'ALL', selectedSub !== 'ALL', selectedGardu !== 'ALL'].filter(Boolean).length;

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* 01. Summary Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: 'Total Bank TO', 
              value: totalCount, 
              sub: 'Pelanggan terdaftar', 
              color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/10 dark:border-blue-500/10',
              icon: FileText
            },
            { 
              label: 'Punya Koordinat', 
              value: withCoords, 
              sub: `${totalCount > 0 ? ((withCoords / totalCount) * 100).toFixed(0) : 0}% titik dipetakan`, 
              color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/10 dark:border-emerald-500/10',
              icon: MapPin
            },
            { 
              label: 'Pernah Diperiksa', 
              value: inspected, 
              sub: `${totalCount > 0 ? ((inspected / totalCount) * 100).toFixed(0) : 0}% ada riwayat`, 
              color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/10 dark:border-violet-500/10',
              icon: CheckCircle
            },
            { 
              label: 'Daya ≥ 6,6 kVA', 
              value: highPower, 
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

        {/* 02. Toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search Bar */}
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Cari IDPEL atau nama pelanggan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Toolbar Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0 scrollbar-none">
              {/* Filter Toggle */}
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all cursor-pointer shrink-0 ${
                  showFilters || activeFilters > 0
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}>
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFilters > 0 && (
                  <span className="bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center leading-none">{activeFilters}</span>
                )}
              </button>

              {/* Desktop-Only Action Buttons (Peta, Ekspor) */}
              {selectedIds.size > 0 && (
                <>
                  <button onClick={() => setIsMapOpen(true)}
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shrink-0">
                    <Map className="w-3.5 h-3.5 text-blue-500" />
                    <span>Peta ({selectedIds.size})</span>
                  </button>
                  <button onClick={handleExportSelected}
                    className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/10 transition-all cursor-pointer shrink-0">
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor ({selectedIds.size})</span>
                  </button>
                </>
              )}

              {/* Add TO Button */}
              <button onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10 transition-all cursor-pointer shrink-0">
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah TO</span>
              </button>
            </div>
          </div>

          {/* Accordion Filter Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
              {[
                { label: 'Unit Pelayanan', value: selectedUnit,  set: setSelectedUnit,  options: filterOptions.units,  allLabel: 'Semua Unit'    },
                { label: 'Jenis TO',       value: selectedJenis, set: setSelectedJenis, options: filterOptions.jenises, allLabel: 'Semua Jenis'   },
                { label: 'Sub-DLPD',       value: selectedSub,   set: setSelectedSub,   options: filterOptions.subs,   allLabel: 'Semua Sub-DLPD' },
                { label: 'Gardu (7 Karakter)', value: selectedGardu, set: setSelectedGardu, options: filterOptions.gardus,  allLabel: 'Semua Gardu'   },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{f.label}</label>
                  <select value={f.value} onChange={e => f.set(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-700 dark:text-slate-300 transition-all cursor-pointer">
                    <option value="ALL">{f.allLabel}</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>        {/* 03. Result Info bar */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{totalItems.toLocaleString('id-ID')}</strong> dari <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{totalCount.toLocaleString('id-ID')}</strong> data
            {activeFilters > 0 && <span className="ml-1.5 text-blue-500 font-semibold">({activeFilters} filter aktif)</span>}
          </span>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg">
                {selectedIds.size} terpilih
              </span>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium cursor-pointer">
                Batal
              </button>
            </div>
          )}
        </div>

        {/* 04. Main Data Table / Card Grid */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">

          {/* Empty state */}
          {totalItems === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-350 dark:text-slate-600" />
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
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40 md:hidden p-4 space-y-3">
              {paginatedTargets.map(item => {
                const history = getInspectionHistory(item.IDPEL);
                const isSelected = selectedIds.has(String(item.IDPEL));
                return (
                  <div key={item.No || item.IDPEL}
                    onClick={() => handleSelectRecord(item)}
                    className={`p-4 flex flex-col gap-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-250 dark:border-blue-900/50 shadow-sm shadow-blue-500/5' 
                        : 'bg-white dark:bg-slate-900 border-slate-205 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    } mb-3 last:mb-0`}>
                    
                    {/* Top row: Checkbox, IDPEL, Jenis TO */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(item.IDPEL)} 
                          onClick={e => e.stopPropagation()}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-605 focus:ring-blue-500 cursor-pointer w-4 h-4 shrink-0" 
                        />
                        <span className="text-[11px] font-bold font-mono text-slate-400 dark:text-slate-500">{item.IDPEL}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase shrink-0">
                        {item.JENIS_TO}
                      </span>
                    </div>

                    {/* Customer Name and Verification Status */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                        {item.NAMA}
                      </h4>
                      {item.ALAMAT && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.ALAMAT}</p>
                      )}
                      {history && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20 w-fit">
                          <CheckCircle className="w-2.5 h-2.5 shrink-0" /> Pernah Diperiksa
                        </span>
                      )}
                    </div>

                    {/* Technical specs with visual dot separator */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>{item.TARIF} / {item.DAYA} VA</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>Gardu: {item.GARDU || '-'}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>Unit: {item.UNIT}</span>
                    </div>

                    {/* Footer: quick action buttons */}
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/60">
                      <button onClick={e => openMap(item.LATITUDE, item.LONGITUDE, e)}
                        disabled={!item.LATITUDE || !item.LONGITUDE}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 disabled:opacity-40 disabled:pointer-events-none hover:underline">
                        <MapPin className="w-3.5 h-3.5" /> Google Maps
                      </button>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        <Eye className="w-3.5 h-3.5" /> Detail Lengkap
                      </span>
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
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/50 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <th className="py-3.5 px-4 w-10">
                      <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-650 focus:ring-blue-500 cursor-pointer w-4 h-4" />
                    </th>
                    <th className="py-3.5 px-3 w-10 text-center">#</th>
                    <th className="py-3.5 px-4">IDPEL</th>
                    <th className="py-3.5 px-4">Pelanggan</th>
                    <th className="py-3.5 px-4">Alamat</th>
                    <th className="py-3.5 px-4">Tarif / Daya</th>
                    <th className="py-3.5 px-4">Gardu / Tiang</th>
                    <th className="py-3.5 px-4">Jenis TO</th>
                    <th className="py-3.5 px-4">Sub-DLPD</th>
                    <th className="py-3.5 px-4 text-center w-12">Peta</th>
                    <th className="py-3.5 px-4 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs text-slate-750 dark:text-slate-300">
                  {paginatedTargets.map((item, idx) => {
                    const history = getInspectionHistory(item.IDPEL);
                    const isSelected = selectedIds.has(String(item.IDPEL));
                    const isHighPower = parseInt(item.DAYA, 10) >= 6600;
                    return (
                      <tr key={item.No || item.IDPEL}
                        className={`transition-colors duration-150 ${isSelected ? 'bg-blue-500/5 dark:bg-blue-500/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}>
                        <td className="py-3 px-4">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.IDPEL)} onClick={e => e.stopPropagation()}
                            className="rounded border-slate-300 dark:border-slate-700 text-blue-650 focus:ring-blue-500 cursor-pointer w-4 h-4" />
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-300 dark:text-slate-600 text-[11px]">
                          {idx + 1 + (currentPage - 1) * itemsPerPage}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold font-mono text-slate-700 dark:text-slate-300 text-[11px]">{item.IDPEL}</span>
                        </td>
                        <td className="py-3 px-4 max-w-[180px]">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-900 dark:text-white truncate" title={item.NAMA}>{item.NAMA}</span>
                            {history && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20 w-fit">
                                <CheckCircle className="w-2.5 h-2.5 shrink-0" /> Diperiksa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[180px] truncate text-slate-400 dark:text-slate-500" title={item.ALAMAT || '-'}>
                          {item.ALAMAT || <span className="text-slate-300 dark:text-slate-700">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{item.TARIF}</span>
                            <span className={`text-[10px] font-bold font-mono ${isHighPower ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>{item.DAYA?.toLocaleString('id-ID')} VA</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[120px]">
                          <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate" title={item.GARDU}>{item.GARDU || '—'}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate" title={item.TIANG}>{item.TIANG || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10 dark:border-blue-900/30 uppercase whitespace-nowrap">
                            {item.JENIS_TO || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[140px] truncate text-slate-400 dark:text-slate-500 text-[11px]" title={item.SUBDLPD || ''}>
                          {item.SUBDLPD || <span className="text-slate-300 dark:text-slate-700">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={e => openMap(item.LATITUDE, item.LONGITUDE, e)}
                            className={`p-2 rounded-lg transition-colors ${item.LATITUDE && item.LONGITUDE ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/25' : 'text-slate-200 dark:text-slate-700 cursor-not-allowed'}`}
                            title={item.LATITUDE && item.LONGITUDE ? 'Buka Google Maps' : 'Koordinat tidak tersedia'}
                            disabled={!item.LATITUDE || !item.LONGITUDE}>
                            <MapPin className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => handleSelectRecord(item)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/25 text-blue-600 dark:text-blue-400 rounded-lg transition-all cursor-pointer"
                            title="Lihat Detail">
                            <Eye className="w-4 h-4" />
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-400 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{currentPage}</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-xs text-slate-400">{totalPages}</span>
              </div>
              <button onClick={handleNextPage} disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-400 hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer">
                Berikutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Sticky Mobile Multi-Select Action Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between animate-fade-in-up">
            <div className="flex flex-col">
              <span className="text-xs font-semibold">{selectedIds.size} dipilih</span>
              <span className="text-[10px] text-slate-400">Aksi massal aktif</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMapOpen(true)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer">
                <Map className="w-3.5 h-3.5" /> Peta
              </button>
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

      {isDrawerOpen && selectedRecord && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end md:items-stretch md:justify-end animate-fade-in">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300" onClick={() => { setIsDrawerOpen(false); setSelectedRecord(null); }} />
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-t-[2rem] md:rounded-t-none md:rounded-l-[2rem] shadow-2xl md:w-[440px] max-h-[85vh] md:max-h-full flex flex-col z-10 overflow-hidden border-t md:border-t-0 md:border-l border-slate-205 dark:border-slate-805 animate-slide-up md:animate-slide-in-right">

            {/* Drag handle (mobile) */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-4 mb-2 md:hidden shrink-0" />

            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-start justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Detail Target Bank TO</div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">{selectedRecord.NAMA}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 uppercase">{selectedRecord.JENIS_TO}</span>
                  {drawerHistory && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/20">
                      <CheckCircle className="w-3 h-3" /> Pernah Diperiksa
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => { setIsDrawerOpen(false); setSelectedRecord(null); }}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors shrink-0 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
              {/* Identitas & Data Teknis */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Informasi Utama</span>
                </div>
                {[
                  { label: 'ID Pelanggan',       value: selectedRecord.IDPEL,  mono: true   },
                  { label: 'Alamat',              value: selectedRecord.ALAMAT || '—'         },
                  { label: 'Tarif / Daya',        value: `${selectedRecord.TARIF || '—'} / ${(selectedRecord.DAYA || 0).toLocaleString('id-ID')} VA` },
                  { label: 'Gardu / Tiang',       value: `${selectedRecord.GARDU || '—'} / ${selectedRecord.TIANG || '—'}` },
                  { label: 'Unit Pelayanan',      value: selectedRecord.UNIT   },
                  { label: 'Sub-DLPD',            value: selectedRecord.SUBDLPD || '—'       },
                  { label: 'Jam Nyala',           value: selectedRecord.JAM_NYALA || '—'     },
                ].map((row, i, arr) => (
                  <div key={i} className={`flex justify-between items-center px-4 py-2.5 gap-4 ${i < arr.length - 1 ? 'border-b border-slate-200/30 dark:border-slate-800/20' : ''}`}>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide shrink-0">{row.label}</span>
                    <span className={`text-xs font-bold text-slate-800 dark:text-slate-200 text-right ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Inspection History */}
              {drawerHistory && (
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-900/30 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-emerald-500/10 dark:bg-emerald-950/20 border-b border-emerald-500/15 dark:border-emerald-900/30 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Riwayat Pemeriksaan</span>
                  </div>
                  {[
                    { label: 'Tgl. Pelaksanaan', value: drawerHistory.TanggalPelaksanaan || '—' },
                    { label: 'Regu Petugas',     value: drawerHistory.ReguPetugas || '—'         },
                    { label: 'Status Progress',  value: drawerHistory.StatusProgress || '—'      },
                    { label: 'Durasi',           value: drawerHistory.DurasiMenit ? `${drawerHistory.DurasiMenit} menit` : '—' },
                  ].map((row, i, arr) => (
                    <div key={i} className={`flex justify-between items-center px-4 py-2.5 gap-4 ${i < arr.length - 1 ? 'border-b border-emerald-500/10 dark:border-emerald-900/20' : ''}`}>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide shrink-0">{row.label}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-205 text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Map Action */}
              <div className="bg-slate-50 dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Koordinat Geografis</div>
                  <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {selectedRecord.LATITUDE && selectedRecord.LONGITUDE
                      ? `${selectedRecord.LATITUDE}, ${selectedRecord.LONGITUDE}`
                      : <span className="text-slate-455">Tidak tersedia</span>}
                  </div>
                </div>
                <button onClick={e => openMap(selectedRecord.LATITUDE, selectedRecord.LONGITUDE, e)}
                  disabled={!selectedRecord.LATITUDE || !selectedRecord.LONGITUDE}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/10 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0 active:scale-95">
                  <Map className="w-3.5 h-3.5" /> Buka Maps
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ================================================================= 
           ADD / IMPORT MODAL
      =================================================================  */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={handleCloseAddModal} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Target Bank TO</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Input manual atau impor dari berkas Excel</p>
              </div>
              <button onClick={handleCloseAddModal} disabled={uploadStatus === 'parsing'}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-500 transition-colors cursor-pointer disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="px-6 pt-4 shrink-0">
              <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-1 rounded-xl">
                {[{ id: 'manual', label: 'Input Manual' }, { id: 'excel', label: 'Unggah Excel' }].map(m => (
                  <button key={m.id} type="button" onClick={() => setAddMode(m.id)} disabled={uploadStatus === 'parsing'}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      addMode === m.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/40 dark:border-slate-800/40'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">

              {/* Manual Form */}
              {addMode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* IDPEL */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID Pelanggan (IDPEL)</label>
                      <input type="text" value={manualForm.IDPEL} onChange={e => setManualForm({...manualForm, IDPEL: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-205 font-mono"
                        placeholder="523510136588" required />
                      {manualErrors.IDPEL && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.IDPEL}</p>}
                    </div>
                    {/* Nama */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nama Pelanggan</label>
                      <input type="text" value={manualForm.NAMA} onChange={e => setManualForm({...manualForm, NAMA: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-205"
                        placeholder="S KAMSO" required />
                      {manualErrors.NAMA && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.NAMA}</p>}
                    </div>
                    {/* Alamat */}
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Alamat</label>
                      <input type="text" value={manualForm.ALAMAT} onChange={e => setManualForm({...manualForm, ALAMAT: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-205"
                        placeholder="Jl. Sukowati No. 5" />
                    </div>
                    {/* Tarif */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tarif</label>
                      <input type="text" value={manualForm.TARIF} onChange={e => setManualForm({...manualForm, TARIF: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-205"
                        placeholder="R1M" />
                    </div>
                    {/* Daya */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Daya (VA)</label>
                      <input type="number" value={manualForm.DAYA} onChange={e => setManualForm({...manualForm, DAYA: parseInt(e.target.value, 10) || 0})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-805 dark:text-slate-200 font-mono" />
                    </div>
                    {/* Gardu & Tiang */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gardu</label>
                      <input type="text" value={manualForm.GARDU} onChange={e => setManualForm({...manualForm, GARDU: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-205" placeholder="LAAAADE01400" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tiang</label>
                      <input type="text" value={manualForm.TIANG} onChange={e => setManualForm({...manualForm, TIANG: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-800 dark:text-slate-205" placeholder="SA2-208/" />
                    </div>
                    {/* Unit */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Unit (UNIT)</label>
                      <input type="number" value={manualForm.UNIT} onChange={e => setManualForm({...manualForm, UNIT: parseInt(e.target.value, 10) || 52351})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-805 dark:text-slate-200 font-mono" />
                    </div>
                    {/* Jenis TO */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Jenis TO</label>
                      <input type="text" value={manualForm.JENIS_TO} onChange={e => setManualForm({...manualForm, JENIS_TO: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-805 dark:text-slate-200"
                        placeholder="SOREK 1 PHASA" />
                    </div>
                    {/* Latitude */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Latitude</label>
                      <input type="text" value={manualForm.LATITUDE} onChange={e => setManualForm({...manualForm, LATITUDE: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-805 dark:text-slate-200 font-mono"
                        placeholder="-7.422084" />
                      {manualErrors.LATITUDE && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.LATITUDE}</p>}
                    </div>
                    {/* Longitude */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Longitude</label>
                      <input type="text" value={manualForm.LONGITUDE} onChange={e => setManualForm({...manualForm, LONGITUDE: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-805 dark:text-slate-200 font-mono"
                        placeholder="110.526313" />
                      {manualErrors.LONGITUDE && <p className="text-[10px] text-rose-500 font-semibold">{manualErrors.LONGITUDE}</p>}
                    </div>
                    {/* Sub-DLPD */}
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sub-DLPD</label>
                      <input type="text" value={manualForm.SUBDLPD} onChange={e => setManualForm({...manualForm, SUBDLPD: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-805 dark:text-slate-200"
                        placeholder="STAND ACMT TIDAK SESUAI" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-2">
                    <button type="button" onClick={handleCloseAddModal}
                      className="px-4 py-2.5 text-xs font-bold border border-slate-205 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                      Batal
                    </button>
                    <button type="submit"
                      className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer">
                      Simpan Target
                    </button>
                  </div>
                </form>
              )}

              {/* Excel Uploader */}
              {addMode === 'excel' && (
                <div className="flex flex-col gap-4">
                  {/* Template download row */}
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 rounded-xl px-4 py-3 shadow-sm">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-505 uppercase tracking-widest mb-0.5">Format Template</div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Gunakan template resmi Bank TO</div>
                    </div>
                    <button type="button" onClick={downloadTemplate}
                      className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 cursor-pointer transition-all">
                      <Download className="w-3.5 h-3.5" /> Unduh Template
                    </button>
                  </div>

                  {/* Drop zone */}
                  {uploadStatus === 'idle' && (
                    <div onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                      onClick={() => fileInputRef.current.click()}
                      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-500/5' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-955/20'
                      }`}>
                      <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} />
                      <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/15 dark:border-blue-900/30 rounded-xl flex items-center justify-center mb-4 text-blue-500">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Seret file ke sini atau klik untuk memilih</p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">Format Bank TO (.xlsx, .xls) sesuai template</p>
                    </div>
                  )}

                  {/* Parsing */}
                  {uploadStatus === 'parsing' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Menganalisa berkas spreadsheet...</p>
                    </div>
                  )}

                  {/* Success */}
                  {uploadStatus === 'success' && uploadReport && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-900/30 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                        <div className="w-9 h-9 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Berkas Berhasil Dibaca</div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">{fileName}</div>
                          <div className="mt-2 text-xs font-bold text-emerald-650 dark:text-emerald-400">
                            {uploadReport.successCount} data target Bank TO terdeteksi
                          </div>
                        </div>
                      </div>
                      {uploadReport.errors.length > 0 && (
                        <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-900/30 rounded-2xl p-4">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-bold">Log Peringatan ({uploadReport.errors.length})</span>
                          </div>
                          <div className="max-h-24 overflow-y-auto text-[11px] font-mono text-amber-700 dark:text-amber-400 flex flex-col gap-1">
                            {uploadReport.errors.map((err, i) => <p key={i}>• {err}</p>)}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <button type="button" onClick={() => { onDataLoaded(parsedData, 'merge'); handleCloseAddModal(); }}
                          className="py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 text-center">
                          Gabungkan Data
                        </button>
                        <button type="button" onClick={() => { onDataLoaded(parsedData, 'overwrite'); handleCloseAddModal(); }}
                          className="py-2.5 text-xs font-bold border border-rose-300 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer transition-all active:scale-95 text-center">
                          Ganti Semua
                        </button>
                      </div>
                      <button type="button" onClick={() => setUploadStatus('idle')}
                        className="text-xs text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 underline text-center cursor-pointer font-medium mt-1">
                        Batal &amp; Pilih Ulang
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {uploadStatus === 'error' && uploadReport && (
                    <div className="flex flex-col items-center text-center gap-4 py-4">
                      <div className="w-12 h-12 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/10 dark:border-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Gagal Memproses Berkas</p>
                        <div className="mt-3 p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 dark:border-rose-900/35 rounded-xl text-left text-[11px] font-mono text-rose-600 dark:text-rose-400 max-h-24 overflow-y-auto">
                          {uploadReport.errors.map((err, i) => <p key={i}>[Error] {err}</p>)}
                        </div>
                      </div>
                      <button type="button" onClick={() => setUploadStatus('idle')}
                        className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-all active:scale-95">
                        Pilih File Lain
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

         {isMapOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-stretch justify-stretch animate-fade-in bg-slate-950/40 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-900 w-full h-full shadow-2xl z-10 flex flex-col overflow-hidden transform transition-transform duration-300">

            {/* Map Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex justify-between items-center shrink-0 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Peta Sebaran Lokasi Target</h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                    {targets.filter(t => selectedIds.has(String(t.IDPEL)) && t.LATITUDE && t.LONGITUDE).length} dari {selectedIds.size} target terpeta
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMapOpen(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl text-slate-500 dark:text-slate-450 transition-colors cursor-pointer shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Distance Analysis Bar */}
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-3 shrink-0 bg-slate-50/40 dark:bg-slate-950/20 text-xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Analisis Rute:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${distanceAnalysis.badgeClass}`}>
                {distanceAnalysis.status}
              </span>
              {parseFloat(distanceAnalysis.maxDistance) > 0 && (
                <span className="font-bold font-mono text-slate-700 dark:text-slate-350">
                  Rentang Maks: {distanceAnalysis.maxDistance} km
                </span>
              )}
              <span className="text-[11px] text-slate-500 dark:text-slate-455 ml-auto font-medium">{distanceAnalysis.desc}</span>
            </div>

            {/* Map Body */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Sidebar list */}
              <div className="hidden md:flex flex-col w-80 border-r border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-950/10 overflow-hidden shrink-0">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Daftar Rute Pelanggan</span>
                  <span className="bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-750 dark:text-slate-300">{selectedIds.size}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-none">
                  {targets.filter(t => selectedIds.has(String(t.IDPEL))).map(t => {
                    const hasCoords = t.LATITUDE && t.LONGITUDE;
                    return (
                      <div key={t.IDPEL} 
                        onClick={() => focusCustomerOnMap(t)}
                        className={`p-3.5 bg-white dark:bg-slate-900 border rounded-2xl flex flex-col gap-1.5 shadow-sm hover:shadow transition-all duration-200 ${
                          hasCoords 
                            ? 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-550 hover:bg-slate-50/20 dark:hover:bg-slate-800/20 active:scale-[0.98] border-slate-150 dark:border-slate-800/80' 
                            : 'opacity-65 cursor-not-allowed border-slate-100 dark:border-slate-900'
                        }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold font-mono text-slate-400 dark:text-slate-505">{t.IDPEL}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                            {t.TARIF}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">{t.NAMA}</span>
                        {t.ALAMAT && <span className="text-[10px] text-slate-500 dark:text-slate-455 truncate">{t.ALAMAT}</span>}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          <span>{t.DAYA} VA</span>
                          <span>•</span>
                          <span className="truncate">G: {t.GARDU || '-'}</span>
                        </div>
                        {!hasCoords && (
                          <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10 dark:border-rose-955/20 w-fit mt-1">
                            Koordinat Kosong
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Map canvas */}
              <div className="flex-1 relative bg-slate-50 dark:bg-slate-955 flex items-center justify-center min-h-0">
                <div id="selected-map-container" className="absolute inset-0 z-0 h-full w-full" />
                {targets.filter(t => selectedIds.has(String(t.IDPEL)) && t.LATITUDE && t.LONGITUDE).length === 0 && (
                  <div className="relative z-10 text-center p-8 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-xl max-w-sm flex flex-col items-center gap-3.5 animate-fade-in mx-4">
                    <div className="w-14 h-14 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/10 dark:border-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 animate-pulse">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Koordinat Tidak Tersedia</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Seluruh target yang Anda pilih tidak memiliki data koordinat (Latitude &amp; Longitude). Harap perbarui koordinat pada data target.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
