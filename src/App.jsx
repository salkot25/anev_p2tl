import React, { useState, useEffect } from 'react';
import { 
  CheckCircle,
  X
} from 'lucide-react';
import initialData from './data/initialData.json';
import bankToData from './data/bankToData.json';
import DashboardPanel from './components/DashboardPanel';
import DataList from './components/DataList';
import BankToPanel from './components/BankToPanel';
import LaporanPanel from './components/LaporanPanel';
import SettingsPanel from './components/SettingsPanel';
import DetailDrawer from './components/DetailDrawer';
import Layout from './components/Layout';
import Login from './components/Login';


const normalizeData = (dataList) => {
  if (!Array.isArray(dataList)) return [];
  return dataList.map((item, idx) => ({
    No: item.No || (idx + 1),
    IDPel: String(item.IDPel || item.idPel || '').split('.')[0],
    NamaPelanggan: item.NamaPelanggan || item['Nama Pelanggan'] || 'Tanpa Nama',
    Tarif: item.Tarif || '',
    Daya: parseInt(item.Daya, 10) || 0,
    Gardu: item.Gardu || '',
    Tiang: item.Tiang || '',
    ULP: item.ULP || 'ULP SALATIGA KOTA',
    UP3: item.UP3 || 'UP3 SALATIGA',
    DLPD: item.DLPD || '',
    SubDLPD: item.SubDLPD || item['Sub DLPD'] || '',
    TanggalUpload: item.TanggalUpload || item['Tanggal Upload'] || '',
    ReguPetugas: item.ReguPetugas || item['Regu Petugas'] || '',
    TanggalOrder: item.TanggalOrder || item['Tanggal Order'] || '',
    TanggalPelaksanaan: item.TanggalPelaksanaan || item['Tanggal Pelaksanaan'] || '',
    StatusProgress: item.StatusProgress || item['Status Progress'] || 'Target Operasi',
    DurasiMenit: parseInt(item.DurasiMenit !== undefined ? item.DurasiMenit : item['Durasi (Menit)'], 10) || 0,
    Sumber: item.Sumber || 'DLPD',
    bank_id: item.bank_id || item.bankId || ''
  }));
};

const normalizeBankToData = (dataList) => {
  if (!Array.isArray(dataList)) return [];
  return dataList.map((item, idx) => {
    const jenisTo = item.JENIS_TO || item['JENIS TO'] || 'Target Operasi';
    const jamNyala = item.JAM_NYALA !== undefined ? item.JAM_NYALA : (item['JAM NYALA'] !== undefined ? item['JAM NYALA'] : '');
    return {
      No: item.No || (idx + 1),
      IDPEL: String(item.IDPEL || item.IDPel || item.idpel || '').split('.')[0],
      NAMA: item.NAMA || item.Nama || item.NamaPelanggan || item['Nama Pelanggan'] || 'Tanpa Nama',
      ALAMAT: item.ALAMAT || item.Alamat || item.alamat || '',
      TARIF: item.TARIF || item.Tarif || '',
      DAYA: parseInt(item.DAYA !== undefined ? item.DAYA : (item.Daya !== undefined ? item.Daya : 0), 10) || 0,
      GARDU: item.GARDU || item.Gardu || '',
      TIANG: item.TIANG || item.Tiang || '',
      UNIT: parseInt(item.UNIT !== undefined ? item.UNIT : (item.Unit !== undefined ? item.Unit : 52351), 10) || 52351,
      JAM_NYALA: jamNyala,
      JENIS_TO: jenisTo,
      LATITUDE: parseFloat(item.LATITUDE !== undefined ? item.LATITUDE : (item.Latitude !== undefined ? item.Latitude : 0)) || 0,
      LONGITUDE: parseFloat(item.LONGITUDE !== undefined ? item.LONGITUDE : (item.Longitude !== undefined ? item.Longitude : 0)) || 0,
      SUBDLPD: item.SUBDLPD || item.SubDLPD || item['Sub DLPD'] || ''
    };
  });
};

export default function App() {
  const [targets, setTargets] = useState([]);
  const [bankToTargets, setBankToTargets] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, laporan, bankto, list, pengaturan
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [backendUrl, setBackendUrl] = useState(() => {
    return localStorage.getItem('p2tl_backend_url') || '';
  });

  // Authentication session state mockup
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('p2tl_auth_session') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('p2tl_auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Sync helper: push targets (data to) to the backend
  const syncTargetsWithBackend = async (newTargets) => {
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (!url) return;
    try {
      const response = await fetch(`${url}?action=syncDataTo`, {
        method: 'POST',
        body: JSON.stringify({ data: newTargets }),
        headers: { 'Content-Type': 'text/plain' } // Avoid OPTIONS preflight check CORS issue
      });
      const result = await response.json();
      if (result.status !== 'success') {
        console.error('Gagal sinkronisasi data target ke cloud:', result.message);
      }
    } catch (err) {
      console.error('Koneksi gagal saat menyelaraskan data target:', err);
    }
  };

  // Sync helper: push bank TO data to the backend
  const syncBankToWithBackend = async (newBankTo) => {
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (!url) return;
    try {
      const response = await fetch(`${url}?action=syncBankTo`, {
        method: 'POST',
        body: JSON.stringify({ data: newBankTo }),
        headers: { 'Content-Type': 'text/plain' } // Avoid OPTIONS preflight check CORS issue
      });
      const result = await response.json();
      if (result.status !== 'success') {
        console.error('Gagal sinkronisasi Bank TO ke cloud:', result.message);
      }
    } catch (err) {
      console.error('Koneksi gagal saat menyelaraskan Bank TO:', err);
    }
  };

  // Cloud pull helper
  const fetchCloudData = async (urlToUse) => {
    if (!urlToUse) return;
    try {
      const response = await fetch(`${urlToUse}?action=readAll`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json();
      if (result.status === 'success') {
        const normalizedTargets = normalizeData(result.targets || []);
        const normalizedBankTo = normalizeBankToData(result.bankTo || []);
        
        setTargets(normalizedTargets);
        setBankToTargets(normalizedBankTo);
        
        localStorage.setItem('p2tl_targets', JSON.stringify(normalizedTargets));
        localStorage.setItem('p2tl_bank_to', JSON.stringify(normalizedBankTo));
        
        showToast('Database disinkronkan dari Google Sheets!', 'success');
      } else {
        showToast('Gagal memuat data dari cloud: ' + (result.message || 'Format tidak dikenal'), 'error');
      }
    } catch (err) {
      console.warn('Backend URL is defined but connection failed. Using local storage data.', err);
      showToast('Koneksi cloud gagal. Menggunakan database lokal.', 'warning');
    }
  };

  const handleSaveBackendUrl = (url) => {
    setBackendUrl(url);
    localStorage.setItem('p2tl_backend_url', url);
    showToast('URL Backend berhasil disimpan.', 'success');
  };

  // Load initial data from localStorage or seed file
  useEffect(() => {
    const saved = localStorage.getItem('p2tl_targets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const normalized = normalizeData(parsed);
        setTargets(normalized);
        localStorage.setItem('p2tl_targets', JSON.stringify(normalized));
      } catch {
        const normalized = normalizeData(initialData);
        setTargets(normalized);
        localStorage.setItem('p2tl_targets', JSON.stringify(normalized));
      }
    } else {
      const normalized = normalizeData(initialData);
      setTargets(normalized);
      localStorage.setItem('p2tl_targets', JSON.stringify(normalized));
    }

    const savedBankTo = localStorage.getItem('p2tl_bank_to');
    if (savedBankTo) {
      try {
        const parsed = JSON.parse(savedBankTo);
        const normalized = normalizeBankToData(parsed);
        setBankToTargets(normalized);
        localStorage.setItem('p2tl_bank_to', JSON.stringify(normalized));
      } catch {
        const normalized = normalizeBankToData(bankToData);
        setBankToTargets(normalized);
        localStorage.setItem('p2tl_bank_to', JSON.stringify(normalized));
      }
    } else {
      const normalized = normalizeBankToData(bankToData);
      setBankToTargets(normalized);
      localStorage.setItem('p2tl_bank_to', JSON.stringify(normalized));
    }

    // Set dark mode from preference or default
    const savedTheme = localStorage.getItem('p2tl_theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Sync from cloud on mount or when backend URL is configured
  useEffect(() => {
    if (backendUrl) {
      fetchCloudData(backendUrl);
    }
  }, [backendUrl]);

  // Sync dark class on documentElement
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('p2tl_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('p2tl_theme', 'light');
    }
  }, [darkMode]);

  // Handle Theme switching from layout callback
  const handleThemeChange = (updater) => {
    if (typeof updater === 'function') {
      setDarkMode(prev => {
        const nextStr = updater(prev ? 'dark' : 'light');
        return nextStr === 'dark';
      });
    } else {
      setDarkMode(updater === 'dark');
    }
  };

  // Login handler
  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('p2tl_auth_session', 'true');
    localStorage.setItem('p2tl_auth_user', JSON.stringify(user));
    showToast(`Selamat datang kembali, ${user.name}!`, 'success');
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('p2tl_auth_session');
    localStorage.removeItem('p2tl_auth_user');
    setActiveTab('dashboard');
    showToast('Anda berhasil keluar dari sistem.', 'success');
  };

  // Show auto-dismiss toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Handle uploaded data (merge or overwrite)
  const handleDataLoaded = (newData, mode) => {
    let formatted;
    if (mode === 'overwrite') {
      formatted = newData.map((item, idx) => ({ ...item, No: idx + 1 }));
      setTargets(formatted);
      localStorage.setItem('p2tl_targets', JSON.stringify(formatted));
      showToast(`Berhasil mengganti seluruh data (${formatted.length} target dimasukkan).`, 'success');
    } else {
      // Merge: match by IDPel.
      const existingMap = new Map(targets.map(item => [String(item.IDPel), item]));
      
      let added = 0;
      let updated = 0;
      
      newData.forEach(item => {
        const idStr = String(item.IDPel);
        if (existingMap.has(idStr)) {
          // Keep old number but replace content
          const existing = existingMap.get(idStr);
          existingMap.set(idStr, { ...item, No: existing.No });
          updated++;
        } else {
          existingMap.set(idStr, { ...item, No: existingMap.size + 1 });
          added++;
        }
      });
      
      formatted = Array.from(existingMap.values());
      setTargets(formatted);
      localStorage.setItem('p2tl_targets', JSON.stringify(formatted));
      showToast(`Sinkronisasi selesai! ${added} data baru ditambahkan, ${updated} data lama diperbarui.`, 'success');
    }
    
    // Auto sync to cloud
    syncTargetsWithBackend(formatted);
  };

  // Manually add record
  const handleAddRecord = (record) => {
    const updatedList = [
      ...targets,
      { ...record, No: targets.length + 1 }
    ];
    setTargets(updatedList);
    localStorage.setItem('p2tl_targets', JSON.stringify(updatedList));
    showToast('Target P2TL baru berhasil ditambahkan secara manual.', 'success');
    
    // Auto sync to cloud
    syncTargetsWithBackend(updatedList);
  };

  // Handle uploaded bank to data (merge or overwrite)
  const handleBankToDataLoaded = (newData, mode) => {
    const normalized = normalizeBankToData(newData);
    let formatted;
    if (mode === 'overwrite') {
      formatted = normalized.map((item, idx) => ({ ...item, No: idx + 1 }));
      setBankToTargets(formatted);
      localStorage.setItem('p2tl_bank_to', JSON.stringify(formatted));
      showToast(`Berhasil mengganti seluruh data Bank TO (${formatted.length} target dimasukkan).`, 'success');
    } else {
      // Merge: match by IDPEL
      const existingMap = new Map(bankToTargets.map(item => [String(item.IDPEL), item]));
      
      let added = 0;
      let updated = 0;
      
      normalized.forEach(item => {
        const idStr = String(item.IDPEL);
        if (existingMap.has(idStr)) {
          const existing = existingMap.get(idStr);
          existingMap.set(idStr, { ...item, No: existing.No });
          updated++;
        } else {
          existingMap.set(idStr, { ...item, No: existingMap.size + 1 });
          added++;
        }
      });
      
      formatted = Array.from(existingMap.values());
      setBankToTargets(formatted);
      localStorage.setItem('p2tl_bank_to', JSON.stringify(formatted));
      showToast(`Sinkronisasi Bank TO selesai! ${added} data baru ditambahkan, ${updated} data lama diperbarui.`, 'success');
    }

    // Auto sync to cloud
    syncBankToWithBackend(formatted);
  };

  // Manually add Bank TO record
  const handleBankToAddRecord = (record) => {
    const updatedList = [
      ...bankToTargets,
      { ...record, No: bankToTargets.length + 1 }
    ];
    setBankToTargets(updatedList);
    localStorage.setItem('p2tl_bank_to', JSON.stringify(updatedList));
    showToast('Target Bank TO baru berhasil ditambahkan secara manual.', 'success');

    // Auto sync to cloud
    syncBankToWithBackend(updatedList);
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const menuTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'laporan', label: 'Laporan' },
    { id: 'bankto', label: 'Bank TO' },
    { id: 'list', label: 'Data Target' },
    { id: 'pengaturan', label: 'Pengaturan' }
  ];

  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin}
        title="Anev P2TL"
        subtitle="PLN Unit Pelaksana Pelayanan Pelanggan Salatiga"
        copyright="© 2026 PLN Salatiga. All rights reserved."
      />
    );
  }

  return (
    <Layout
      currentTab={activeTab}
      setCurrentTab={setActiveTab}
      onLogout={handleLogout}
      theme={darkMode ? 'dark' : 'light'}
      setTheme={handleThemeChange}
      tabsList={menuTabs}
      appName="Anev P2TL"
      appSubtitle="PLN Salatiga"
      userName={currentUser?.name || "Admin"}
      userRole={currentUser?.role || "Administrator"}
    >
      {/* Switch content based on activeTab */}
      {activeTab === 'dashboard' ? (
        <div className="animate-fade-in-up">
          <DashboardPanel backendUrl={backendUrl} />
        </div>
      ) : activeTab === 'bankto' ? (
        <div className="animate-fade-in-up">
          <BankToPanel 
            targets={bankToTargets}
            realizedTargets={targets}
            onDataLoaded={handleBankToDataLoaded}
            onAddRecord={handleBankToAddRecord}
          />
        </div>
      ) : activeTab === 'laporan' ? (
        <div className="animate-fade-in-up">
          <LaporanPanel targets={targets} backendUrl={backendUrl} />
        </div>
      ) : activeTab === 'pengaturan' ? (
        <div className="animate-fade-in-up">
          <SettingsPanel 
            backendUrl={backendUrl}
            onSaveBackendUrl={handleSaveBackendUrl}
            targets={targets}
            bankToTargets={bankToTargets}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm animate-fade-in-up">
          <DataList 
            targets={targets} 
            onSelectRecord={handleSelectRecord}
            onAddRecord={handleAddRecord}
            onDataLoaded={handleDataLoaded}
          />
        </div>
      )}

      {/* Floating toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 w-[90%] max-w-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl rounded-2xl p-4 flex items-center justify-between border border-slate-800 dark:border-slate-100 animate-toast">
          <div className="flex gap-3 items-center">
            <div className="p-1 bg-emerald-500 text-white rounded-lg flex-shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold font-sans text-slate-100 dark:text-slate-800 pr-1">
              {toast.message}
            </p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="p-1 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg text-slate-400 dark:text-slate-500 transition-colors focus:outline-none cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile Drawer (Details sheet) / Desktop side panel */}
      <DetailDrawer 
        target={selectedRecord} 
        isOpen={isDrawerOpen} 
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRecord(null);
        }} 
      />

    </Layout>
  );
}
