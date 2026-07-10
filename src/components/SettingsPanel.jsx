import { useState, useEffect, useMemo } from 'react';
import { Database, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, Save, HelpCircle, Building, Trash2, UserPlus, Edit, Search, User, Key, Phone, Shield, X, Sliders, Settings, Download } from 'lucide-react';

export default function SettingsPanel({ 
  backendUrl: propBackendUrl, 
  onSaveBackendUrl, 
  onSyncAll,
  targets = [],
  bankToTargets = [],
  onClearLocalData,
  currentUser,
  users = [],
  onUsersChanged,
  ulp = '',
  up3 = '',
  onSaveMetadata,
  lastSyncTime = null,
  hasUnsyncedChanges = false
}) {
  const [url, setUrl] = useState(propBackendUrl || '');
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testMessage, setTestMessage] = useState('');
  const [syncingTargets, setSyncingTargets] = useState(false);
  const [syncingBankTo, setSyncingBankTo] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Custom Alert / Confirm Modal State
  const [modalAlert, setModalAlert] = useState({
    show: false,
    title: '',
    message: '',
    type: 'info', // info, success, warning, error, confirm
    onConfirm: null,
    onCancel: null
  });

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setModalAlert({
      show: true,
      title,
      message,
      type,
      onConfirm: () => {
        setModalAlert(prev => ({ ...prev, show: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: null
    });
  };

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setModalAlert({
      show: true,
      title,
      message,
      type: 'confirm',
      onConfirm: () => {
        setModalAlert(prev => ({ ...prev, show: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        setModalAlert(prev => ({ ...prev, show: false }));
        if (onCancel) onCancel();
      }
    });
  };
  
  // Estimate local database size in bytes
  const localDatabaseSize = useMemo(() => {
    let bytes = 0;
    if (targets.length > 0) bytes += new Blob([JSON.stringify(targets)]).size;
    if (bankToTargets.length > 0) bytes += new Blob([JSON.stringify(bankToTargets)]).size;
    
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, [targets, bankToTargets]);

  // Local metadata parameters
  const [prevUlp, setPrevUlp] = useState(ulp);
  const [prevUp3, setPrevUp3] = useState(up3);
  const [defaultUlp, setDefaultUlp] = useState(ulp);
  const [defaultUp3, setDefaultUp3] = useState(up3);
  const [saveMetadataStatus, setSaveMetadataStatus] = useState(false);
  const [targetOptimisPercent, setTargetOptimisPercent] = useState(() => {
    const saved = localStorage.getItem('p2tl_target_multiplier_percent');
    return saved ? Number(saved) : 110;
  });

  if (ulp !== prevUlp) {
    setPrevUlp(ulp);
    setDefaultUlp(ulp);
  }
  if (up3 !== prevUp3) {
    setPrevUp3(up3);
    setDefaultUp3(up3);
  }

  // Working days checklist state
  const [workingDays, setWorkingDays] = useState(() => {
    const saved = localStorage.getItem('p2tl_working_days_checklist');
    return saved ? JSON.parse(saved) : { monFri: true, sat: true, sun: true };
  });
  const [saveDaysStatus, setSaveDaysStatus] = useState(false);

  // User management states
  const [userSearch, setUserSearch] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'Petugas',
    whatsapp: '',
    unit: 'Salatiga Kota'
  });
  const [userFormError, setUserFormError] = useState('');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [activeSettingTab, setActiveSettingTab] = useState('aplikasi'); // aplikasi, pengguna, sinkronisasi
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, connecting, merging, uploading, success, error


  // Filtered users list
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      u.username.toLowerCase().includes(q) || 
      u.role.toLowerCase().includes(q) || 
      u.unit.toLowerCase().includes(q) || 
      (u.whatsapp || '').includes(q)
    );
  }, [users, userSearch]);

  const openAddUserModal = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      role: 'Petugas',
      whatsapp: '',
      unit: 'Salatiga Kota'
    });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user) => {
    setEditingUser(user);
    setUserForm({
      username: user.username,
      password: user.password,
      role: user.role,
      whatsapp: user.whatsapp,
      unit: user.unit
    });
    setUserFormError('');
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (usernameToDelete) => {
    if (usernameToDelete.toLowerCase() === currentUser?.name?.toLowerCase()) {
      showAlert("Penghapusan Gagal", "Anda tidak dapat menghapus akun Anda sendiri.", "warning");
      return;
    }
    const adminCount = users.filter(u => u.role === 'Administrator').length;
    const targetUser = users.find(u => u.username.toLowerCase() === usernameToDelete.toLowerCase());
    if (targetUser?.role === 'Administrator' && adminCount <= 1) {
      showAlert("Penghapusan Gagal", "Sistem membutuhkan setidaknya satu Administrator. Anda tidak dapat menghapus administrator terakhir.", "warning");
      return;
    }
    showConfirm(
      "Hapus User",
      `Apakah Anda yakin ingin menghapus user ${usernameToDelete}?`,
      () => {
        const updated = users.filter(u => u.username.toLowerCase() !== usernameToDelete.toLowerCase());
        onUsersChanged(updated);
      }
    );
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    setUserFormError('');

    const trimmedUsername = userForm.username.trim();
    if (!trimmedUsername) {
      setUserFormError('Nama Pengguna wajib diisi.');
      return;
    }

    if (!userForm.password.trim()) {
      setUserFormError('Kata Sandi wajib diisi.');
      return;
    }

    const updatedUsers = [...users];
    const nowIso = new Date().toISOString();

    if (editingUser) {
      // Edit mode
      const idx = updatedUsers.findIndex(u => u.username.toLowerCase() === editingUser.username.toLowerCase());
      if (idx !== -1) {
        updatedUsers[idx] = {
          username: trimmedUsername,
          password: userForm.password,
          role: userForm.role,
          whatsapp: userForm.whatsapp.trim(),
          unit: userForm.unit.trim(),
          lastUpdated: nowIso
        };
      }
    } else {
      // Add mode
      const exists = updatedUsers.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
      if (exists) {
        setUserFormError('Nama Pengguna sudah terdaftar.');
        return;
      }
      updatedUsers.push({
        username: trimmedUsername,
        password: userForm.password,
        role: userForm.role,
        whatsapp: userForm.whatsapp.trim(),
        unit: userForm.unit.trim(),
        lastUpdated: nowIso
      });
    }

    onUsersChanged(updatedUsers);
    setIsUserModalOpen(false);
  };

  // Keep local state in sync with props
  useEffect(() => {
    const timer = setTimeout(() => {
      setUrl(propBackendUrl || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [propBackendUrl]);

  // Test Connection
  const handleTestConnection = async () => {
    if (!url) {
      setTestStatus('error');
      setTestMessage('Masukkan URL Apps Script Web App terlebih dahulu.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      const response = await fetch(`${url}?action=readAll`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setTestStatus('success');
        setTestMessage(`Koneksi Sukses! Terhubung ke Google Sheet. Terbaca ${result.targets?.length || 0} Data Target dan ${result.bankTo?.length || 0} Data Bank TO.`);
      } else {
        setTestStatus('error');
        setTestMessage(result.message || 'Respons API tidak valid.');
      }
    } catch (err) {
      setTestStatus('error');
      setTestMessage(`Koneksi Gagal: ${err.message}. Pastikan CORS aktif dan dideploy dengan akses "Anyone".`);
    }
  };

  // Save Backend URL
  const handleSaveUrl = () => {
    onSaveBackendUrl(url.trim());
    // Auto-test after save
    if (url.trim()) {
      handleTestConnection();
    }
  };

  // Save metadata overrides
  const handleSaveMetadata = () => {
    if (onSaveMetadata) {
      onSaveMetadata(defaultUlp, defaultUp3);
    }
    localStorage.setItem('p2tl_target_multiplier_percent', targetOptimisPercent.toString());
    setSaveMetadataStatus(true);
    setTimeout(() => setSaveMetadataStatus(false), 2000);
  };

  // Handle working days checklist checkboxes changes
  const handleCheckboxChange = (dayKey) => {
    setWorkingDays(prev => ({
      ...prev,
      [dayKey]: !prev[dayKey]
    }));
  };

  // Persist working days checklist to local storage
  const handleSaveWorkingDays = () => {
    localStorage.setItem('p2tl_working_days_checklist', JSON.stringify(workingDays));
    
    // Legacy support mapping for old state variable (p2tl_working_days):
    let mappedOld = '7';
    if (workingDays.monFri && workingDays.sat && workingDays.sun) {
      mappedOld = '7';
    } else if (workingDays.monFri && workingDays.sat) {
      mappedOld = '6';
    } else if (workingDays.monFri) {
      mappedOld = '5';
    }
    localStorage.setItem('p2tl_working_days', mappedOld);

    setSaveDaysStatus(true);
    setTimeout(() => setSaveDaysStatus(false), 2000);
  };

  // Sync targets manual trigger
  const handleSyncTargets = async () => {
    if (!propBackendUrl) return;
    setSyncingTargets(true);
    try {
      const response = await fetch(`${propBackendUrl}?action=syncDataTo`, {
        method: 'POST',
        body: JSON.stringify({ data: targets }),
        headers: { 'Content-Type': 'text/plain' } // Avoid CORS preflight OPTIONS request
      });
      const result = await response.json();
      if (result.status === 'success') {
        showAlert('Sukses Sinkronisasi', 'Data Target berhasil diunggah ke Google Sheet.', 'success');
      } else {
        showAlert('Gagal Sinkronisasi', 'Gagal menyelaraskan: ' + result.message, 'error');
      }
    } catch (err) {
      showAlert('Kesalahan Koneksi', 'Terjadi kesalahan koneksi: ' + err.message, 'error');
    } finally {
      setSyncingTargets(false);
    }
  };

  // Sync bank to targets manual trigger
  const handleSyncBankTo = async () => {
    if (!propBackendUrl) return;
    setSyncingBankTo(true);
    try {
      const response = await fetch(`${propBackendUrl}?action=syncBankTo`, {
        method: 'POST',
        body: JSON.stringify({ data: bankToTargets }),
        headers: { 'Content-Type': 'text/plain' }
      });
      const result = await response.json();
      if (result.status === 'success') {
        showAlert('Sukses Sinkronisasi', 'Data Bank TO berhasil diunggah ke Google Sheet.', 'success');
      } else {
        showAlert('Gagal Sinkronisasi', 'Gagal menyelaraskan: ' + result.message, 'error');
      }
    } catch (err) {
      showAlert('Kesalahan Koneksi', 'Terjadi kesalahan koneksi: ' + err.message, 'error');
    } finally {
      setSyncingBankTo(false);
    }
  };

  const handleSyncAll = async () => {
    if (!propBackendUrl || !onSyncAll) return;
    setSyncingAll(true);
    setSyncStatus('connecting');
    try {
      // Transition to merging state
      await new Promise(resolve => setTimeout(resolve, 600));
      setSyncStatus('merging');
      
      await onSyncAll(propBackendUrl);
      
      // Transition to uploading state to show local state updates
      setSyncStatus('uploading');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSyncStatus('success');
      showAlert('Sinkronisasi Sukses', 'Sinkronisasi dua arah (sesuai waktu terbaru) selesai dengan sukses!', 'success');
    } catch (err) {
      setSyncStatus('error');
      showAlert('Gagal Sinkronisasi', 'Gagal menyelaraskan database: ' + err.message, 'error');
    } finally {
      setSyncingAll(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleForceDownloadAll = async () => {
    if (!propBackendUrl || !onSyncAll) return;
    setSyncingAll(true);
    setSyncStatus('connecting');
    try {
      // Transition to merging state
      await new Promise(resolve => setTimeout(resolve, 600));
      setSyncStatus('merging');
      
      await onSyncAll(propBackendUrl, true);
      
      // Transition to uploading state to show local state updates
      setSyncStatus('uploading');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSyncStatus('success');
      showAlert('Unduh Sukses', 'Seluruh data lokal berhasil ditimpa dengan data cloud terbaru dari Google Sheets.', 'success');
    } catch (err) {
      setSyncStatus('error');
      showAlert('Gagal Mengunduh', 'Gagal mengunduh data dari cloud: ' + err.message, 'error');
    } finally {
      setSyncingAll(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleForceDownloadClick = () => {
    showConfirm(
      "Paksa Unduh Data Cloud",
      "Apakah Anda yakin ingin mengganti seluruh database lokal di browser ini dengan data dari Google Spreadsheet? Seluruh perubahan lokal Anda yang belum disinkronkan akan ditimpa dan hilang secara permanen.",
      handleForceDownloadAll
    );
  };

  const handleClearLocalDataClick = () => {
    showConfirm(
      "Hapus Database Lokal",
      "Apakah Anda yakin ingin menghapus semua database lokal dari browser? Tindakan ini tidak dapat dibatalkan.",
      () => {
        onClearLocalData();
      }
    );
  };

  return (
    <>
      <div className="w-full space-y-4 animate-fade-in-up">
      {/* ── Unified Command Bar (Dashboard Style Sub-tabs) ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 w-full md:w-auto">
          <button
            onClick={() => setActiveSettingTab('aplikasi')}
            className={`flex-1 md:flex-none md:px-6 py-2 text-xs font-bold rounded-lg transition-all duration-200 text-center whitespace-nowrap min-w-[80px] md:min-w-[112px] flex items-center justify-center gap-2 cursor-pointer ${
              activeSettingTab === 'aplikasi'
                ? 'bg-white dark:bg-slate-805 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/85 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Setting Aplikasi</span>
          </button>
          
          <button
            onClick={() => setActiveSettingTab('pengguna')}
            className={`flex-1 md:flex-none md:px-6 py-2 text-xs font-bold rounded-lg transition-all duration-200 text-center whitespace-nowrap min-w-[80px] md:min-w-[112px] flex items-center justify-center gap-2 cursor-pointer ${
              activeSettingTab === 'pengguna'
                ? 'bg-white dark:bg-slate-805 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/85 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Manajemen Pengguna</span>
          </button>
          
          <button
            onClick={() => setActiveSettingTab('sinkronisasi')}
            className={`flex-1 md:flex-none md:px-6 py-2 text-xs font-bold rounded-lg transition-all duration-200 text-center whitespace-nowrap min-w-[80px] md:min-w-[112px] flex items-center justify-center gap-2 cursor-pointer ${
              activeSettingTab === 'sinkronisasi'
                ? 'bg-white dark:bg-slate-805 dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/85 dark:border-slate-700/80'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sinkronisasi</span>
          </button>
        </div>
      </div>

        {/* Tab 1: Setting Aplikasi */}
        {activeSettingTab === 'aplikasi' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-fade-in">
            {/* Card: Pengaturan Unit Kerja */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col gap-5 justify-between">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <Building className="w-4.5 h-4.5 text-blue-500" />
                  <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Pengaturan Unit & Target Analisis</h3>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Default Unit Layanan (ULP)</label>
                    <input 
                      type="text" 
                      value={defaultUlp} 
                      onChange={(e) => setDefaultUlp(e.target.value)}
                      className="input-text text-xs" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Default Area (UP3)</label>
                    <input 
                      type="text" 
                      value={defaultUp3} 
                      onChange={(e) => setDefaultUp3(e.target.value)}
                      className="input-text text-xs" 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Optimis (%)</label>
                    <input 
                      type="number" 
                      min="1"
                      max="500"
                      value={targetOptimisPercent} 
                      onChange={(e) => setTargetOptimisPercent(Math.max(1, Number(e.target.value)))}
                      className="input-text text-xs font-semibold" 
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveMetadata}
                className={`btn-primary w-full py-2.5 text-xs font-bold flex justify-center gap-2 items-center ${
                  saveMetadataStatus ? 'bg-emerald-600 border-emerald-500' : ''
                }`}
              >
                {saveMetadataStatus ? (
                  <>
                    <CheckCircle className="w-4 h-4 animate-bounce" />
                    Unit Kerja Berhasil Disimpan
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Unit Kerja
                  </>
                )}
              </button>
            </div>

            {/* Card: Hari Kerja */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col gap-5 justify-between">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <RefreshCw className="w-4.5 h-4.5 text-blue-500 animate-spin-slow" />
                  <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Pengaturan Hari Kerja</h3>
                </div>

                <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold leading-relaxed">
                  Tentukan hari kerja aktif untuk membagi target kWh bulanan menjadi target harian (breakdown target harian):
                </p>

                <div className="flex flex-col gap-3 my-1 bg-slate-50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={workingDays.monFri} 
                      onChange={() => handleCheckboxChange('monFri')}
                      className="rounded border-slate-350 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500/30 w-4.5 h-4.5 cursor-pointer" 
                    />
                    Senin - Jumat
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={workingDays.sat} 
                      onChange={() => handleCheckboxChange('sat')}
                      className="rounded border-slate-350 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500/30 w-4.5 h-4.5 cursor-pointer" 
                    />
                    Sabtu
                  </label>

                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={workingDays.sun} 
                      onChange={() => handleCheckboxChange('sun')}
                      className="rounded border-slate-350 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500/30 w-4.5 h-4.5 cursor-pointer" 
                    />
                    Minggu
                  </label>
                </div>
              </div>

              <button 
                onClick={handleSaveWorkingDays}
                className={`btn-primary w-full py-2.5 text-xs font-bold flex justify-center gap-2 items-center ${
                  saveDaysStatus ? 'bg-emerald-600 border-emerald-500' : ''
                }`}
              >
                {saveDaysStatus ? (
                  <>
                    <CheckCircle className="w-4 h-4 animate-bounce" />
                    Hari Kerja Berhasil Disimpan
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Hari Kerja
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Manajemen Pengguna */}
        {activeSettingTab === 'pengguna' && (
          <div className="grid grid-cols-1 gap-6 animate-fade-in">
            {currentUser?.role === 'Administrator' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Manajemen Pengguna</h3>
                      <p className="text-[8px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Kelola akun akses, kata sandi, dan role petugas di cloud.</p>
                    </div>
                  </div>
                  <button 
                    onClick={openAddUserModal}
                    className="btn-primary py-2 px-4 text-xs font-sans font-bold flex gap-2 items-center cursor-pointer shadow-lg shadow-blue-500/10"
                  >
                    <UserPlus className="w-4 h-4" />
                    Tambah User
                  </button>
                </div>

                {/* Search & stats */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                  <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="input-text text-xs pl-9 py-2"
                      placeholder="Cari user berdasarkan nama, role, unit..."
                    />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-455 font-black bg-slate-50 dark:bg-slate-950/20 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    Total: <span className="text-blue-600 dark:text-blue-400">{users.length}</span> User
                  </div>
                </div>

                {/* Users List Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => {
                    const isSelf = user.username.toLowerCase() === currentUser?.name?.toLowerCase();
                    const isAdminUser = user.role === 'Administrator';
                    return (
                      <div 
                        key={user.username}
                        className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl flex flex-col gap-3.5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                            {user.username.substring(0, 2)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{user.username}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black border uppercase shrink-0 ${
                                isAdminUser 
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/10' 
                                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/10'
                              }`}>
                                {user.role}
                              </span>
                            </div>
                            <p className="text-[8px] sm:text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5 truncate">{user.unit}</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-850 pt-3 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          {user.whatsapp && (
                            <div className="flex items-center gap-2 font-medium">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a 
                                href={`https://wa.me/${String(user.whatsapp).replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="hover:underline hover:text-emerald-555 font-semibold"
                              >
                                {user.whatsapp}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-2 font-medium">
                            <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-slate-500 dark:text-slate-555 truncate animate-pulse" title={user.password}>
                              Password: {user.password}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                          <span className="text-[8px] sm:text-xs text-slate-455 dark:text-slate-500 font-bold">
                            Updated: {new Date(user.lastUpdated).toLocaleDateString()}
                          </span>
                          
                          <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => openEditUserModal(user)}
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/40 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer focus:outline-none"
                              title="Edit User"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {!isSelf && (
                              <button 
                                onClick={() => handleDeleteUser(user.username)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-955/45 text-slate-550 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-455 rounded-lg transition-colors cursor-pointer focus:outline-none"
                                title="Hapus User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400 dark:text-slate-500 font-bold border border-dashed border-slate-200 dark:border-slate-805 rounded-2xl">
                      Tidak ada user ditemukan.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Non-Admin User View Profile Card */
              <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm max-w-xl mx-auto flex flex-col gap-6 w-full">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-lg uppercase shadow-sm">
                    {currentUser?.name?.substring(0, 2) || 'US'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Profil Akun</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Detail akun Anda yang terdaftar pada sistem.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nama Pengguna</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">{currentUser?.name || '-'}</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Role Hak Akses</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm uppercase tracking-wide">{currentUser?.role || '-'}</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-1 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Unit Kerja Asosiasi</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm">{currentUser?.unit || '-'}</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-955/25 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex gap-3 text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-semibold">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p>Hanya Administrator yang memiliki wewenang penuh untuk melakukan manajemen akun pengguna (tambah/edit/hapus). Silakan hubungi admin unit Anda jika memerlukan pembaruan kredensial atau informasi akun.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Sinkronisasi Cloud */}
        {activeSettingTab === 'sinkronisasi' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Top Row: Status & Config Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left (5 cols): Database Status Card */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex gap-4 items-center pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className={`p-3 rounded-2xl shrink-0 ${
                        propBackendUrl 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-455' 
                          : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-455'
                      }`}>
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Status Cloud</h3>
                        <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          propBackendUrl 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-emerald-100 dark:border-emerald-900/20'
                        }`}>
                          {propBackendUrl ? 'Google Sheets Terkoneksi' : 'Local Storage Only'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3.5 text-xs font-semibold text-slate-650 dark:text-slate-400 mt-4">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 dark:text-slate-500">Penyimpanan Lokal:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-250">{localDatabaseSize}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-850">
                        <span className="text-slate-400 dark:text-slate-500">Data Target P2TL:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-250">{targets.length} Baris</span>
                      </div>

                      <div className="flex justify-between items-center py-1 border-t border-slate-100 dark:border-slate-850">
                        <span className="text-slate-400 dark:text-slate-500">Data Bank TO:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-250">{bankToTargets.length} Baris</span>
                      </div>
                    </div>
                  </div>

                  {propBackendUrl && lastSyncTime && (
                    <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-850 mt-4">
                      <span className="text-slate-400 dark:text-slate-500">Sinkronisasi Cloud Terakhir:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-250 bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-[10px] break-all">
                        {new Date(lastSyncTime).toLocaleString('id-ID')}
                      </span>
                      {hasUnsyncedChanges && (
                        <div className="text-amber-600 dark:text-amber-400 font-black italic flex items-center gap-1 mt-1 text-[10px] animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Ada data baru belum diunggah</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right (7 cols): Google Sheets API Config */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <Database className="w-4.5 h-4.5 text-blue-500" />
                        <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Google Spreadsheet Database</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSetupGuide(true)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold transition-colors focus:outline-none cursor-pointer animate-pulse"
                      >
                        <HelpCircle className="w-4 h-4 text-blue-555" />
                        <span>Panduan Setup</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Google Apps Script Web App URL</label>
                      <div className="flex gap-2 items-stretch">
                        <input 
                          type="text" 
                          value={url} 
                          onChange={(e) => setUrl(e.target.value)}
                          className="input-text text-xs flex-1 font-mono" 
                          placeholder="https://script.google.com/macros/s/.../exec"
                        />
                        <button 
                          onClick={handleSaveUrl}
                          className="btn-primary py-2 px-4 text-xs font-sans font-bold flex gap-2 items-center shrink-0"
                        >
                          <Save className="w-4.5 h-4.5" />
                          Simpan
                        </button>
                      </div>
                      {import.meta.env.VITE_BACKEND_URL && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic mt-0.5">
                          *Kosongkan input dan klik Simpan untuk menggunakan URL default dari file .env: <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 break-all">{import.meta.env.VITE_BACKEND_URL}</span>
                        </p>
                      )}
                    </div>

                    {/* Test Connection Output */}
                    {testStatus !== 'idle' && (
                      <div className={`p-4 border rounded-2xl flex items-start gap-3 text-xs mt-3 ${
                        testStatus === 'testing' 
                          ? 'bg-slate-50 border-slate-150 text-slate-600 dark:bg-slate-955/20 dark:border-slate-850 dark:text-slate-400'
                          : testStatus === 'success'
                          ? 'bg-emerald-50 border-emerald-150 text-emerald-800 dark:bg-emerald-955/20 dark:border-emerald-900/30 dark:text-emerald-400'
                          : 'bg-rose-50 border-rose-150 text-rose-800 dark:bg-rose-955/20 dark:border-rose-900/30 dark:text-rose-455'
                      }`}>
                        {testStatus === 'testing' && <RefreshCw className="w-4.5 h-4.5 text-blue-500 animate-spin shrink-0 mt-0.5" />}
                        {testStatus === 'success' && <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />}
                        {testStatus === 'error' && <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />}
                        
                        <div className="flex-1">
                          <p className="font-bold">{testStatus === 'testing' ? 'Sedang mengetes koneksi...' : testStatus === 'success' ? 'Sukses' : 'Gagal'}</p>
                          <p className="mt-0.5 font-medium leading-relaxed">{testMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {propBackendUrl && (
                    <button 
                      onClick={handleTestConnection}
                      className="btn-secondary w-full py-2.5 text-xs font-bold flex justify-center gap-2 items-center mt-4"
                      disabled={testStatus === 'testing'}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                      Test Ulang Koneksi
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Penyelarasan Data Manual (Full Width) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <RefreshCw className="w-4.5 h-4.5 text-blue-550" />
                <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Penyelarasan Data Manual</h3>
              </div>

              {propBackendUrl ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Visual & Direct Sync */}
                  <div className="flex flex-col gap-4">
                    {/* Visual Diagram of Database Integration */}
                    <div className="grid grid-cols-3 items-center bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-150 dark:border-slate-850 rounded-2xl gap-2">
                      <div className="flex flex-col items-center text-center">
                        <Sliders className="w-7 h-7 text-blue-500 mb-1" />
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Local DB</span>
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-250 mt-0.5">{targets.length + bankToTargets.length} Baris</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className={`p-3 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/10 relative ${syncingAll ? 'animate-pulse' : ''}`}>
                          <RefreshCw className={`w-5 h-5 ${syncingAll ? 'animate-spin' : ''}`} />
                          {hasUnsyncedChanges && !syncingAll && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-555 mt-1">
                          {syncingAll ? 'Syncing...' : hasUnsyncedChanges ? 'Belum Unggah' : 'Up-to-date'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <Database className="w-7 h-7 text-emerald-500 mb-1" />
                        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Google Sheet</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 border ${
                          propBackendUrl 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-955/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/20'
                        }`}>
                          {propBackendUrl ? 'Connected' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Sync button */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2.5">
                        <button 
                          onClick={handleSyncAll}
                          disabled={syncingAll}
                          className="btn-primary w-full py-2.5 text-xs font-bold flex justify-center gap-2 items-center shadow-lg shadow-blue-550/15"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                          Mulai Sinkronisasi Dua Arah
                        </button>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed">
                          Aksi ini merekonsiliasi seluruh data target, bank TO, dan pengguna lokal dengan data di Google Spreadsheet secara cerdas. Konflik diselesaikan secara otomatis dengan mengambil data dengan stempel waktu terakhir yang paling baru (Newest-wins).
                        </p>
                      </div>

                      <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <button 
                          onClick={handleForceDownloadClick}
                          disabled={syncingAll}
                          className="btn-secondary border-amber-250 hover:border-amber-350 text-amber-600 dark:text-amber-450 hover:bg-amber-50 dark:hover:bg-amber-950/10 w-full py-2.5 text-xs font-bold flex justify-center gap-2 items-center"
                        >
                          <Download className="w-4 h-4 text-amber-500 animate-pulse" />
                          Gunakan Data Server (Timpa Data Lokal)
                        </button>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed">
                          Aksi ini mengunduh seluruh data dari Google Spreadsheet dan menimpa database lokal Anda secara paksa. Seluruh perubahan lokal yang belum disinkronkan akan dibuang.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Danger actions */}
                  <div className="flex flex-col gap-6">
                    {/* Card: Force Upload to Cloud */}
                    <div className="bg-slate-50 dark:bg-slate-955/25 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">Aksi Overwrite Cloud (Gunakan Data Lokal)</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5 leading-relaxed">
                          Paksa data di Google Spreadsheet diganti dengan data lokal Anda saat ini. Tindakan ini akan menimpa seluruh baris data di cloud.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        <button 
                          onClick={handleSyncTargets}
                          disabled={targets.length === 0 || syncingTargets || syncingAll}
                          className="btn-secondary flex justify-center gap-2 items-center font-bold text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingTargets ? 'animate-spin' : ''}`} />
                          Upload Target ({targets.length})
                        </button>
                        
                        <button 
                          onClick={handleSyncBankTo}
                          disabled={bankToTargets.length === 0 || syncingBankTo || syncingAll}
                          className="btn-secondary flex justify-center gap-2 items-center font-bold text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingBankTo ? 'animate-spin' : ''}`} />
                          Upload Bank TO ({bankToTargets.length})
                        </button>
                      </div>
                    </div>

                    {/* Card: Reset Database */}
                    <div className="bg-rose-50/50 dark:bg-rose-955/10 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl p-4 flex flex-col gap-3">
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-rose-600 dark:text-rose-455 tracking-wider">Hapus Seluruh Data Lokal ({localDatabaseSize})</h4>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5 leading-relaxed">
                          Aksi ini akan menghapus secara permanen seluruh cached target P2TL, data bank target operasi (TO), dan password pengguna dari browser Anda.
                        </p>
                      </div>

                      <button 
                        onClick={handleClearLocalDataClick}
                        className="btn-secondary border-rose-200 hover:border-rose-350 dark:border-rose-900/40 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 py-2.5 text-xs font-bold w-full flex justify-center items-center gap-2 cursor-pointer focus:outline-none"
                      >
                        <Trash2 className="w-4 h-4" />
                        Hapus Database Lokal
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Penyelarasan ke Google Sheets tidak aktif karena URL Backend belum dikonfigurasi.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Add/Edit User Dialog Modal --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsUserModalOpen(false)} />

          {/* Modal Card */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl w-full max-w-lg shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                {editingUser ? `Edit User: ${editingUser.username}` : 'Tambah User Baru'}
              </h3>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
              {userFormError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs text-rose-800 dark:text-rose-400 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span className="font-bold">{userFormError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama Pengguna (Username)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.username}
                    onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                    className="input-text text-sm pl-9" 
                    placeholder="Contoh: Petugas1"
                    disabled={!!editingUser}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kata Sandi (Password)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="input-text text-sm pl-9" 
                    placeholder="Masukkan kata sandi"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Role Akses</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="w-4 h-4 text-slate-400" />
                  </div>
                  <select 
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    className="input-text text-sm pl-9 cursor-pointer bg-white dark:bg-slate-800"
                  >
                    <option value="Petugas">Petugas</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nomor WhatsApp</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.whatsapp}
                    onChange={(e) => setUserForm({...userForm, whatsapp: e.target.value})}
                    className="input-text text-sm pl-9" 
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unit Kerja</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.unit}
                    onChange={(e) => setUserForm({...userForm, unit: e.target.value})}
                    className="input-text text-sm pl-9" 
                    placeholder="Contoh: ULP Salatiga Kota"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 pb-2">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs font-bold font-sans cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="btn-primary py-2 px-5 text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Backend Setup Guide Modal --- */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowSetupGuide(false)} />

          {/* Modal Card */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl w-full max-w-2xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Panduan Setup Backend Google Sheets
                </h3>
              </div>
              <button 
                onClick={() => setShowSetupGuide(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              <p>Untuk mengintegrasikan database spreadsheet ke aplikasi ini secara aman, ikuti langkah berikut:</p>
              
              <ol className="list-decimal list-inside flex flex-col gap-3.5">
                <li>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Buka/Buat Google Sheet Baru:</span>
                  <p className="pl-4 mt-0.5 text-[11px] text-slate-450 font-semibold">Buat file spreadsheet baru atau buka file spreadsheet Anda di browser.</p>
                </li>
                <li>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Akses Apps Script Editor:</span>
                  <p className="pl-4 mt-0.5 text-[11px] text-slate-450 font-semibold">Di bagian atas file, klik menu **Ekstensi (Extensions) -&gt; Apps Script**.</p>
                </li>
                <li>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Salin Kode Backend:</span>
                  <p className="pl-4 mt-0.5 text-[11px] text-slate-450 font-semibold">Salin seluruh isi file kode script backend Google Apps Script (`code.gs` yang ada pada repositori ini) ke editor Apps Script tersebut, menggantikan kode default yang kosong.</p>
                </li>
                <li>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Jalankan Setup Tabel:</span>
                  <p className="pl-4 mt-0.5 text-[11px] text-slate-450 font-semibold">Pilih fungsi `setupTables` di dropdown bagian atas editor Apps Script, lalu klik tombol **Jalankan (Run)**. Berikan izin otorisasi jika diminta. Tindakan ini akan membuat sheet **bank to** dan **data to** beserta struktur kolom headernya secara otomatis.</p>
                </li>
                <li>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Terapkan (Deploy) sebagai Aplikasi Web:</span>
                  <p className="pl-4 mt-0.5 text-[11px] text-slate-455">Klik tombol **Terapkan (Deploy) -&gt; Penerapan Baru (New Deployment)** di kanan atas:</p>
                  <p className="pl-4 text-[11px] text-slate-455 font-semibold">- Pilih jenis: **Aplikasi Web (Web App)**.</p>
                  <p className="pl-4 text-[11px] text-slate-455 font-semibold">- Jalankan sebagai (Execute as): **Saya sendiri (Me / email Anda)**.</p>
                  <p className="pl-4 text-[11px] text-slate-455 font-semibold">- Siapa yang memiliki akses (Who has access): **Siapa saja (Anyone)**.</p>
                  <p className="pl-4 mt-0.5 text-[11px] text-slate-455">Klik **Terapkan** dan salin **URL Aplikasi Web** yang diberikan.</p>
                </li>
                <li>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Masukkan URL di Kolom Pengaturan:</span>
                  <p className="pl-4 mt-0.5 text-[11px] text-slate-455 font-semibold">Tempelkan URL tersebut ke kolom input "Google Apps Script Web App URL" di halaman ini, lalu klik tombol **Simpan**.</p>
                </li>
              </ol>

              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl text-[11px] text-slate-500 font-bold mt-2">
                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">Note Penting CORS & Keamanan:</span>
                Koneksi berjalan langsung dari browser Anda via HTTP API aman ke Google Apps Script Anda secara terenkripsi (HTTPS). Aplikasi ini tidak menyimpan data Anda ke server eksternal selain Google Spreadsheet Anda sendiri.
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
              <button 
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="btn-primary py-2 px-6 text-xs font-bold font-sans cursor-pointer"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Custom Modal Alert/Confirm --- */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-scale-up flex flex-col gap-4 relative">
            <div className="flex gap-3.5 items-start">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                modalAlert.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' 
                  : modalAlert.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'
                  : modalAlert.type === 'warning' || modalAlert.type === 'confirm'
                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
                  : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450'
              }`}>
                {modalAlert.type === 'success' && <CheckCircle className="w-6 h-6" />}
                {modalAlert.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {(modalAlert.type === 'warning' || modalAlert.type === 'confirm') && <AlertTriangle className="w-6 h-6" />}
                {modalAlert.type === 'info' && <HelpCircle className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{modalAlert.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-medium">{modalAlert.message}</p>
              </div>
            </div>
            
            <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {modalAlert.onCancel && (
                <button 
                  onClick={modalAlert.onCancel}
                  className="btn-secondary py-1.5 px-4 text-xs font-bold font-sans cursor-pointer select-none"
                >
                  Batal
                </button>
              )}
              <button 
                onClick={modalAlert.onConfirm}
                className={`py-1.5 px-5 text-xs font-bold font-sans text-white rounded-xl shadow-md transition-all cursor-pointer select-none ${
                  modalAlert.type === 'error' || modalAlert.type === 'confirm'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                    : 'bg-blue-650 hover:bg-blue-700 shadow-blue-650/10'
                }`}
              >
                {modalAlert.type === 'confirm' ? 'Hapus' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

