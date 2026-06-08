# Panduan Integrasi Dashboard Analisis P2TL

Halaman dashboard analisis ini dirancang mandiri (*self-contained package*) agar dapat dipindahkan ke proyek React + Vite + Tailwind CSS lainnya secara instan. Paket ini mencakup visualisasi premium untuk **Realisasi (Kinerja Harian & Komposisi Temuan)**, **Target Bulanan**, dan **Ringkasan Analitik**.

---

## 1. Struktur Folder Paket Ekspor
Salin seluruh isi folder `dashboard-export/` ke dalam direktori `/src/` pada proyek target Anda (misalnya ke `/src/features/dashboard/` atau `/src/components/dashboard/`).
```
dashboard/
├── README.md                          <- Panduan ini
├── components/
│   ├── DashboardAnalytics.tsx         <- Tampilan utama Dashboard (Realisasi & Ringkasan)
│   ├── MonthlyTargets.tsx             <- Panel kelola Target Bulanan
│   └── Button.tsx                     <- Tombol kustom berdesain premium
├── core/
│   ├── report.entity.ts               <- Interface TypeScript
│   └── generate-report.usecase.ts     <- Helper formatting (angka & tanggal)
├── data/
│   └── gas-p2tl.repository.ts         <- Data Fetcher (Sheets / Offline Mock data)
└── design-system/
    └── tokens.ts                      <- Token warna & utility Tailwind CSS
```

---

## 2. Dependensi
Proyek baru Anda membutuhkan ikon dari `lucide-react`. Jalankan perintah berikut di terminal proyek target Anda:
```bash
npm install lucide-react
```

---

## 3. Konfigurasi CSS & Tailwind
Agar tampilan visual premium seperti tema warna gelap (dark mode), grid 4px, font, scrollbar, dan animasi berjalan sempurna, pastikan Anda memperbarui berkas konfigurasi di proyek target Anda:

### A. Tambahkan ke `tailwind.config.js`
Perbarui bagian `theme.extend` Anda agar mencakup konfigurasi `spacing` dan warna `brand` pendukung:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Sangat disarankan untuk mendukung Dark Mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#020617',         // Slate 950
          card: '#0f172a',       // Slate 900
          cardLight: '#1e293b',  // Slate 800
          accent: '#10b981',     // Emerald 500
          accentHover: '#059669',// Emerald 600
          border: '#334155',     // Slate 700
          textMuted: '#94a3b8',  // Slate 400
          textLight: '#f8fafc',  // Slate 50
        }
      },
      spacing: {
        // Mendukung Grid Spacing 4px
        '1px': '1px',
        '2px': '2px',
        '4px': '4px',
        '8px': '8px',
        '12px': '12px',
        '16px': '16px',
        '20px': '20px',
        '24px': '24px',
        '28px': '28px',
        '32px': '32px',
        '36px': '36px',
        '40px': '40px',
        '48px': '48px',
        '64px': '64px',
      }
    },
  },
  plugins: [],
}
```

### B. Tambahkan ke File CSS Utama (e.g. `src/index.css`)
Tambahkan aturan font Google Fonts, scrollbar premium, dan transition utility class:
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

:root {
  --scrollbar-track: #f8fafc; /* Slate 50 */
  --scrollbar-thumb: #cbd5e1; /* Slate 300 */
  --scrollbar-hover: #94a3b8; /* Slate 400 */
}

.dark {
  --scrollbar-track: #020617; /* Slate 950 */
  --scrollbar-thumb: #1e293b; /* Slate 800 */
  --scrollbar-hover: #334155; /* Slate 700 */
}

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin: 0;
  padding: 0;
}

/* Custom premium scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}
::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 8px;
  border: 2px solid var(--scrollbar-track);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-hover);
}

/* Smooth transition utility */
.transition-custom {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 4. Cara Penggunaan di React Component
Anda dapat langsung merender komponen `<DashboardAnalytics />` dengan memberikan properti data (*props*) yang sesuai:

```tsx
import React, { useState, useEffect } from 'react';
import { DashboardAnalytics } from './dashboard/components/DashboardAnalytics';
import { GasP2TLRepository } from './dashboard/data/gas-p2tl.repository';
import type { P2TLResponse } from './dashboard/core/report.entity';

const repository = new GasP2TLRepository();

export const MyDashboardPage = () => {
  const [data, setData] = useState<P2TLResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const activeDate = '2026-06-06'; // Tanggal aktif yang dipilih

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await repository.getTargets(activeDate);
        setData(response);
      } catch (error) {
        console.error("Gagal memuat data dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeDate]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat dashboard...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-rose-500">Gagal mengambil data.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-50">
      <div className="max-w-7xl mx-auto">
        <DashboardAnalytics
          targets={data.target}
          realization={{
            date: activeDate,
            realisasiHarianKwh: data.realization.realisasiHarianKwh,
            realisasiKumulatifKwh: data.realization.realisasiKumulatifKwh,
            // Opsional untuk Whatsapp Template:
            realisasiLkbkPlg: '',
            realisasi3PhasaPlg: '',
            realisasiDlpdPlg: '',
            realisasiPengembanganPlg: '',
            realisasiTsPeriodikPlg: '',
            realisasiTsMacetPlg: '',
            realisasiLainnyaPlg: ''
          }}
          execSummary={data.execSummary}
          onNavigateToReport={() => {
            alert('Arahkan ke form entri laporan baru Anda!');
          }}
          workingDays="7" // Pengaturan jumlah hari kerja aktif ('5' | '6' | '7')
        />
      </div>
    </div>
  );
};
```

---

## 5. Sumber Data (Google Sheets / Offline Fallback)
Secara bawaan, jika Anda memanggil repository tanpa mengonfigurasi URL backend Google Apps Script:
1. `GasP2TLRepository` akan secara otomatis menggunakan **data tiruan (*mock data*)** yang tertanam di dalamnya. Dashboard visual Anda akan langsung bekerja dan menampilkan data grafik simulasi.
2. Untuk menghubungkannya ke spreadsheet Anda, simpan URL Google Apps Script Web App Anda di `localStorage` dengan key `p2tl_gas_url` menggunakan console browser atau halaman pengaturan:
   ```javascript
   localStorage.setItem('p2tl_gas_url', 'https://script.google.com/macros/s/.../exec');
   ```

### Format Respon API Apps Script (`GET`)
Apps Script backend Anda diharapkan mengembalikan format JSON berikut saat dipanggil dengan parameter tanggal (`?date=YYYY-MM-DD`):
```json
{
  "status": "success",
  "date": "2026-06-06",
  "data": {
    "Target_Harian_kWh": 19933,
    "Target_Kumulatif_kWh": 1562458,
    "Target_LKBK_Plg": 2,
    "Target_3Phasa_Plg": 5,
    "Target_DLPD_Plg": 26,
    "Target_Pengembangan_Plg": 0,
    "Target_TS_Periodik_Plg": 0,
    "Target_TS_Macet_Plg": 0,
    "Target_Lainnya_Plg": 0
  },
  "realization": {
    "realisasiHarianKwh": 18240,
    "realisasiKumulatifKwh": 1425600,
    "realisasiHarianTs": 22450000,
    "realisasiKumulatifTs": 1568400000,
    "inspectionsCountHarian": 32,
    "inspectionsCountKumulatif": 890
  },
  "execSummary": {
    "totalCasesYear": 142,
    "totalKwhYear": 1438902,
    "totalTsYear": 1582792200,
    "monthlyTrend": [
      { "month": "Jan", "cases": 12, "kwh": 125400, "ts": 137940000 },
      ...
    ],
    "tariffBreakdown": [
      { "class": "R", "cases": 85, "kwh": 685400, "ts": 753940000 },
      ...
    ],
    "golonganBreakdown": [
      { "class": "P1", "cases": 45, "kwh": 412000 },
      ...
    ],
    "dayaBreakdown": [
      { "class": "900 VA", "cases": 58, "kwh": 522000 },
      ...
    ],
    "topFindings": [
      {
        "noagenda": "537210928312",
        "idpel": "537210982312",
        "nama": "CV Maju Jaya",
        "gol": "B1/13200VA",
        "tarif": "B",
        "kwh": 12450,
        "ts": 13695000,
        "date": "2026-06-06"
      }
    ]
  }
}
```
