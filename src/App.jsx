import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  CheckCircle,
  X,
  AlertTriangle
} from 'lucide-react';
// Hardcoded mock data imports removed
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
    bank_id: item.bank_id || item.bankId || '',
    lastUpdated: item.lastUpdated || item.last_updated || item.LAST_UPDATED || item.LastUpdated || new Date(0).toISOString()
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
      SUBDLPD: item.SUBDLPD || item.SubDLPD || item['Sub DLPD'] || '',
      lastUpdated: item.lastUpdated || item.last_updated || item.LAST_UPDATED || item.LastUpdated || new Date(0).toISOString()
    };
  });
};

const normalizeUsersData = (dataList) => {
  if (!Array.isArray(dataList)) return [];
  return dataList.map((item) => ({
    username: String(item.username || item.Username || item['Nama User'] || item.NamaUser || '').trim(),
    password: String(item.password || item.Password || ''),
    role: String(item.role || item.Role || 'Petugas'),
    whatsapp: String(item.whatsapp || item.Whatsapp || item['Nomor Whatsapp'] || item.whatsappNumber || '').trim(),
    unit: String(item.unit || item.Unit || 'Salatiga Kota').trim(),
    lastUpdated: item.lastUpdated || item.last_updated || item.LAST_UPDATED || item.LastUpdated || new Date(0).toISOString()
  })).filter(u => u.username);
};

export default function App() {
  const [targets, setTargets] = useState(() => {
    try {
      const saved = localStorage.getItem('p2tl_targets');
      if (saved) return normalizeData(JSON.parse(saved));
    } catch (e) {
      console.error('Gagal memuat local targets cache:', e);
    }
    return [];
  });
  const [bankToTargets, setBankToTargets] = useState(() => {
    try {
      const saved = localStorage.getItem('p2tl_bank_to');
      if (saved) return normalizeBankToData(JSON.parse(saved));
    } catch (e) {
      console.error('Gagal memuat local bank to cache:', e);
    }
    return [];
  });
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('p2tl_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeUsersData(parsed);
        }
      }
    } catch (e) {
      console.error('Gagal memuat local users cache:', e);
    }
    return [{
      username: 'Admin',
      password: 'Salkot@26',
      role: 'Administrator',
      whatsapp: '08123456789',
      unit: 'Salatiga Kota',
      lastUpdated: new Date(0).toISOString()
    }];
  });
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, laporan, bankto, list, pengaturan
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('p2tl_theme') === 'dark';
  });
  const [toast, setToast] = useState(null); // { message, type }
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
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

  const targetsRef = useRef(targets);
  const bankToRef = useRef(bankToTargets);
  const usersRef = useRef(users);

  useEffect(() => { targetsRef.current = targets; }, [targets]);
  useEffect(() => { bankToRef.current = bankToTargets; }, [bankToTargets]);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Show auto-dismiss toast
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Sync helper: push targets (data to) to the backend
  const syncTargetsWithBackend = useCallback(async (newTargets) => {
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
  }, [backendUrl]);

  // Sync helper: push bank TO data to the backend
  const syncBankToWithBackend = useCallback(async (newBankTo) => {
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
  }, [backendUrl]);

  // Sync helper: push users data to the backend
  const syncUsersWithBackend = useCallback(async (newUsers) => {
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (!url) return;
    try {
      const response = await fetch(`${url}?action=syncUsers`, {
        method: 'POST',
        body: JSON.stringify({ data: newUsers }),
        headers: { 'Content-Type': 'text/plain' } // Avoid OPTIONS preflight check CORS issue
      });
      const result = await response.json();
      if (result.status !== 'success') {
        console.error('Gagal sinkronisasi data user ke cloud:', result.message);
      }
    } catch (err) {
      console.error('Koneksi gagal saat menyelaraskan data user:', err);
    }
  }, [backendUrl]);

  // Two-way synchronization function (conflict resolution: newest wins)
  const syncDatabase = useCallback(async (urlToUse) => {
    if (!urlToUse) return;
    try {
      const response = await fetch(`${urlToUse}?action=readAll`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const result = await response.json();
      if (result.status === 'success') {
        const cloudTargets = normalizeData(result.targets || []);
        const cloudBankTo = normalizeBankToData(result.bankTo || []);
        const cloudUsers = normalizeUsersData(result.users || []);

        // Load correct local backups
        let localTargets = [];
        let localBankTo = [];
        let localUsers = [];
        try {
          const savedT = localStorage.getItem('p2tl_targets');
          localTargets = savedT ? normalizeData(JSON.parse(savedT)) : [];
        } catch {
          localTargets = targetsRef.current;
        }
        try {
          const savedB = localStorage.getItem('p2tl_bank_to');
          localBankTo = savedB ? normalizeBankToData(JSON.parse(savedB)) : [];
        } catch {
          localBankTo = bankToRef.current;
        }
        try {
          const savedU = localStorage.getItem('p2tl_users');
          localUsers = savedU ? normalizeUsersData(JSON.parse(savedU)) : [];
        } catch {
          localUsers = usersRef.current;
        }

        // --- MERGE TARGETS (data to) ---
        const mergedTargetsMap = new Map();
        cloudTargets.forEach(item => {
          mergedTargetsMap.set(String(item.IDPel).toLowerCase(), item);
        });

        let targetsNeedPush = false;
        localTargets.forEach(localItem => {
          const key = String(localItem.IDPel).toLowerCase();
          if (mergedTargetsMap.has(key)) {
            const cloudItem = mergedTargetsMap.get(key);
            const localTime = new Date(localItem.lastUpdated || 0).getTime();
            const cloudTime = new Date(cloudItem.lastUpdated || 0).getTime();
            
            if (localTime > cloudTime) {
              mergedTargetsMap.set(key, localItem);
              targetsNeedPush = true;
            }
          } else {
            // Only exists locally
            mergedTargetsMap.set(key, localItem);
            targetsNeedPush = true;
          }
        });

        const finalTargets = Array.from(mergedTargetsMap.values()).map((t, idx) => ({
          ...t,
          No: idx + 1
        }));

        // --- MERGE BANK TO ---
        const mergedBankToMap = new Map();
        cloudBankTo.forEach(item => {
          mergedBankToMap.set(String(item.IDPEL).toLowerCase(), item);
        });

        let bankToNeedPush = false;
        localBankTo.forEach(localItem => {
          const key = String(localItem.IDPEL).toLowerCase();
          if (mergedBankToMap.has(key)) {
            const cloudItem = mergedBankToMap.get(key);
            const localTime = new Date(localItem.lastUpdated || 0).getTime();
            const cloudTime = new Date(cloudItem.lastUpdated || 0).getTime();
            
            if (localTime > cloudTime) {
              mergedBankToMap.set(key, localItem);
              bankToNeedPush = true;
            }
          } else {
            // Only exists locally
            mergedBankToMap.set(key, localItem);
            bankToNeedPush = true;
          }
        });

        const finalBankTo = Array.from(mergedBankToMap.values()).map((t, idx) => ({
          ...t,
          No: idx + 1
        }));

        // --- MERGE USERS ---
        const mergedUsersMap = new Map();
        // Add cloud users first
        cloudUsers.forEach(item => {
          mergedUsersMap.set(String(item.username).toLowerCase(), item);
        });

        let usersNeedPush = false;
        // Merge local users using timestamp check
        localUsers.forEach(localItem => {
          const key = String(localItem.username).toLowerCase();
          if (mergedUsersMap.has(key)) {
            const cloudItem = mergedUsersMap.get(key);
            const localTime = new Date(localItem.lastUpdated || 0).getTime();
            const cloudTime = new Date(cloudItem.lastUpdated || 0).getTime();
            
            if (localTime > cloudTime) {
              mergedUsersMap.set(key, localItem);
              usersNeedPush = true;
            }
          } else {
            // Only exists locally
            mergedUsersMap.set(key, localItem);
            usersNeedPush = true;
          }
        });

        // Make sure default Admin is preserved if users are empty
        const finalUsers = Array.from(mergedUsersMap.values());
        if (finalUsers.length === 0) {
          finalUsers.push({
            username: 'Admin',
            password: 'Salkot@26',
            role: 'Administrator',
            whatsapp: '08123456789',
            unit: 'Salatiga Kota',
            lastUpdated: new Date().toISOString()
          });
          usersNeedPush = true;
        }

        // Update local state and local storage backup
        setTargets(finalTargets);
        setBankToTargets(finalBankTo);
        setUsers(finalUsers);
        localStorage.setItem('p2tl_targets', JSON.stringify(finalTargets));
        localStorage.setItem('p2tl_bank_to', JSON.stringify(finalBankTo));
        localStorage.setItem('p2tl_users', JSON.stringify(finalUsers));

        // Push if local changes are newer
        if (targetsNeedPush) {
          await syncTargetsWithBackend(finalTargets);
        }
        if (bankToNeedPush) {
          await syncBankToWithBackend(finalBankTo);
        }
        if (usersNeedPush) {
          await syncUsersWithBackend(finalUsers);
        }

        showToast('Database disinkronkan dari Google Sheets!', 'success');
      } else {
        showToast('Gagal memuat data dari cloud: ' + (result.message || 'Format tidak dikenal'), 'error');
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi otomatis. Menggunakan database lokal.', err);
      showToast('Sinkronisasi cloud gagal. Menggunakan database lokal.', 'warning');
    }
  }, [showToast, syncTargetsWithBackend, syncBankToWithBackend, syncUsersWithBackend]);

  const handleSaveBackendUrl = (url) => {
    setBackendUrl(url);
    localStorage.setItem('p2tl_backend_url', url);
    showToast('URL Backend berhasil disimpan.', 'success');
    if (url.trim()) {
      syncDatabase(url.trim());
    }
  };

  // Sync from cloud on mount or when backend URL is configured
  useEffect(() => {
    if (backendUrl && !isOffline) {
      const timer = setTimeout(() => {
        syncDatabase(backendUrl);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [backendUrl, isOffline, syncDatabase]);

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

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast("Koneksi internet terhubung kembali. Menyelaraskan database...", "success");
      const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
      if (url) {
        syncDatabase(url);
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast("Koneksi internet terputus. Aplikasi berjalan dalam mode offline.", "warning");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [backendUrl, syncDatabase, showToast]);

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

  // Handle users database update
  const handleUsersChanged = (updatedUsers) => {
    const normalized = normalizeUsersData(updatedUsers);
    setUsers(normalized);
    localStorage.setItem('p2tl_users', JSON.stringify(normalized));
    
    // Auto sync to cloud
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && !navigator.onLine) {
      showToast('Aplikasi offline. Perubahan data pengguna disimpan secara lokal.', 'warning');
    } else if (url) {
      syncDatabase(url);
    }
  };

  // Handle uploaded data (merge or overwrite)
  const handleDataLoaded = (newData, mode) => {
    const nowIso = new Date().toISOString();
    let formatted;
    if (mode === 'overwrite') {
      formatted = newData.map((item, idx) => ({ 
        ...item, 
        No: idx + 1,
        lastUpdated: item.lastUpdated || nowIso 
      }));
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
          const existing = existingMap.get(idStr);
          existingMap.set(idStr, { ...item, No: existing.No, lastUpdated: nowIso });
          updated++;
        } else {
          existingMap.set(idStr, { ...item, No: existingMap.size + 1, lastUpdated: nowIso });
          added++;
        }
      });
      
      formatted = Array.from(existingMap.values());
      setTargets(formatted);
      localStorage.setItem('p2tl_targets', JSON.stringify(formatted));
      showToast(`Sinkronisasi selesai! ${added} data baru ditambahkan, ${updated} data lama diperbarui.`, 'success');
    }
    
    // Auto sync to cloud
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && !navigator.onLine) {
      showToast('Aplikasi offline. Perubahan disimpan secara lokal.', 'warning');
    } else if (url) {
      syncDatabase(url);
    }
  };

  // Manually add record
  const handleAddRecord = (record) => {
    const updatedList = [
      ...targets,
      { ...record, No: targets.length + 1, lastUpdated: new Date().toISOString() }
    ];
    setTargets(updatedList);
    localStorage.setItem('p2tl_targets', JSON.stringify(updatedList));
    showToast('Target P2TL baru berhasil ditambahkan secara manual.', 'success');
    
    // Auto sync to cloud
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && !navigator.onLine) {
      showToast('Aplikasi offline. Perubahan disimpan secara lokal.', 'warning');
    } else if (url) {
      syncDatabase(url);
    }
  };

  // Handle uploaded bank to data (merge or overwrite)
  const handleBankToDataLoaded = (newData, mode) => {
    const normalized = normalizeBankToData(newData);
    const nowIso = new Date().toISOString();
    let formatted;
    if (mode === 'overwrite') {
      formatted = normalized.map((item, idx) => ({ 
        ...item, 
        No: idx + 1,
        lastUpdated: item.lastUpdated || nowIso 
      }));
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
          existingMap.set(idStr, { ...item, No: existing.No, lastUpdated: nowIso });
          updated++;
        } else {
          existingMap.set(idStr, { ...item, No: existingMap.size + 1, lastUpdated: nowIso });
          added++;
        }
      });
      
      formatted = Array.from(existingMap.values());
      setBankToTargets(formatted);
      localStorage.setItem('p2tl_bank_to', JSON.stringify(formatted));
      showToast(`Sinkronisasi Bank TO selesai! ${added} data baru ditambahkan, ${updated} data lama diperbarui.`, 'success');
    }

    // Auto sync to cloud
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && !navigator.onLine) {
      showToast('Aplikasi offline. Perubahan disimpan secara lokal.', 'warning');
    } else if (url) {
      syncDatabase(url);
    }
  };

  // Manually add Bank TO record
  const handleBankToAddRecord = (record) => {
    const updatedList = [
      ...bankToTargets,
      { ...record, No: bankToTargets.length + 1, lastUpdated: new Date().toISOString() }
    ];
    setBankToTargets(updatedList);
    localStorage.setItem('p2tl_bank_to', JSON.stringify(updatedList));
    showToast('Target Bank TO baru berhasil ditambahkan secara manual.', 'success');

    // Auto sync to cloud
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && !navigator.onLine) {
      showToast('Aplikasi offline. Perubahan disimpan secara lokal.', 'warning');
    } else if (url) {
      syncDatabase(url);
    }
  };

  const handleClearLocalData = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua database lokal dari browser? Tindakan ini tidak dapat dibatalkan.")) {
      localStorage.removeItem('p2tl_targets');
      localStorage.removeItem('p2tl_bank_to');
      setTargets([]);
      setBankToTargets([]);
      showToast("Seluruh database lokal berhasil dihapus.", "success");
    }
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const menuTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bankto', label: 'Bank TO' },
    { id: 'laporan', label: 'Laporan' },
    { id: 'list', label: 'Data Target' },
    { id: 'pengaturan', label: 'Pengaturan' }
  ];

  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin}
        users={users}
        title="Anev P2TL"
        subtitle="PLN Unit Pelaksana Pelayanan Pelanggan Salatiga"
        copyright="© 2026 PLN Salatiga. All rights reserved."
      />
    );
  }

  return (
    <>
      {isOffline && (
        <div className="bg-rose-600 text-white text-center py-2 px-4 text-xs font-bold font-sans flex items-center justify-center gap-2 z-[9999] relative shrink-0">
          <AlertTriangle className="w-4 h-4 animate-pulse shrink-0" />
          <span>Koneksi internet terputus. Anda berjalan dalam mode offline (menggunakan database lokal).</span>
        </div>
      )}
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
            onSyncAll={syncDatabase}
            targets={targets}
            bankToTargets={bankToTargets}
            onClearLocalData={handleClearLocalData}
            currentUser={currentUser}
            users={users}
            onUsersChanged={handleUsersChanged}
          />
        </div>
      ) : (
        <div className="animate-fade-in-up">
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
        <div className="fixed toast-top-safe left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm bg-slate-900/95 text-white dark:bg-white/95 dark:text-slate-900 shadow-2xl rounded-2xl p-4 flex items-center justify-between border border-slate-800 dark:border-slate-100/80 animate-toast">
          <div className="flex gap-3 items-center">
            <div className={`p-1 rounded-lg flex-shrink-0 ${
              toast.type === 'error' ? 'bg-rose-500 text-white' :
              toast.type === 'warning' ? 'bg-amber-500 text-white' :
              'bg-emerald-500 text-white'
            }`}>
              {toast.type === 'error' ? <X className="w-4 h-4" /> :
               toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
               <CheckCircle className="w-4 h-4" />}
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
  </>
  );
}
