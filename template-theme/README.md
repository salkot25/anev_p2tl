# Premium Enterprise Dashboard Boilerplate (React + Vite + Tailwind + PWA)

Dokumen ini berisi panduan lengkap penggunaan template/tema desain premium yang diekstrak dari proyek **DTSEN Salkot**. Template ini sudah menyertakan sistem desain enterprise, tema gelap/terang (dark/light mode), sidebar desktop, navigasi bawah mobile, serta dukungan penuh PWA offline.

---

## 📂 Struktur Direktori Template

```text
template-theme/
├── package.json               # Dependensi & skrip development (React 19 + Vite + Tailwind 3)
├── tailwind.config.js         # Konfigurasi Tailwind (mendukung dark mode berbasis class)
├── postcss.config.js          # Konfigurasi PostCSS untuk memproses Tailwind
├── vite.config.js             # Konfigurasi Vite & modul PWA dengan auto-update caching
├── index.html                 # Entry point HTML dengan meta tag PWA & Apple iOS-ready
├── README.md                  # Panduan ini
└── src/
    ├── main.jsx               # Bootstrapping React
    ├── App.jsx                # Shell utama: manajemen sesi login, switch tab, & cache theme
    ├── index.css              # ENTERPRISE DESIGN SYSTEM (Failsafe Light/Dark, Shadows, & Animasi)
    └── components/
        ├── Layout.jsx         # Layout responsif (Sidebar Desktop & Bottom Navigation Mobile)
        └── Login.jsx          # Tampilan login premium glassmorphism dengan background neon
```

---

## 🚀 Cara Menggunakan Template di Proyek Baru

Ikuti langkah-langkah di bawah ini untuk menginisiasi proyek baru menggunakan template ini:

### Langkah 1: Buat Folder Proyek Baru
Buat folder kosong baru untuk proyek Anda (misalnya `d:/React/proyek-baru-anda`) dan masuk ke dalamnya.

### Langkah 2: Salin Berkas Template
Salin seluruh berkas dan folder dari direktori `template-theme` ini ke dalam folder proyek baru Anda tersebut.

### Langkah 3: Install Dependensi
Buka terminal/command prompt di direktori proyek baru Anda, lalu jalankan perintah berikut untuk mengunduh modul-modul yang dibutuhkan:
```bash
npm install
```
*Catatan: Dependensi utama seperti `react`, `react-dom`, `lucide-react`, `tailwindcss`, `autoprefixer`, `postcss`, `vite`, dan `vite-plugin-pwa` akan otomatis terinstal.*

### Langkah 4: Jalankan Development Server
Mulai jalankan server lokal untuk melihat hasil tampilannya secara interaktif:
```bash
npm run dev
```
Buka peramban (browser) di alamat yang diberikan oleh terminal (biasanya `http://localhost:5173/`).

---

## 🛠️ Cara Kustomisasi Template

### 1. Mengubah Menu & Navigasi
Anda dapat dengan mudah mendefinisikan menu navigasi baru di berkas [src/App.jsx](file:///src/App.jsx). Cukup modifikasi array `menuTabs`:
```javascript
const menuTabs = [
  { id: "overview", label: "Dashboard" },
  { id: "input", label: "Data Input" },
  { id: "reports", label: "Laporan Bulanan" }, // Menu baru
  { id: "settings", label: "Pengaturan" }
];
```
*Ikon menu akan secara otomatis disesuaikan di dalam `Layout.jsx` berdasarkan ID tab. Jika ID tidak dikenali, menu akan menggunakan ikon folder secara otomatis.*

### 2. Mengubah Branding Aplikasi (Judul & Subjudul)
Untuk mengganti nama aplikasi, subjudul instansi, nama user, atau role di sidebar, modifikasi props komponen `<Layout>` di berkas `src/App.jsx`:
```javascript
<Layout 
  currentTab={currentTab} 
  setCurrentTab={setCurrentTab} 
  onLogout={handleLogout} 
  theme={theme} 
  setTheme={setTheme}
  tabsList={menuTabs}
  appName="Nama Aplikasi Anda"        // Ganti judul aplikasi di sini
  appSubtitle="Subjudul atau Instansi" // Ganti subjudul di sini
  userName="Nama Pengguna"
  userRole="Peran Pengguna"
>
```

### 3. Mengubah Tampilan Login
Pada komponen `<Login>` di berkas `src/App.jsx`, sesuaikan judul dan hak cipta di bagian bawah:
```javascript
<Login 
  onLogin={handleLogin}
  title="Enterprise Hub"
  subtitle="Sistem Manajemen Aset & Logistik"
  copyright="© 2026 PT Nama Perusahaan Anda"
/>
```

### 4. Mengintegrasikan Halaman/Konten Baru
Tambahkan visualisasi halaman baru di dalam pembungkus `<Layout>` di berkas `src/App.jsx` dengan mengecek `currentTab`:
```javascript
{currentTab === 'reports' && (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    {/* Buat component laporan Anda disini */}
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Laporan Kinerja</h3>
      <p className="text-sm text-slate-500 mt-2">Daftar visualisasi performa bulanan.</p>
    </div>
  </div>
)}
```

### 5. Mengatur Caching PWA
Buka berkas `vite.config.js` untuk mengganti metadata manifest PWA seperti `name`, `short_name`, `description`, serta URL caching eksternal jika aplikasi Anda memanggil API server tertentu.

---

## 🎨 Keunggulan Desain Sistem (index.css)
Seluruh utilitas desain premium didefinisikan dalam [src/index.css](file:///src/index.css). Anda dapat langsung menggunakannya pada class CSS elemen Anda:
* **Bayangan Premium:** `.shadow-sm`, `.shadow`, `.shadow-md`, `.shadow-lg`, `.shadow-xl` memiliki penyesuaian opasitas lembut yang elegan dan terkalibrasi khusus untuk mode terang maupun mode gelap.
* **Transisi Dark Mode:** Penggunaan atribut fail-safe `html:not(.dark)` dan `html.dark` memastikan transisi warna background, border, input teks, dropdown, dan badge berlangsung mulus tanpa jeda kedip (flickering).
* **Animasi Mikro:** Tersedia class animasi bawaan seperti `.animate-sun-spin` (putaran perlahan ikon matahari), `.animate-moon-sway` (ayunan ikon bulan), `.animate-fade-in-up`, `.animate-slide-in-right`, dan `.animate-toast` untuk memikat interaksi visual pengguna.
* **iOS Safari Zoom Prevention:** Form input otomatis diset ke `font-size: 16px` pada perangkat mobile (< 768px) untuk mencegah Safari melakukan auto-zoom paksa saat kolom input diklik.
