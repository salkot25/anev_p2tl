import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  RefreshCw, 
  AlertCircle 
} from 'lucide-react';
import { parseExcel } from '../utils/excelParser';
import * as XLSX from 'xlsx';

export default function Uploader({ onDataLoaded }) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, parsing, success, error
  const [report, setReport] = useState(null); // { successCount, errors }
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState([]);
  
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    
    // Check extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      setStatus('error');
      setReport({ 
        errors: ['Tipe file tidak didukung. Harap unggah file Excel (.xlsx atau .xls).'] 
      });
      return;
    }

    setFileName(file.name);
    setStatus('parsing');
    setReport(null);

    try {
      const result = await parseExcel(file);
      setParsedData(result.data);
      setReport({
        successCount: result.data.length,
        errors: result.errors
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setReport({ errors: [err.message] });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleConfirmMerge = () => {
    onDataLoaded(parsedData, 'merge');
    resetUploader();
  };

  const handleConfirmOverwrite = () => {
    onDataLoaded(parsedData, 'overwrite');
    resetUploader();
  };

  const resetUploader = () => {
    setStatus('idle');
    setReport(null);
    setFileName('');
    setParsedData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["DATA TO"],
      [],
      [
        "No", "IDPel", "Nama Pelanggan", "Tarif", "Daya", "Gardu", "Tiang", 
        "ULP", "UP3", "DLPD", "Sub DLPD", "Tanggal Upload", "Regu Petugas", 
        "Tanggal Order", "Tanggal Pelaksanaan", "Status Progress", "Durasi (Menit)", 
        "Sumber", "bank_id"
      ],
      [
        1, 15120018728, "BALAI / BADERI", "S1", 450, "000", "000", 
        "ULP SALATIGA KOTA", "UP3 SALATIGA", "SISIR TARGET", "", "2026-06-08 01:04:22+00", "52351.C", 
        "2026-06-08 01:04:22+00", "2026-06-08 01:04:22+00", "Target Operasi - Temuan - P4", 0, 
        "SISIR", "BTO151200187281780880662.000000"
      ]
    ]);
    
    // Auto-width adjustment for headers
    ws['!cols'] = [
      { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 22 }, { wch: 12 },
      { wch: 22 }, { wch: 22 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DATA TO");
    XLSX.writeFile(wb, "Template_Data_TO.xlsx");
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Header and Template download */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Format File
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Unggah File Excel Target P2TL
          </span>
        </div>
        <button 
          onClick={downloadTemplate}
          className="btn-secondary py-2 px-3 text-xs flex gap-2 items-center hover:bg-slate-100 transition-all cursor-pointer font-sans"
        >
          <Download className="w-4 h-4" />
          Unduh Template
        </button>
      </div>

      {status === 'idle' && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[200px] ${
            dragActive 
              ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10 drag-active' 
              : 'border-slate-200 bg-white hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-slate-700'
          }`}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept=".xlsx, .xls"
            onChange={handleChange}
          />
          <div className="p-4 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-2xl mb-4">
            <Upload className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Seret file ke sini atau klik untuk memilih
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-[280px]">
            Mendukung file spreadsheet Excel (.xlsx, .xls) dengan struktur data P2TL.
          </p>
        </div>
      )}

      {status === 'parsing' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
          <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Sedang membaca data...
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Harap tunggu sebentar, sistem sedang memverifikasi struktur file.
          </p>
        </div>
      )}

      {status === 'success' && report && (
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  File Berhasil Dibaca
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {fileName}
                </p>
                <div className="mt-3 py-2 px-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350 text-xs font-semibold rounded-xl inline-block">
                  {report.successCount} Baris data P2TL berhasil diverifikasi.
                </div>
              </div>
            </div>

            {/* Error/Warning reports */}
            {report.errors.length > 0 && (
              <div className="mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                  <AlertTriangle className="w-4.5 h-4.5" />
                  <span className="text-xs font-bold font-sans">
                    Pemberitahuan/Warning ({report.errors.length})
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl p-3 flex flex-col gap-1.5">
                  {report.errors.map((err, idx) => (
                    <div key={idx} className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                      <span className="font-semibold select-none">•</span>
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions for loaded data */}
            <div className="grid grid-cols-2 gap-3 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-5">
              <button 
                onClick={handleConfirmMerge}
                className="btn-primary flex gap-2 items-center justify-center font-sans text-xs sm:text-sm"
              >
                Gabung Data (Merge)
              </button>
              <button 
                onClick={handleConfirmOverwrite}
                className="btn-secondary flex gap-2 items-center justify-center font-sans text-xs sm:text-sm border-rose-200 hover:border-rose-300 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                Ganti Semua (Overwrite)
              </button>
            </div>
            
            <button 
              onClick={resetUploader}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 mt-4 underline font-medium focus:outline-none transition-colors"
            >
              Batal & Unggah Ulang
            </button>
          </div>
        </div>
      )}

      {status === 'error' && report && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 text-center">
          <div className="mx-auto w-12 h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Gagal Mengunggah File
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[320px] mx-auto">
            Terjadi masalah saat memproses spreadsheet. Silakan periksa format file Anda.
          </p>

          <div className="my-4 p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30 rounded-2xl max-h-36 overflow-y-auto text-left flex flex-col gap-1.5">
            {report.errors.map((err, idx) => (
              <p key={idx} className="text-[11px] text-rose-700 dark:text-rose-400 flex items-start gap-1 font-mono">
                <span>[Error]</span>
                <span>{err}</span>
              </p>
            ))}
          </div>

          <button 
            onClick={resetUploader}
            className="btn-primary py-2 px-4 text-xs font-sans mt-2"
          >
            Coba File Lain
          </button>
        </div>
      )}
    </div>
  );
}
