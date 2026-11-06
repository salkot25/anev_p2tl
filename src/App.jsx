import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  CheckCircle,
  X,
  AlertTriangle
} from 'lucide-react';
import DetailDrawer from './components/DetailDrawer';
import Layout from './components/Layout';
import Login from './components/Login';
import { getBackendUrl } from './utils/config';

const DashboardPanel = lazy(() => import('./components/DashboardPanel'));
const DataList = lazy(() => import('./components/DataList'));
const BankToPanel = lazy(() => import('./components/BankToPanel'));
const LaporanPanel = lazy(() => import('./components/LaporanPanel'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

function TabLoadingFallback() {
  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-40 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        <div className="h-40 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
      </div>
    </div>
  );
}


const normalizeData = (dataList) => {
  if (!Array.isArray(dataList)) return [];
  return dataList.map((item, idx) => ({
    No: item.No || item.NO || (idx + 1),
    IDPel: String(item.IDPel || item.idPel || item.IDPEL || item['IDPEL'] || item['Id Pel'] || item['Id Pelanggan'] || item.NoAgenda || item['NO AGENDA'] || '').split('.')[0].trim(),
    NamaPelanggan: item.NamaPelanggan || item['Nama Pelanggan'] || item.NAMA || item['NAMA'] || item.Nama || 'Tanpa Nama',
    Tarif: item.Tarif || item.TARIF || item.TARIP || item.Trf || '',
    Daya: parseInt(item.Daya !== undefined ? item.Daya : (item.DAYA !== undefined ? item.DAYA : 0), 10) || 0,
    Gardu: item.Gardu || item.GARDU || '',
    Tiang: item.Tiang || item.TIANG || '',
    ULP: item.ULP || item.NamaUnit || item.NAMA_UNIT || item['NAMA UNIT'] || 'ULP SALATIGA KOTA',
    UP3: item.UP3 || 'UP3 SALATIGA',
    DLPD: item.DLPD || item.JENIS_TO || item['JENIS TO'] || '',
    SubDLPD: item.SubDLPD || item['Sub DLPD'] || item.SUB_DLPD || item['SUB DLPD'] || item.SUBDLPD || '',
    TanggalUpload: item.TanggalUpload || item['Tanggal Upload'] || item.TGL_UPLOAD || '',
    ReguPetugas: item.ReguPetugas || item['Regu Petugas'] || item.REGU || item['Regu'] || '',
    TanggalOrder: item.TanggalOrder || item['Tanggal Order'] || item.TGL_ORDER || '',
    TanggalPelaksanaan: item.TanggalPelaksanaan || item['Tanggal Pelaksanaan'] || item.TGL_PELAKSANAAN || item.TanggalRegister || item['TGL REGISTER'] || '',
    StatusProgress: item.StatusProgress || item['Status Progress'] || item.STATUS || item.Status || 'Target Operasi',
    DurasiMenit: parseInt(item.DurasiMenit !== undefined ? item.DurasiMenit : item['Durasi (Menit)'], 10) || 0,
    Sumber: item.Sumber || item.SUMBER || 'DLPD',
    bank_id: item.bank_id || item.bankId || item.BANK_ID || '',
    lastUpdated: item.lastUpdated || item.last_updated || item.LAST_UPDATED || item.LastUpdated || new Date(0).toISOString()
  })).filter(item => item.IDPel);
};

const normalizeBankToData = (dataList) => {
  if (!Array.isArray(dataList)) return [];
  return dataList.map((item, idx) => {
    const jenisTo = item.JENIS_TO || item['JENIS TO'] || item.jenisTo || item.JenisTO || 'Target Operasi';
    const jamNyala = item.JAM_NYALA !== undefined ? item.JAM_NYALA : (item['JAM NYALA'] !== undefined ? item['JAM NYALA'] : (item.jamNyala !== undefined ? item.jamNyala : ''));
    return {
      No: item.No || item.NO || (idx + 1),
      IDPEL: String(item.IDPEL || item.IDPel || item.idpel || item.IdPel || item['ID PEL'] || item['IDPEL'] || '').split('.')[0].trim(),
      NAMA: item.NAMA || item.Nama || item.NamaPelanggan || item['Nama Pelanggan'] || 'Tanpa Nama',
      ALAMAT: item.ALAMAT || item.Alamat || item.alamat || '',
      TARIF: item.TARIF || item.Tarif || item.TARIP || '',
      DAYA: parseInt(item.DAYA !== undefined ? item.DAYA : (item.Daya !== undefined ? item.Daya : 0), 10) || 0,
      GARDU: item.GARDU || item.Gardu || '',
      TIANG: item.TIANG || item.Tiang || '',
      UNIT: parseInt(item.UNIT !== undefined ? item.UNIT : (item.Unit !== undefined ? item.Unit : 52351), 10) || 52351,
      JAM_NYALA: jamNyala,
      JENIS_TO: jenisTo,
      LATITUDE: parseFloat(item.LATITUDE !== undefined ? item.LATITUDE : (item.Latitude !== undefined ? item.Latitude : 0)) || 0,
      LONGITUDE: parseFloat(item.LONGITUDE !== undefined ? item.LONGITUDE : (item.Longitude !== undefined ? item.Longitude : 0)) || 0,
      SUBDLPD: item.SUBDLPD || item.SubDLPD || item['Sub DLPD'] || item.SUB_DLPD || '',
      lastUpdated: item.lastUpdated || item.last_updated || item.LAST_UPDATED || item.LastUpdated || new Date(0).toISOString()
    };
  }).filter(item => item.IDPEL);
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
    return getBackendUrl();
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('p2tl_last_sync_time') || null;
  });
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(() => {
    return localStorage.getItem('p2tl_has_unsynced_changes') === 'true';
  });

  const [ulp, setUlp] = useState(() => localStorage.getItem('p2tl_default_ulp') || 'ULP SALATIGA KOTA');
  const [up3, setUp3] = useState(() => localStorage.getItem('p2tl_default_up3') || 'UP3 SALATIGA');

  const handleSaveMetadata = (newUlp, newUp3) => {
    const cleanedUlp = (newUlp || '').trim().toUpperCase();
    const cleanedUp3 = (newUp3 || '').trim().toUpperCase();
    setUlp(cleanedUlp);
    setUp3(cleanedUp3);
    localStorage.setItem('p2tl_default_ulp', cleanedUlp);
    localStorage.setItem('p2tl_default_up3', cleanedUp3);
  };

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

  // Sync helper: push targets (data to / pemeriksaan) to the backend
  const syncTargetsWithBackend = useCallback(async (newTargets) => {
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (!url) return false;
    try {
      const response = await fetch(`${url}?action=syncDataTo`, {
        method: 'POST',
        body: JSON.stringify({ data: newTargets }),
        headers: { 'Content-Type': 'text/plain' } // Avoid OPTIONS preflight check CORS issue
      });
      const result = await response.json();
      if (result.status !== 'success') {
        console.error('Gagal sinkronisasi data target ke cloud:', result.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Koneksi gagal saat menyelaraskan data target:', err);
      return false;
    }
  }, [backendUrl]);

  // Sync helper: push bank TO data to the backend
  const syncBankToWithBackend = useCallback(async (newBankTo) => {
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (!url) return false;
    try {
      const response = await fetch(`${url}?action=syncBankTo`, {
        method: 'POST',
        body: JSON.stringify({ data: newBankTo }),
        headers: { 'Content-Type': 'text/plain' } // Avoid OPTIONS preflight check CORS issue
      });
      const result = await response.json();
      if (result.status !== 'success') {
        console.error('Gagal sinkronisasi Bank TO ke cloud:', result.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Koneksi gagal saat menyelaraskan Bank TO:', err);
      return false;
    }
  }, [backendUrl]);

  // Sync helper: push users data to the backend
  const syncUsersWithBackend = useCallback(async (newUsers) => {
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (!url) return false;
    try {
      const response = await fetch(`${url}?action=syncUsers`, {
        method: 'POST',
        body: JSON.stringify({ data: newUsers }),
        headers: { 'Content-Type': 'text/plain' } // Avoid OPTIONS preflight check CORS issue
      });
      const result = await response.json();
      if (result.status !== 'success') {
        console.error('Gagal sinkronisasi data user ke cloud:', result.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Koneksi gagal saat menyelaraskan data user:', err);
      return false;
    }
  }, [backendUrl]);

  // Synchronize database with Google Spreadsheet (Spreadsheet is always primary source of truth)
  const syncDatabase = useCallback(async (urlToUse) => {
    if (!urlToUse || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
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

        // SPREADSHEET ALWAYS TAKES PRECEDENCE OVER LOCAL STORAGE
        setTargets(cloudTargets);
        setBankToTargets(cloudBankTo);
        localStorage.setItem('p2tl_targets', JSON.stringify(cloudTargets));
        localStorage.setItem('p2tl_bank_to', JSON.stringify(cloudBankTo));

        let finalUsers = cloudUsers;
        if (finalUsers.length === 0) {
          try {
            const savedU = localStorage.getItem('p2tl_users');
            finalUsers = savedU ? normalizeUsersData(JSON.parse(savedU)) : [];
          } catch {
            finalUsers = usersRef.current;
          }
          if (finalUsers.length === 0) {
            finalUsers = [{
              username: 'Admin',
              password: 'Salkot@26',
              role: 'Administrator',
              whatsapp: '08123456789',
              unit: 'Salatiga Kota',
              lastUpdated: new Date().toISOString()
            }];
          }
        }
        setUsers(finalUsers);
        localStorage.setItem('p2tl_users', JSON.stringify(finalUsers));

        const nowStr = new Date().toISOString();
        setLastSyncTime(nowStr);
        localStorage.setItem('p2tl_last_sync_time', nowStr);
        setHasUnsyncedChanges(false);
        localStorage.setItem('p2tl_has_unsynced_changes', 'false');
        showToast(`Data Bank TO (${cloudBankTo.length}) & Pemeriksaan (${cloudTargets.length}) berhasil dimuat dari Spreadsheet!`, 'success');
      } else {
        showToast('Gagal memuat data dari Spreadsheet: ' + (result.message || 'Respon tidak valid'), 'error');
      }
    } catch (err) {
      console.warn('Gagal memuat dari Spreadsheet. Menggunakan cache lokal.', err);
      showToast('Koneksi ke Spreadsheet terputus. Menggunakan database lokal sementara.', 'warning');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [showToast]);

  const handleSaveBackendUrl = (url) => {
    const trimmed = (url || '').trim();
    const finalUrl = trimmed || import.meta.env.VITE_BACKEND_URL || '';
    setBackendUrl(finalUrl);
    localStorage.setItem('p2tl_backend_url', trimmed);
    showToast('URL Backend berhasil disimpan.', 'success');
    if (finalUrl) {
      syncDatabase(finalUrl);
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
  const handleUsersChanged = async (updatedUsers) => {
    const normalized = normalizeUsersData(updatedUsers);
    setUsers(normalized);
    localStorage.setItem('p2tl_users', JSON.stringify(normalized));
    
    // Auto sync to cloud
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && navigator.onLine) {
      await syncUsersWithBackend(normalized);
    } else {
      setHasUnsyncedChanges(true);
      localStorage.setItem('p2tl_has_unsynced_changes', 'true');
      showToast('Aplikasi offline. Perubahan data pengguna disimpan secara lokal.', 'warning');
    }
  };

  // Auto-refresh from spreadsheet when switching to 'bankto' or 'list' (Pemeriksaan)
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab;
      if ((activeTab === 'bankto' || activeTab === 'list') && backendUrl && !isOffline) {
        const timer = setTimeout(() => {
          syncDatabase(backendUrl);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, backendUrl, isOffline, syncDatabase]);

  // Handle uploaded data (merge or overwrite) for Pemeriksaan
  const handleDataLoaded = async (newData, mode) => {
    const normalized = normalizeData(newData);
    const nowIso = new Date().toISOString();
    let formatted;
    if (mode === 'overwrite') {
      formatted = normalized.map((item, idx) => ({ 
        ...item, 
        No: idx + 1,
        lastUpdated: item.lastUpdated || nowIso 
      }));
      setTargets(formatted);
      localStorage.setItem('p2tl_targets', JSON.stringify(formatted));
      showToast(`Mengunggah seluruh data (${formatted.length} target) ke Spreadsheet...`, 'info');
    } else {
      // Merge: match by IDPel.
      const existingMap = new Map(targets.map(item => [String(item.IDPel), item]));
      
      let added = 0;
      let updated = 0;
      
      normalized.forEach(item => {
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
      showToast(`Menyimpan ${added} target baru & ${updated} pembaruan ke Spreadsheet...`, 'info');
    }
    
    // Auto push to spreadsheet
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && navigator.onLine) {
      const ok = await syncTargetsWithBackend(formatted);
      if (ok) {
        setHasUnsyncedChanges(false);
        localStorage.setItem('p2tl_has_unsynced_changes', 'false');
        showToast('Data Pemeriksaan berhasil disimpan ke Spreadsheet!', 'success');
      } else {
        setHasUnsyncedChanges(true);
        localStorage.setItem('p2tl_has_unsynced_changes', 'true');
        showToast('Gagal menyimpan ke Spreadsheet. Data disimpan lokal.', 'warning');
      }
    } else {
      setHasUnsyncedChanges(true);
      localStorage.setItem('p2tl_has_unsynced_changes', 'true');
      showToast('Aplikasi offline. Data disimpan secara lokal.', 'warning');
    }
  };

  // Manually add record to Pemeriksaan
  const handleAddRecord = async (record) => {
    const updatedList = [
      ...targets,
      { ...record, No: targets.length + 1, lastUpdated: new Date().toISOString() }
    ];
    setTargets(updatedList);
    localStorage.setItem('p2tl_targets', JSON.stringify(updatedList));
    showToast('Menyimpan target baru ke Spreadsheet...', 'info');
    
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && navigator.onLine) {
      const ok = await syncTargetsWithBackend(updatedList);
      if (ok) {
        setHasUnsyncedChanges(false);
        localStorage.setItem('p2tl_has_unsynced_changes', 'false');
        showToast('Target P2TL berhasil disimpan ke Spreadsheet!', 'success');
      } else {
        setHasUnsyncedChanges(true);
        localStorage.setItem('p2tl_has_unsynced_changes', 'true');
        showToast('Gagal menyimpan ke Spreadsheet. Target disimpan secara lokal.', 'warning');
      }
    } else {
      setHasUnsyncedChanges(true);
      localStorage.setItem('p2tl_has_unsynced_changes', 'true');
      showToast('Aplikasi offline. Target disimpan secara lokal.', 'warning');
    }
  };

  // Handle uploaded bank to data (merge or overwrite)
  const handleBankToDataLoaded = async (newData, mode) => {
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
      showToast(`Mengunggah seluruh data Bank TO (${formatted.length} target) ke Spreadsheet...`, 'info');
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
      showToast(`Menyimpan ${added} data baru & ${updated} data lama ke Spreadsheet...`, 'info');
    }

    // Auto push to spreadsheet
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && navigator.onLine) {
      const ok = await syncBankToWithBackend(formatted);
      if (ok) {
        setHasUnsyncedChanges(false);
        localStorage.setItem('p2tl_has_unsynced_changes', 'false');
        showToast('Data Bank TO berhasil disimpan ke Spreadsheet!', 'success');
      } else {
        setHasUnsyncedChanges(true);
        localStorage.setItem('p2tl_has_unsynced_changes', 'true');
        showToast('Gagal menyimpan ke Spreadsheet. Data disimpan lokal.', 'warning');
      }
    } else {
      setHasUnsyncedChanges(true);
      localStorage.setItem('p2tl_has_unsynced_changes', 'true');
      showToast('Aplikasi offline. Perubahan disimpan secara lokal.', 'warning');
    }
  };

  // Manually add Bank TO record
  const handleBankToAddRecord = async (record) => {
    const updatedList = [
      ...bankToTargets,
      { ...record, No: bankToTargets.length + 1, lastUpdated: new Date().toISOString() }
    ];
    setBankToTargets(updatedList);
    localStorage.setItem('p2tl_bank_to', JSON.stringify(updatedList));
    showToast('Menyimpan target Bank TO ke Spreadsheet...', 'info');

    // Auto push to spreadsheet
    const url = localStorage.getItem('p2tl_backend_url') || backendUrl;
    if (url && navigator.onLine) {
      const ok = await syncBankToWithBackend(updatedList);
      if (ok) {
        setHasUnsyncedChanges(false);
        localStorage.setItem('p2tl_has_unsynced_changes', 'false');
        showToast('Target Bank TO baru berhasil disimpan ke Spreadsheet!', 'success');
      } else {
        setHasUnsyncedChanges(true);
        localStorage.setItem('p2tl_has_unsynced_changes', 'true');
        showToast('Gagal menyimpan ke Spreadsheet. Target disimpan secara lokal.', 'warning');
      }
    } else {
      setHasUnsyncedChanges(true);
      localStorage.setItem('p2tl_has_unsynced_changes', 'true');
      showToast('Aplikasi offline. Target disimpan secara lokal.', 'warning');
    }
  };

  const handleClearLocalData = () => {
    localStorage.removeItem('p2tl_targets');
    localStorage.removeItem('p2tl_bank_to');
    setTargets([]);
    setBankToTargets([]);
    setHasUnsyncedChanges(false);
    localStorage.setItem('p2tl_has_unsynced_changes', 'false');
    showToast("Seluruh database lokal berhasil dihapus.", "success");
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const menuTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'laporan', label: 'Laporan' },
    { id: 'bankto', label: 'Bank TO' },
    { id: 'list', label: 'Pemeriksaan' },
    { id: 'pengaturan', label: 'Pengaturan' }
  ];

  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin}
        users={users}
        title="Anev P2TL"
        subtitle={ulp.trim() ? `PLN ${ulp.trim()}` : (up3.trim() ? `PLN ${up3.trim()}` : "PLN Unit Pelaksana Pelayanan Pelanggan Salatiga")}
        copyright={ulp.trim() ? `© 2026 PLN ${ulp.trim()}. All rights reserved.` : (up3.trim() ? `© 2026 PLN ${up3.trim()}. All rights reserved.` : "© 2026 PLN Salatiga. All rights reserved.")}
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
      appSubtitle={ulp.trim() ? ulp.trim() : (up3.trim() ? up3.trim() : 'PLN Salatiga')}
      userName={currentUser?.name || "Admin"}
      userRole={currentUser?.role || "Administrator"}
      currentUser={currentUser}
      isSyncing={isSyncing}
      lastSyncTime={lastSyncTime}
      hasUnsyncedChanges={hasUnsyncedChanges}
    >
      {/* Switch content based on activeTab */}
      <Suspense fallback={<TabLoadingFallback />}>
        {activeTab === 'dashboard' ? (
          <DashboardPanel backendUrl={backendUrl} />
        ) : activeTab === 'bankto' ? (
          <BankToPanel 
            targets={bankToTargets}
            realizedTargets={targets}
            onDataLoaded={handleBankToDataLoaded}
            onAddRecord={handleBankToAddRecord}
            onRefresh={() => syncDatabase(backendUrl)}
            isSyncing={isSyncing}
          />
        ) : activeTab === 'laporan' ? (
          <LaporanPanel targets={targets} backendUrl={backendUrl} ulp={ulp} up3={up3} />
        ) : activeTab === 'pengaturan' ? (
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
            ulp={ulp}
            up3={up3}
            onSaveMetadata={handleSaveMetadata}
            lastSyncTime={lastSyncTime}
            hasUnsyncedChanges={hasUnsyncedChanges}
          />
        ) : (
          <DataList 
            targets={targets} 
            onSelectRecord={handleSelectRecord}
            onAddRecord={handleAddRecord}
            onDataLoaded={handleDataLoaded}
            onRefresh={() => syncDatabase(backendUrl)}
            isSyncing={isSyncing}
          />
        )}
      </Suspense>

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
