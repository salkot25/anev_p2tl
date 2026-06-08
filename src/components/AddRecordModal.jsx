import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function AddRecordModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    IDPel: '',
    NamaPelanggan: '',
    Tarif: 'R1',
    Daya: 450,
    Gardu: '000',
    Tiang: '000',
    ULP: 'ULP SALATIGA KOTA',
    UP3: 'UP3 SALATIGA',
    DLPD: 'SISIR TARGET',
    SubDLPD: '',
    ReguPetugas: '52351.A',
    StatusProgress: 'Target Operasi - Periksa - Sesuai',
    DurasiMenit: 0,
    Sumber: 'DLPD',
    bank_id: ''
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'Daya' || name === 'DurasiMenit' ? (parseInt(value, 10) || 0) : value
    }));
    // Clear errors as user typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    // Validations
    if (!formData.IDPel) {
      newErrors.IDPel = 'ID Pelanggan wajib diisi.';
    } else if (!/^\d+$/.test(formData.IDPel)) {
      newErrors.IDPel = 'ID Pelanggan harus berupa angka.';
    }
    
    if (!formData.NamaPelanggan.trim()) {
      newErrors.NamaPelanggan = 'Nama Pelanggan wajib diisi.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Set bank_id if empty
    const timestamp = Date.now();
    const finalData = {
      ...formData,
      bank_id: formData.bank_id || `BTO${formData.IDPel}${timestamp}`,
      TanggalUpload: new Date().toISOString().replace('T', ' ').split('.')[0] + '+00',
      TanggalOrder: new Date().toISOString().replace('T', ' ').split('.')[0] + '+00',
      TanggalPelaksanaan: new Date().toISOString().replace('T', ' ').split('.')[0] + '+00'
    };

    onAdd(finalData);
    onClose();
    // reset form
    setFormData({
      IDPel: '',
      NamaPelanggan: '',
      Tarif: 'R1',
      Daya: 450,
      Gardu: '000',
      Tiang: '000',
      ULP: 'ULP SALATIGA KOTA',
      UP3: 'UP3 SALATIGA',
      DLPD: 'SISIR TARGET',
      SubDLPD: '',
      ReguPetugas: '52351.A',
      StatusProgress: 'Target Operasi - Periksa - Sesuai',
      DurasiMenit: 0,
      Sumber: 'DLPD',
      bank_id: ''
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            Tambah Target Baru
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          
          <div className="grid grid-cols-2 gap-4">
            {/* IDPel */}
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                ID Pelanggan (IDPel)
              </label>
              <input 
                type="text" 
                name="IDPel"
                value={formData.IDPel}
                onChange={handleChange}
                placeholder="Contoh: 523511200668"
                className={`input-text text-sm ${errors.IDPel ? 'border-rose-450 focus:ring-rose-500/20' : ''}`}
              />
              {errors.IDPel && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{errors.IDPel}</p>}
            </div>

            {/* Nama Pelanggan */}
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Nama Pelanggan
              </label>
              <input 
                type="text" 
                name="NamaPelanggan"
                value={formData.NamaPelanggan}
                onChange={handleChange}
                placeholder="Contoh: ANDI WIJAYA"
                className={`input-text text-sm ${errors.NamaPelanggan ? 'border-rose-450 focus:ring-rose-500/20' : ''}`}
              />
              {errors.NamaPelanggan && <p className="text-[10px] text-rose-500 font-semibold mt-0.5">{errors.NamaPelanggan}</p>}
            </div>

            {/* Tarif */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Tarif
              </label>
              <input 
                type="text" 
                name="Tarif"
                value={formData.Tarif}
                onChange={handleChange}
                placeholder="R1 / S1 / P3"
                className="input-text text-sm"
              />
            </div>

            {/* Daya */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Daya (VA)
              </label>
              <input 
                type="number" 
                name="Daya"
                value={formData.Daya}
                onChange={handleChange}
                placeholder="450 / 900 / 1300"
                className="input-text text-sm"
              />
            </div>

            {/* Gardu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Gardu
              </label>
              <input 
                type="text" 
                name="Gardu"
                value={formData.Gardu}
                onChange={handleChange}
                placeholder="LAAAADE15200"
                className="input-text text-sm"
              />
            </div>

            {/* Tiang */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Tiang
              </label>
              <input 
                type="text" 
                name="Tiang"
                value={formData.Tiang}
                onChange={handleChange}
                placeholder="SA2-204"
                className="input-text text-sm"
              />
            </div>

            {/* ULP */}
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Unit Layanan Pelanggan (ULP)
              </label>
              <select 
                name="ULP" 
                value={formData.ULP}
                onChange={handleChange}
                className="input-text text-sm select-arrow bg-white dark:bg-slate-800"
              >
                <option value="ULP SALATIGA KOTA">ULP SALATIGA KOTA</option>
                <option value="ULP AMBARAWA">ULP AMBARAWA</option>
                <option value="ULP UNGARAN">ULP UNGARAN</option>
              </select>
            </div>

            {/* Regu Petugas */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Regu Petugas
              </label>
              <input 
                type="text" 
                name="ReguPetugas"
                value={formData.ReguPetugas}
                onChange={handleChange}
                placeholder="52351.A"
                className="input-text text-sm"
              />
            </div>

            {/* Sumber */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Sumber
              </label>
              <select 
                name="Sumber" 
                value={formData.Sumber}
                onChange={handleChange}
                className="input-text text-sm select-arrow bg-white dark:bg-slate-800"
              >
                <option value="DLPD">DLPD</option>
                <option value="SISIR">SISIR</option>
                <option value="OPAL">OPAL</option>
              </select>
            </div>

            {/* Status Progress */}
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Status Progress
              </label>
              <select 
                name="StatusProgress" 
                value={formData.StatusProgress}
                onChange={handleChange}
                className="input-text text-sm select-arrow bg-white dark:bg-slate-800"
              >
                <option value="Target Operasi - Periksa - Sesuai">Target Operasi - Periksa - Sesuai</option>
                <option value="Target Operasi - Temuan - K2">Target Operasi - Temuan - K2</option>
                <option value="Target Operasi - Temuan - P1">Target Operasi - Temuan - P1</option>
                <option value="Target Operasi - Temuan - P4">Target Operasi - Temuan - P4</option>
                <option value="Target Operasi">Target Operasi (Pending)</option>
              </select>
            </div>

            {/* DLPD */}
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Kategori DLPD
              </label>
              <input 
                type="text" 
                name="DLPD"
                value={formData.DLPD}
                onChange={handleChange}
                placeholder="DLPD CATER / JAM NYALA < 40"
                className="input-text text-sm"
              />
            </div>

            {/* Durasi */}
            <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Durasi (Menit)
              </label>
              <input 
                type="number" 
                name="DurasiMenit"
                value={formData.DurasiMenit}
                onChange={handleChange}
                placeholder="Menit"
                className="input-text text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 pb-2">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary py-2 px-4 text-xs font-sans"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="btn-primary py-2 px-5 text-xs font-sans"
            >
              Simpan Target
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
