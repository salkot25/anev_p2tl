import { useState, useEffect, useMemo } from 'react';
import { Database, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, Save, HelpCircle, Building, Trash2, UserPlus, Edit, Search, User, Key, Phone, Shield, X } from 'lucide-react';

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
  onSaveMetadata
}) {
  const [url, setUrl] = useState(propBackendUrl || '');
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testMessage, setTestMessage] = useState('');
  const [syncingTargets, setSyncingTargets] = useState(false);
  const [syncingBankTo, setSyncingBankTo] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
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
  const [defaultUlp, setDefaultUlp] = useState(ulp);
  const [defaultUp3, setDefaultUp3] = useState(up3);
  const [saveMetadataStatus, setSaveMetadataStatus] = useState(false);

  useEffect(() => {
    setDefaultUlp(ulp);
  }, [ulp]);

  useEffect(() => {
    setDefaultUp3(up3);
  }, [up3]);

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
      alert("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }
    const adminCount = users.filter(u => u.role === 'Administrator').length;
    const targetUser = users.find(u => u.username.toLowerCase() === usernameToDelete.toLowerCase());
    if (targetUser?.role === 'Administrator' && adminCount <= 1) {
      alert("Sistem membutuhkan setidaknya satu Administrator. Anda tidak dapat menghapus administrator terakhir.");
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus user ${usernameToDelete}?`)) {
      const updated = users.filter(u => u.username.toLowerCase() !== usernameToDelete.toLowerCase());
      onUsersChanged(updated);
    }
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
        alert('Data Target berhasil diunggah ke Google Sheet.');
      } else {
        alert('Gagal menyelaraskan: ' + result.message);
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi: ' + err.message);
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
        alert('Data Bank TO berhasil diunggah ke Google Sheet.');
      } else {
        alert('Gagal menyelaraskan: ' + result.message);
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi: ' + err.message);
    } finally {
      setSyncingBankTo(false);
    }
  };

  const handleSyncAll = async () => {
    if (!propBackendUrl || !onSyncAll) return;
    setSyncingAll(true);
    try {
      await onSyncAll(propBackendUrl);
      alert('Sinkronisasi dua arah (sesuai waktu terbaru) selesai dengan sukses!');
    } catch (err) {
      alert('Gagal menyelaraskan database: ' + err.message);
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in-up">
      
      {/* --- Connection Status Banner --- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className={`p-3 rounded-2xl shrink-0 ${
            propBackendUrl 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' 
              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
          }`}>
            <Database className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Status Database</h3>
              <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider border ${
                propBackendUrl 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20' 
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/20'
              }`}>
                {propBackendUrl ? 'Google Sheets' : 'Local Storage'}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span>
                {propBackendUrl 
                  ? `Terhubung ke Google Sheets API via Web App.` 
                  : 'Mode Offline (Semua data disimpan di cache browser Local Storage).'}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Ukuran Database Lokal: {localDatabaseSize}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* --- Left Column: Form & Config (7 cols) --- */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Card 1: Google Sheets URL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Database className="w-4.5 h-4.5 text-blue-500" />
              <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Google Spreadsheet Database</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Google Apps Script Web App URL</label>
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
                  className="btn-primary py-2 px-4 text-xs font-sans font-bold flex gap-2 items-center"
                >
                  <Save className="w-4.5 h-4.5" />
                  Simpan
                </button>
              </div>
            </div>

            {/* Test Connection Output */}
            {testStatus !== 'idle' && (
              <div className={`p-4 border rounded-2xl flex items-start gap-3 text-xs ${
                testStatus === 'testing' 
                  ? 'bg-slate-50 border-slate-150 text-slate-600 dark:bg-slate-950/20 dark:border-slate-850 dark:text-slate-400'
                  : testStatus === 'success'
                  ? 'bg-emerald-50 border-emerald-150 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
                  : 'bg-rose-50 border-rose-150 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450'
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

            {propBackendUrl && (
              <button 
                onClick={handleTestConnection}
                className="btn-secondary w-full py-2.5 text-xs font-bold flex justify-center gap-2 items-center"
                disabled={testStatus === 'testing'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                Test Ulang Koneksi
              </button>
            )}
          </div>

          {/* Card 2: Manual Sync & Clear Local Data */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <RefreshCw className="w-4.5 h-4.5 text-blue-500" />
              <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Penyelarasan Data Manual</h3>
            </div>

            {propBackendUrl ? (
              <>
                <div className="flex flex-col gap-2.5">
                  <button 
                    onClick={handleSyncAll}
                    disabled={syncingAll}
                    className="btn-primary w-full py-2.5 text-xs font-bold flex justify-center gap-2 items-center"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                    Mulai Sinkronisasi Dua Arah (Sesuai Waktu Terbaru)
                  </button>
                  <p className="text-[8px] sm:text-xs text-slate-400 dark:text-slate-500 font-bold italic -mt-1 text-center">
                    *Merekomendasikan aksi ini untuk menghindari data tertimpa jika ada pembaruan dari perangkat lain.
                  </p>
                </div>

                <div className="mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-black flex items-center gap-1 cursor-pointer transition-colors focus:outline-none select-none"
                  >
                    {showAdvanced ? '▼ Sembunyikan Opsi Overwrite Manual' : '► Tampilkan Opsi Overwrite Manual (Tindakan Bahaya)'}
                  </button>

                  {showAdvanced && (targets.length > 0 || bankToTargets.length > 0) && (
                    <div className="flex flex-col gap-4 mt-3 animate-fade-in">
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-400">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Aksi Overwrite Cadangan (Upload Manual)</p>
                          <p className="mt-0.5 leading-relaxed font-medium">Gunakan tombol di bawah ini jika Anda ingin memaksa database cloud diganti dengan seluruh baris lokal Anda saat ini.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {targets.length > 0 && (
                          <button 
                            onClick={handleSyncTargets}
                            disabled={syncingTargets}
                            className="btn-secondary flex justify-center gap-2 items-center font-bold text-xs py-2.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingTargets ? 'animate-spin' : ''}`} />
                            Upload Target ({targets.length} Baris)
                          </button>
                        )}
                        {bankToTargets.length > 0 && (
                          <button 
                            onClick={handleSyncBankTo}
                            disabled={syncingBankTo}
                            className="btn-secondary flex justify-center gap-2 items-center font-bold text-xs py-2.5"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingBankTo ? 'animate-spin' : ''}`} />
                            Upload Bank TO ({bankToTargets.length} Baris)
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Penyelarasan ke Google Sheets tidak aktif karena URL Backend belum dikonfigurasi.
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col gap-3">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-455">
                <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Hapus Seluruh Data Lokal ({localDatabaseSize})</p>
                  <p className="mt-0.5 leading-relaxed font-medium">Aksi ini akan menghapus permanen semua target dan bank TO yang disimpan secara lokal di browser ini sebesar **{localDatabaseSize}**.</p>
                </div>
              </div>

              <button 
                onClick={onClearLocalData}
                className="btn-secondary border-rose-200 hover:border-rose-350 dark:border-rose-900/40 text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-950/20 py-2.5 text-xs font-bold w-full flex justify-center items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Database Lokal
              </button>
            </div>
          </div>

          {/* Card 3: Default Metadata Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Building className="w-4.5 h-4.5 text-blue-500" />
              <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Pengaturan Unit Kerja PLN</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Default Unit Layanan (ULP)</label>
                <input 
                  type="text" 
                  value={defaultUlp} 
                  onChange={(e) => setDefaultUlp(e.target.value)}
                  className="input-text text-xs" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Default Area (UP3)</label>
                <input 
                  type="text" 
                  value={defaultUp3} 
                  onChange={(e) => setDefaultUp3(e.target.value)}
                  className="input-text text-xs" 
                />
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

          {/* Card 4: Working Days Checklist */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <RefreshCw className="w-4.5 h-4.5 text-blue-500 animate-spin-slow" />
              <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Pengaturan Hari Kerja</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Tentukan hari kerja aktif untuk membagi target kWh bulanan menjadi target harian (breakdown target harian):
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 my-1 bg-slate-50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
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

        {/* --- Right Column: Instructions Guide (5 cols) --- */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <HelpCircle className="w-4.5 h-4.5 text-blue-500" />
            <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Panduan Setup Backend</h3>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-col gap-3.5 leading-relaxed font-medium">
            <p>Untuk mengintegrasikan database spreadsheet ke aplikasi ini secara aman, ikuti langkah berikut:</p>
            
            <ol className="list-decimal list-inside flex flex-col gap-2.5">
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Buka Spreadsheet Anda:</span>
                <p className="pl-4 mt-0.5 text-[10px] sm:text-xs text-slate-450 font-semibold">Buka file Google Sheet Anda di browser.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Akses Apps Script Editor:</span>
                <p className="pl-4 mt-0.5 text-[10px] sm:text-xs text-slate-450 font-semibold">Klik menu **Ekstensi (Extensions) -&gt; Apps Script** di bagian atas.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Salin Kode Backend:</span>
                <p className="pl-4 mt-0.5 text-[10px] sm:text-xs text-slate-450 font-semibold">Salin kode script backend Google Apps Script yang tercantum di file `implementation_plan.md` proyek ini ke editor tersebut.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Jalankan Setup Tabel:</span>
                <p className="pl-4 mt-0.5 text-[10px] sm:text-xs text-slate-450 font-semibold">Jalankan Setup Tabel: Pilih fungsi `setupTables` di bagian atas editor, lalu klik tombol **Jalankan (Run)**. Spreadsheet Anda otomatis akan membuat sheet **bank to** dan **data to** beserta kolom headernya.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Deploy sebagai Web App:</span>
                <p className="pl-4 mt-0.5 text-[11px] text-slate-450">Klik **Terapkan (Deploy) -&gt; Penerapan Baru (New Deployment)**.</p>
                <p className="pl-4 text-[10px] sm:text-xs text-slate-450 font-semibold">- Pilih jenis: **Aplikasi Web (Web App)**.</p>
                <p className="pl-4 text-[10px] sm:text-xs text-slate-450 font-semibold">- Jalankan sebagai: **Saya sendiri (Me)**.</p>
                <p className="pl-4 text-[10px] sm:text-xs text-slate-450 font-semibold">- Siapa yang memiliki akses: **Siapa saja (Anyone)**.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Tempel URL di Sini:</span>
                <p className="pl-4 mt-0.5 text-[10px] sm:text-xs text-slate-450 font-semibold">Salin URL Web App yang dihasilkan setelah deploy, tempelkan ke kolom input di halaman ini, lalu klik **Simpan**.</p>
              </li>
            </ol>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl text-[10px] sm:text-xs text-slate-500 font-bold">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">Note:</span>
              Koneksi ini berjalan secara langsung di browser Anda via pemanggilan HTTP API aman ke infrastruktur Google Cloud tanpa perantara server luar.
            </div>
          </div>
        </div>

      </div>

      {/* --- User Management Section (Admin Only) --- */}
      {currentUser?.role === 'Administrator' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col gap-6 mt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Manajemen Pengguna</h3>
                <p className="text-[8px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Kelola akun akses, kata sandi, dan role petugas di database cloud.</p>
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

          {/* Search bar & statistics */}
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
              Total Terdaftar: <span className="text-blue-600 dark:text-blue-400">{users.length}</span> Pengguna
            </div>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map((user) => {
              const isAdminUser = user.role === 'Administrator';
              const isSelf = user.username.toLowerCase() === currentUser?.name?.toLowerCase();
              return (
                <div 
                  key={user.username}
                  className="group bg-slate-50 dark:bg-slate-950/10 hover:bg-white dark:hover:bg-slate-900 border border-slate-150 dark:border-slate-800/40 hover:border-blue-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden"
                >
                  {isSelf && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] sm:text-[10px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wide">
                      Anda
                    </div>
                  )}

                  <div className="flex gap-3 items-center">
                    {/* User Initials Avatar with Gradient */}
                    <div className={`w-10 h-10 rounded-xl font-bold font-sans text-sm flex items-center justify-center text-white bg-gradient-to-br ${
                      isAdminUser ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-650'
                    }`}>
                      {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{user.username}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black border uppercase shrink-0 ${
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
                          className="hover:underline hover:text-emerald-500 font-semibold"
                        >
                          {user.whatsapp}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 font-medium">
                      <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-500 dark:text-slate-550 truncate animate-pulse" title={user.password}>
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
                          className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-455 rounded-lg transition-colors cursor-pointer focus:outline-none"
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
      )}

      {/* --- Add/Edit User Dialog Modal --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-up relative">
            <button 
              onClick={() => setIsUserModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors focus:outline-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xs sm:text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
              {editingUser ? `Edit User: ${editingUser.username}` : 'Tambah User Baru'}
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {userFormError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs text-rose-800 dark:text-rose-400 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                  <span className="font-bold">{userFormError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nama Pengguna (Username)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.username}
                    onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                    className="input-text text-xs pl-9" 
                    placeholder="Contoh: Petugas1"
                    disabled={!!editingUser}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Kata Sandi (Password)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.password}
                    onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                    className="input-text text-xs pl-9" 
                    placeholder="Masukkan kata sandi"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Role Akses</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="w-4 h-4 text-slate-400" />
                  </div>
                  <select 
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    className="input-text text-xs pl-9 cursor-pointer"
                  >
                    <option value="Petugas">Petugas</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nomor WhatsApp</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.whatsapp}
                    onChange={(e) => setUserForm({...userForm, whatsapp: e.target.value})}
                    className="input-text text-xs pl-9" 
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[8px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide">Unit Kerja</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="w-4 h-4 text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={userForm.unit}
                    onChange={(e) => setUserForm({...userForm, unit: e.target.value})}
                    className="input-text text-xs pl-9" 
                    placeholder="Contoh: ULP Salatiga Kota"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button 
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs font-bold font-sans"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="btn-primary py-2 px-5 text-xs font-bold font-sans flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Simpan User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
