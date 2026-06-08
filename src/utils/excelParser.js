import * as XLSX from 'xlsx';

/**
 * Parses a P2TL Excel spreadsheet in the browser client-side.
 * Finds headers automatically and maps them into a robust schema.
 * 
 * @param {File} file 
 * @returns {Promise<{ data: Array, errors: Array }>}
 */
export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          reject(new Error("File Excel tidak memiliki sheet aktif."));
          return;
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Read sheet as an array of rows (each row is an array of cells)
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        if (rows.length === 0) {
          reject(new Error("Sheet kosong atau tidak ada data."));
          return;
        }
        
        // Expected columns (insensitive to case/whitespace)
        const expectedHeaders = [
          'No', 'IDPel', 'Nama Pelanggan', 'Tarif', 'Daya', 'Gardu', 'Tiang', 
          'ULP', 'UP3', 'DLPD', 'Sub DLPD', 'Tanggal Upload', 'Regu Petugas', 
          'Tanggal Order', 'Tanggal Pelaksanaan', 'Status Progress', 'Durasi (Menit)', 
          'Sumber', 'bank_id'
        ];
        
        // Search first 15 rows for the headers
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i].map(val => String(val).toLowerCase().trim().replace(/\s+/g, ''));
          if (row.includes('idpel') || row.includes('namapelanggan')) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          reject(new Error("Format file tidak sesuai. Kolom 'IDPel' atau 'Nama Pelanggan' tidak ditemukan di baris baris awal."));
          return;
        }
        
        const rawHeaders = rows[headerRowIndex].map(h => String(h).trim());
        
        // Map expected headers to their index
        const colMap = {};
        expectedHeaders.forEach(expected => {
          const normalizedExpected = expected.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
          const idx = rawHeaders.findIndex(h => {
            const normalizedH = String(h).toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
            return normalizedH === normalizedExpected || 
                   (normalizedExpected === 'durasimenit' && normalizedH.includes('durasi')) ||
                   (normalizedExpected === 'subdlpd' && normalizedH.includes('subdlpd'));
          });
          colMap[expected] = idx;
        });
        
        // Check for essential columns: IDPel, Nama Pelanggan
        if (colMap['IDPel'] === -1 || colMap['Nama Pelanggan'] === -1) {
          reject(new Error("Kolom penting 'IDPel' atau 'Nama Pelanggan' tidak ditemukan."));
          return;
        }
        
        const parsedData = [];
        const errors = [];
        
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          
          // Skip if row is empty or only whitespace
          if (!row || row.length === 0 || row.every(val => String(val).trim() === '')) {
            continue;
          }
          
          const getVal = (expectedName) => {
            const idx = colMap[expectedName];
            if (idx === undefined || idx === -1) return '';
            return row[idx] !== undefined ? String(row[idx]).trim() : '';
          };
          
          const rawIdPel = getVal('IDPel');
          if (!rawIdPel) {
            errors.push(`Baris ${i + 1}: IDPel kosong.`);
            continue;
          }
          
          // Clean up IDPel (remove decimal places if parsed as floats, e.g. "123.0" -> "123")
          let cleanIdPel = rawIdPel.split('.')[0];
          if (!/^\d+$/.test(cleanIdPel)) {
            errors.push(`Baris ${i + 1}: IDPel "${rawIdPel}" bukan format angka valid.`);
            continue;
          }
          
          const item = {
            No: parsedData.length + 1,
            IDPel: cleanIdPel,
            NamaPelanggan: getVal('Nama Pelanggan'),
            Tarif: getVal('Tarif'),
            Daya: parseInt(getVal('Daya'), 10) || 0,
            Gardu: getVal('Gardu'),
            Tiang: getVal('Tiang'),
            ULP: getVal('ULP') || 'ULP SALATIGA KOTA',
            UP3: getVal('UP3') || 'UP3 SALATIGA',
            DLPD: getVal('DLPD'),
            SubDLPD: getVal('Sub DLPD'),
            TanggalUpload: getVal('Tanggal Upload'),
            ReguPetugas: getVal('Regu Petugas'),
            TanggalOrder: getVal('Tanggal Order'),
            TanggalPelaksanaan: getVal('Tanggal Pelaksanaan'),
            StatusProgress: getVal('Status Progress') || 'Target Operasi',
            DurasiMenit: parseInt(getVal('Durasi (Menit)'), 10) || 0,
            Sumber: getVal('Sumber') || 'DLPD',
            bank_id: getVal('bank_id')
          };
          
          parsedData.push(item);
        }
        
        resolve({ data: parsedData, errors });
      } catch (err) {
        reject(new Error("Gagal mengurai file Excel: " + err.message));
      }
    };
    
    reader.onerror = (err) => reject(new Error("Kesalahan membaca file: " + err.message));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parses a Bank TO Excel spreadsheet in the browser client-side.
 * Compatible with 20260608 TO EPM.xlsx format.
 * 
 * @param {File} file 
 * @returns {Promise<{ data: Array, errors: Array }>}
 */
export const parseBankToExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          reject(new Error("File Excel tidak memiliki sheet aktif."));
          return;
        }
        
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        if (rows.length === 0) {
          reject(new Error("Sheet kosong atau tidak ada data."));
          return;
        }
        
        const expectedHeaders = [
          'IDPEL', 'NAMA', 'ALAMAT', 'TARIF', 'DAYA', 'GARDU', 'TIANG', 'UNIT', 'JAM NYALA', 
          'JENIS TO', 'LATITUDE', 'LONGITUDE', 'SUBDLPD'
        ];
        
        // Find header row (usually index 0)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i].map(val => String(val).toLowerCase().trim().replace(/\s+/g, ''));
          if (row.includes('idpel') || row.includes('nama')) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          reject(new Error("Format file tidak sesuai. Kolom 'IDPEL' atau 'NAMA' tidak ditemukan."));
          return;
        }
        
        const rawHeaders = rows[headerRowIndex].map(h => String(h).trim());
        
        const colMap = {};
        expectedHeaders.forEach(expected => {
          const normalizedExpected = expected.toLowerCase().replace(/\s+/g, '');
          const idx = rawHeaders.findIndex(h => {
            const normalizedH = String(h).toLowerCase().replace(/\s+/g, '');
            return normalizedH === normalizedExpected || 
                   (normalizedExpected === 'jamnyala' && normalizedH.includes('nyala')) ||
                   (normalizedExpected === 'jenisto' && normalizedH.includes('jenis'));
          });
          colMap[expected] = idx;
        });
        
        if (colMap['IDPEL'] === -1 || colMap['NAMA'] === -1) {
          reject(new Error("Kolom penting 'IDPEL' atau 'NAMA' tidak ditemukan."));
          return;
        }
        
        const parsedData = [];
        const errors = [];
        
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          
          if (!row || row.length === 0 || row.every(val => String(val).trim() === '')) {
            continue;
          }
          
          const getVal = (expectedName) => {
            const idx = colMap[expectedName];
            if (idx === undefined || idx === -1) return '';
            return row[idx] !== undefined ? String(row[idx]).trim() : '';
          };
          
          const rawIdPel = getVal('IDPEL');
          if (!rawIdPel) {
            errors.push(`Baris ${i + 1}: IDPEL kosong.`);
            continue;
          }
          
          let cleanIdPel = rawIdPel.split('.')[0];
          if (!/^\d+$/.test(cleanIdPel)) {
            errors.push(`Baris ${i + 1}: IDPEL "${rawIdPel}" bukan format angka valid.`);
            continue;
          }
          
          const item = {
            No: parsedData.length + 1,
            IDPEL: cleanIdPel,
            NAMA: getVal('NAMA'),
            ALAMAT: getVal('ALAMAT'),
            TARIF: getVal('TARIF'),
            DAYA: parseInt(getVal('DAYA'), 10) || 0,
            GARDU: getVal('GARDU'),
            TIANG: getVal('TIANG'),
            UNIT: parseInt(getVal('UNIT'), 10) || 52351,
            JAM_NYALA: getVal('JAM NYALA') ? parseFloat(getVal('JAM NYALA')) : '',
            JENIS_TO: getVal('JENIS TO') || 'Target Operasi',
            LATITUDE: parseFloat(getVal('LATITUDE')) || 0,
            LONGITUDE: parseFloat(getVal('LONGITUDE')) || 0,
            SUBDLPD: getVal('SUBDLPD')
          };
          
          parsedData.push(item);
        }
        
        resolve({ data: parsedData, errors });
      } catch (err) {
        reject(new Error("Gagal mengurai file Excel: " + err.message));
      }
    };
    
    reader.onerror = (err) => reject(new Error("Kesalahan membaca file: " + err.message));
    reader.readAsArrayBuffer(file);
  });
};
