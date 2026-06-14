# ⚡ Anev P2TL - ULP Salatiga Kota

Aplikasi **Analisa & Evaluasi P2TL** (Penertiban Pemakaian Tenaga Listrik) dirancang khusus untuk mempermudah monitoring target, realisasi temuan kWh, dan manajemen Target Operasi (TO) di lingkungan PLN ULP Salatiga Kota.

---

## ✨ Fitur Utama

1. **Dashboard Analytics (Real-time)**
   - Visualisasi pencapaian realisasi kWh vs Target tahunan/semesteran.
   - Perbandingan realisasi YoY (Year-over-Year) dengan kumulatif kWh secara visual.
   - Grafik tren temuan kWh bulanan, breakdown berdasarkan golongan tarif, klasifikasi daya, dan 10 besar temuan kasus kWh terbesar.
   
2. **Menu Pemeriksaan (Daftar TO)**
   - Manajemen daftar pelanggan yang masuk dalam Target Operasi (TO).
   - Memonitor status progres inspeksi secara terstruktur.
   
3. **Generator Laporan Harian (WhatsApp)**
   - Format laporan otomatis siap kirim via WhatsApp (rencana/realisasi harian).
   - **Perhitungan Target Harian Konsisten**: Target harian hari ini ($T$) dihitung berdasarkan sisa target terhadap realisasi kumulatif s.d. kemarin ($T-1$) dibagi sisa hari kerja aktif. Nilai target harian tetap konsisten dan tidak menyusut saat berpindah mode rencana/realisasi.
   
4. **Sinkronisasi Database Dua-Arah (Google Sheets)**
   - Integrasi langsung dengan Google Spreadsheet melalui API Web App Google Apps Script.
   - Fitur fallback **Mode Offline** dengan penyimpanan cache internal di `Local Storage` browser apabila koneksi terputus.
   - Indikator status koneksi yang dinamis dan rapi pada menu Pengaturan.

5. **Pengaturan Hari Kerja & Parameter**
   - Kustomisasi hari kerja aktif mingguan (Senin-Jumat, Sabtu, Minggu) untuk perhitungan sisa hari kerja yang presisi.

---

## 🛠️ Stack Teknologi

- **Frontend**: React.js (Vite), Tailwind CSS / Vanilla CSS, Lucide React (Icons).
- **Backend/Database**: Google Apps Script (`code.gs`) terhubung ke Google Spreadsheet.
- **PWA (Progressive Web App)**: Dukungan instalasi aplikasi di desktop/mobile dan precaching aset.

---

## 🚀 Memulai (Lokal)

### Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/).

### Langkah Instalasi
1. Clone repositori ini ke komputer lokal Anda.
2. Buka terminal di direktori proyek dan jalankan perintah:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173/` (atau port alternatif).

4. Untuk membuat build produksi:
   ```bash
   npm run build
   ```

5. Untuk melakukan deploy ke GitHub Pages:
   ```bash
   npm run deploy
   ```

---

## 📂 Konfigurasi Backend (Google Apps Script)

Untuk mengaktifkan sinkronisasi database awan:
1. Buat Google Spreadsheet baru.
2. Buka menu **Ekstensi** > **Apps Script**.
3. Salin dan tempel kode dari file [code.gs](file:///d:/Antigravity/anev_p2tl/code.gs) ke editor Apps Script Anda.
4. Jalankan fungsi `setupTables` sekali untuk menginisialisasi tabel-tabel utama (`bank to`, `data to`, `users`, `Target`, `Realisasi`).
5. Terapkan (Deploy) Apps Script tersebut sebagai **Aplikasi Web (Web App)**:
   - Pilih akses untuk: *Siapa saja (Anyone)*.
6. Salin URL Web App yang dihasilkan.
7. Jalankan aplikasi frontend Anev P2TL, masuk ke menu **Pengaturan**, lalu tempelkan URL tersebut ke input URL Database dan klik **Simpan**.
