import React, { useState, useEffect } from 'react';
import { Settings, Database, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, Save, HelpCircle, Building } from 'lucide-react';

export default function SettingsPanel({ 
  backendUrl: propBackendUrl, 
  onSaveBackendUrl, 
  onSyncAll,
  targets = [],
  bankToTargets = []
}) {
  const [url, setUrl] = useState(propBackendUrl || '');
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testMessage, setTestMessage] = useState('');
  const [syncingTargets, setSyncingTargets] = useState(false);
  const [syncingBankTo, setSyncingBankTo] = useState(false);
  
  // Local metadata parameters
  const [defaultUlp, setDefaultUlp] = useState(() => localStorage.getItem('p2tl_default_ulp') || 'ULP SALATIGA KOTA');
  const [defaultUp3, setDefaultUp3] = useState(() => localStorage.getItem('p2tl_default_up3') || 'UP3 SALATIGA');
  const [saveMetadataStatus, setSaveMetadataStatus] = useState(false);

  // Working days checklist state
  const [workingDays, setWorkingDays] = useState(() => {
    const saved = localStorage.getItem('p2tl_working_days_checklist');
    return saved ? JSON.parse(saved) : { monFri: true, sat: true, sun: true };
  });
  const [saveDaysStatus, setSaveDaysStatus] = useState(false);

  // Keep local state in sync with props
  useEffect(() => {
    setUrl(propBackendUrl || '');
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
    localStorage.setItem('p2tl_default_ulp', defaultUlp.trim().toUpperCase());
    localStorage.setItem('p2tl_default_up3', defaultUp3.trim().toUpperCase());
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

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in-up">
      
      {/* --- Connection Status Banner --- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4 items-center">
          <div className={`p-3 rounded-2xl shrink-0 ${
            propBackendUrl 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' 
              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
          }`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Status Database</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {propBackendUrl 
                ? `Terhubung ke Google Sheets API via Web App.` 
                : 'Mode Offline (Semua data disimpan di cache browser Local Storage).'}
            </p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
          propBackendUrl 
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20' 
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/20'
        }`}>
          {propBackendUrl ? 'Google Sheets' : 'Local Storage'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* --- Left Column: Form & Config (7 cols) --- */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Card 1: Google Sheets URL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Database className="w-4.5 h-4.5 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Google Spreadsheet Database</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Google Apps Script Web App URL</label>
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

          {/* Card 2: Manual Sync Overwrite */}
          {propBackendUrl && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <RefreshCw className="w-4.5 h-4.5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Penyelarasan Data Manual</h3>
              </div>

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-400">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Perhatian Upload Overwrite</p>
                  <p className="mt-0.5 leading-relaxed font-medium">Aksi di bawah ini akan mengirim seluruh database lokal yang tersimpan di browser Anda saat ini ke Google Spreadsheet dan **menimpa (overwrite)** baris yang ada di spreadsheet.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <button 
                  onClick={handleSyncTargets}
                  disabled={syncingTargets}
                  className="btn-secondary flex justify-center gap-2 items-center font-bold text-xs py-2.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingTargets ? 'animate-spin' : ''}`} />
                  Upload Target ({targets.length} Baris)
                </button>
                <button 
                  onClick={handleSyncBankTo}
                  disabled={syncingBankTo}
                  className="btn-secondary flex justify-center gap-2 items-center font-bold text-xs py-2.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingBankTo ? 'animate-spin' : ''}`} />
                  Upload Bank TO ({bankToTargets.length} Baris)
                </button>
              </div>
            </div>
          )}

          {/* Card 3: Default Metadata Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Building className="w-4.5 h-4.5 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Pengaturan Unit Kerja PLN</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Default Unit Layanan (ULP)</label>
                <input 
                  type="text" 
                  value={defaultUlp} 
                  onChange={(e) => setDefaultUlp(e.target.value)}
                  className="input-text text-xs" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Default Area (UP3)</label>
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
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Pengaturan Hari Kerja</h3>
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
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Panduan Setup Backend</h3>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-col gap-3.5 leading-relaxed font-medium">
            <p>Untuk mengintegrasikan database spreadsheet ke aplikasi ini secara aman, ikuti langkah berikut:</p>
            
            <ol className="list-decimal list-inside flex flex-col gap-2.5">
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Buka Spreadsheet Anda:</span>
                <p className="pl-4 mt-0.5 text-[11px] text-slate-450">Buka file Google Sheet Anda di browser.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Akses Apps Script Editor:</span>
                <p className="pl-4 mt-0.5 text-[11px] text-slate-450">Klik menu **Ekstensi (Extensions) -&gt; Apps Script** di bagian atas.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Salin Kode Backend:</span>
                <p className="pl-4 mt-0.5 text-[11px] text-slate-450">Salin kode script backend Google Apps Script yang tercantum di file `implementation_plan.md` proyek ini ke editor tersebut.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Jalankan Setup Tabel:</span>
                <p className="pl-4 mt-0.5 text-[11px] text-slate-450">Pilih fungsi `setupTables` di bagian atas editor, lalu klik tombol **Jalankan (Run)**. Spreadsheet Anda otomatis akan membuat sheet **bank to** dan **data to** beserta kolom headernya.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Deploy sebagai Web App:</span>
                <p className="pl-4 mt-0.5 text-[11px] text-slate-450">Klik **Terapkan (Deploy) -&gt; Penerapan Baru (New Deployment)**.</p>
                <p className="pl-4 text-[11px] text-slate-450">- Pilih jenis: **Aplikasi Web (Web App)**.</p>
                <p className="pl-4 text-[11px] text-slate-450">- Jalankan sebagai: **Saya sendiri (Me)**.</p>
                <p className="pl-4 text-[11px] text-slate-450">- Siapa yang memiliki akses: **Siapa saja (Anyone)**.</p>
              </li>
              <li>
                <span className="font-bold text-slate-800 dark:text-slate-200">Tempel URL di Sini:</span>
                <p className="pl-4 mt-0.5 text-[11px] text-slate-450">Salin URL Web App yang dihasilkan setelah deploy, tempelkan ke kolom input di halaman ini, lalu klik **Simpan**.</p>
              </li>
            </ol>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl text-[11px] text-slate-500">
              <span className="font-bold text-blue-600 dark:text-blue-400 block mb-0.5">Note:</span>
              Koneksi ini berjalan secara langsung di browser Anda via pemanggilan HTTP API aman ke infrastruktur Google Cloud tanpa perantara server luar.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
