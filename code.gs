// ==========================================
// 1. SETUP TABLES (RUN THIS ONCE FIRST)
// ==========================================
function setupTables() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup "bank to" sheet
  var bankToSheet = ss.getSheetByName("bank to");
  if (!bankToSheet) {
    bankToSheet = ss.insertSheet("bank to");
  }
  bankToSheet.clear();
  var bankToHeaders = [
    "IDPEL", "NAMA", "ALAMAT", "TARIF", "DAYA", "GARDU", "TIANG", 
    "UNIT", "JAM NYALA", "JENIS TO", "LATITUDE", "LONGITUDE", "SUBDLPD"
  ];
  bankToSheet.getRange(1, 1, 1, bankToHeaders.length).setValues([bankToHeaders]);
  bankToSheet.getRange(1, 1, 1, bankToHeaders.length).setFontWeight("bold").setBackground("#cfe2f3");
  
  // Setup "data to" sheet
  var dataToSheet = ss.getSheetByName("data to");
  if (!dataToSheet) {
    dataToSheet = ss.insertSheet("data to");
  }
  dataToSheet.clear();
  var dataToHeaders = [
    "No", "IDPel", "Nama Pelanggan", "Tarif", "Daya", "Gardu", "Tiang", 
    "ULP", "UP3", "DLPD", "Sub DLPD", "Tanggal Upload", "Regu Petugas", 
    "Tanggal Order", "Tanggal Pelaksanaan", "Status Progress", "Durasi (Menit)", 
    "Sumber", "bank_id"
  ];
  dataToSheet.getRange(1, 1, 1, dataToHeaders.length).setValues([dataToHeaders]);
  dataToSheet.getRange(1, 1, 1, dataToHeaders.length).setFontWeight("bold").setBackground("#d9ead3");
  
  Logger.log("Tabel 'bank to' dan 'data to' berhasil dibuat!");
}

// ==========================================
// 2. GET API: READ DATABASE DATA
// ==========================================
function doGet(e) {
  var action = e.parameter.action || "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ── Existing readAll action ──────────────────────────────────────────────
  if (action === "readAll") {
    var bankToData = readSheetData(ss.getSheetByName("bank to"));
    var dataToData = readSheetData(ss.getSheetByName("data to"));
    return jsonResponse({
      status: "success",
      bankTo: bankToData,
      targets: dataToData
    });
  }
  
  // ── Dashboard Data (Realisasi + Target + execSummary) ────────────────────
  if (action === "get_dashboard_data") {
    var date = e.parameter.date || getTodayDate();
    return jsonResponse(getDashboardData(ss, date));
  }
  
  // ── Logs / Realisasi history for chart ──────────────────────────────────
  if (action === "get_logs") {
    var page  = parseInt(e.parameter.page  || "1",  10);
    var limit = parseInt(e.parameter.limit || "120", 10);
    var sort  = e.parameter.sort === "date_asc" ? "date_asc" : "date_desc";
    var search = e.parameter.search || "";
    return jsonResponse(getLogsData(ss, page, limit, sort, search));
  }
  
  // ── Monthly Targets ──────────────────────────────────────────────────────
  if (action === "get_monthly_targets") {
    var year = e.parameter.year || new Date().getFullYear().toString();
    return jsonResponse(getMonthlyTargets(ss, year));
  }
  
  return jsonResponse({ status: "error", message: "Aksi tidak dikenal." });
}

// ── Helper: today as YYYY-MM-DD ────────────────────────────────────────────
function getTodayDate() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

// ── Helper: build dashboard response ──────────────────────────────────────
function getDashboardData(ss, date) {
  var parts = date.split("-");
  var year  = parts[0];
  var month = parseInt(parts[1], 10);
  
  // 1. Read Target sheet row for the given date
  var targetSheet = ss.getSheetByName("Target");
  var targetObj = {
    date: date,
    targetHarianKwh: 0,
    targetKumulatifKwh: 0,
    targetLkbkPlg: 0,
    target3PhasaPlg: 0,
    targetDlpdPlg: 0,
    targetPengembanganPlg: 0,
    targetTsPeriodikPlg: 0,
    targetTsMacetPlg: 0,
    targetLainnyaPlg: 0
  };
  
  if (targetSheet) {
    var targetRows = readSheetData(targetSheet);
    for (var i = 0; i < targetRows.length; i++) {
      var r = targetRows[i];
      var rowDate = normalizeDateCell(r["Tanggal"] || r["Date"] || r["date"] || "");
      if (rowDate === date) {
        targetObj.targetHarianKwh      = toNum(r["Target Harian kWh"] || r["Target_Harian_kWh"] || r["targetHarianKwh"]);
        targetObj.targetKumulatifKwh   = toNum(r["Target Kumulatif kWh"] || r["Target_Kumulatif_kWh"] || r["targetKumulatifKwh"]);
        targetObj.targetLkbkPlg        = toNum(r["Target LKBK Plg"] || r["Target_LKBK_Plg"] || r["targetLkbkPlg"]);
        targetObj.target3PhasaPlg      = toNum(r["Target 3Phasa Plg"] || r["Target_3Phasa_Plg"] || r["target3PhasaPlg"]);
        targetObj.targetDlpdPlg        = toNum(r["Target DLPD Plg"] || r["Target_DLPD_Plg"] || r["targetDlpdPlg"]);
        targetObj.targetPengembanganPlg = toNum(r["Target Pengembangan Plg"] || r["Target_Pengembangan_Plg"] || r["targetPengembanganPlg"]);
        targetObj.targetTsPeriodikPlg  = toNum(r["Target TS Periodik Plg"] || r["Target_TS_Periodik_Plg"] || r["targetTsPeriodikPlg"]);
        targetObj.targetTsMacetPlg     = toNum(r["Target TS Macet Plg"] || r["Target_TS_Macet_Plg"] || r["targetTsMacetPlg"]);
        targetObj.targetLainnyaPlg     = toNum(r["Target Lainnya Plg"] || r["Target_Lainnya_Plg"] || r["targetLainnyaPlg"]);
        break;
      }
    }
  }
  
  // 2. Read Realisasi sheet rows for that date + aggregates
  var realisasiSheet = ss.getSheetByName("Realisasi");
  var realization = {
    realisasiHarianKwh: 0,
    realisasiKumulatifKwh: 0,
    realisasiHarianTs: 0,
    realisasiKumulatifTs: 0,
    inspectionsCountHarian: 0,
    inspectionsCountKumulatif: 0
  };
  
  // Per-month and per-year aggregates for execSummary
  var monthlyMap   = {};  // "YYYY-MM" -> { kwh, cases }
  var tariffMap    = {};  // "R"|"B"|... -> { kwh, cases }
  var golonganMap  = {};  // "P1"|"P2"|... -> { kwh, cases }
  var dayaMap      = {};  // "450 VA"|... -> { kwh, cases }
  var yearKwh      = 0;
  var yearCases    = 0;
  var yearTs       = 0;
  var prevYearKwh  = 0;
  var prevYearCases = 0;
  var prevMonthlyMap = {}; // previous year monthly
  var topFindings  = [];
  
  if (realisasiSheet) {
    var realRows = readRealisasiSheetData(realisasiSheet);
    for (var j = 0; j < realRows.length; j++) {
      var row = realRows[j];
      var rowDate = row.date;
      if (!rowDate) continue;
      
      var rowParts = rowDate.split("-");
      var rowYear  = rowParts[0];
      var rowMonth = rowParts[1];
      var rowMonthKey = rowYear + "-" + rowMonth;
      
      var kwh   = row.kwh;
      var hTs   = row["Realisasi Harian TS"];
      var lkbk  = row["Realisasi LKBK Plg"];
      var ph3   = row["Realisasi 3Phasa Plg"];
      var dlpd  = row["Realisasi DLPD Plg"];
      var peng  = row["Realisasi Pengembangan Plg"];
      var tsp   = row["Realisasi TS Periodik Plg"];
      var tsm   = row["Realisasi TS Macet Plg"];
      var lain  = row["Realisasi Lainnya Plg"];
      var cases = lkbk + ph3 + dlpd + peng + tsp + tsm + lain;
      var tarif = row.tarif.toUpperCase().trim();
      
      // Today's record
      if (rowDate === date) {
        realization.realisasiHarianKwh       += kwh;
        realization.realisasiHarianTs        += hTs;
        realization.inspectionsCountHarian   += cases;
      }
      
      // Cumulative up to the selected date (within the same year)
      if (rowYear === year && rowDate <= date) {
        realization.realisasiKumulatifKwh += kwh;
        realization.realisasiKumulatifTs  += hTs;
        realization.inspectionsCountKumulatif += cases;
      }
      
      // Current year aggregates
      if (rowYear === year) {
        yearKwh += kwh;
        yearCases += cases;
        yearTs += hTs;
        
        // Monthly trend
        if (!monthlyMap[rowMonthKey]) monthlyMap[rowMonthKey] = { kwh: 0, cases: 0 };
        monthlyMap[rowMonthKey].kwh   += kwh;
        monthlyMap[rowMonthKey].cases += cases;
        
        // Tariff breakdown
        if (tarif) {
          var tariffKey = tarif[0]; // R, B, S, I, P
          if (!tariffMap[tariffKey]) tariffMap[tariffKey] = { kwh: 0, cases: 0, ts: 0 };
          tariffMap[tariffKey].kwh   += kwh;
          tariffMap[tariffKey].cases += cases;
          tariffMap[tariffKey].ts    += hTs;
        }
        
        // Golongan breakdown
        var gol = (row.gol || "").toUpperCase().trim();
        if (gol) {
          if (!golonganMap[gol]) golonganMap[gol] = { kwh: 0, cases: 0, ts: 0 };
          golonganMap[gol].kwh   += kwh;
          golonganMap[gol].cases += cases;
          golonganMap[gol].ts    += hTs;
        }
        
        // Daya breakdown
        var daya = (row.daya || "").toUpperCase().trim();
        if (daya) {
          var dayaKey = classifyDaya(daya);
          if (!dayaMap[dayaKey]) dayaMap[dayaKey] = { kwh: 0, cases: 0, ts: 0 };
          dayaMap[dayaKey].kwh   += kwh;
          dayaMap[dayaKey].cases += cases;
          dayaMap[dayaKey].ts    += hTs;
        }
        
        // Top findings (entries with kwh > 5000)
        if (kwh >= 5000) {
          topFindings.push({
            noagenda: row["noagenda"] || "",
            idpel: row["idpel"] || "",
            nama: row["nama"] || "",
            gol: row["gol"] || "",
            tarif: tarif,
            kwh: kwh,
            ts: hTs,
            date: rowDate
          });
        }
      }
      
      // Previous year aggregates
      var prevYear = (parseInt(year, 10) - 1).toString();
      if (rowYear === prevYear) {
        prevYearKwh += kwh;
        prevYearCases += cases;
        if (!prevMonthlyMap[rowMonth]) prevMonthlyMap[rowMonth] = { kwh: 0, cases: 0 };
        prevMonthlyMap[rowMonth].kwh   += kwh;
        prevMonthlyMap[rowMonth].cases += cases;
      }
    }
  }
  
  // Build monthly trend array (12 months)
  var monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  var monthlyTrend = [];
  for (var m = 1; m <= 12; m++) {
    var mk = year + "-" + String(m).padStart(2, "0");
    var entry = monthlyMap[mk] || { kwh: 0, cases: 0 };
    monthlyTrend.push({ month: monthNames[m-1], kwh: entry.kwh, cases: entry.cases, ts: entry.kwh * 1000 });
  }
  
  var prevMonthlyTrend = [];
  for (var pm = 1; pm <= 12; pm++) {
    var pmk = String(pm).padStart(2, "0");
    var pe = prevMonthlyMap[pmk] || { kwh: 0, cases: 0 };
    prevMonthlyTrend.push({ month: monthNames[pm-1], kwh: pe.kwh, cases: pe.cases, ts: pe.kwh * 1000 });
  }
  
  // Build tariff breakdown
  var tariffBreakdown = Object.keys(tariffMap).map(function(k) {
    return { class: k, kwh: tariffMap[k].kwh, cases: tariffMap[k].cases, ts: tariffMap[k].ts || 0 };
  });

  // Build golongan breakdown
  var golonganBreakdown = Object.keys(golonganMap).map(function(k) {
    return { class: k, kwh: golonganMap[k].kwh, cases: golonganMap[k].cases, ts: golonganMap[k].ts || 0 };
  });

  // Build daya breakdown
  var dayaBreakdown = Object.keys(dayaMap).map(function(k) {
    return { class: k, kwh: dayaMap[k].kwh, cases: dayaMap[k].cases, ts: dayaMap[k].ts || 0 };
  });
  
  // Sort top findings by kwh desc, take top 10
  topFindings.sort(function(a, b) { return b.kwh - a.kwh; });
  topFindings = topFindings.slice(0, 10);
  
  return {
    status: "success",
    date: date,
    target: targetObj,
    realization: realization,
    execSummary: {
      totalCasesYear: yearCases,
      totalKwhYear: yearKwh,
      totalTsYear: yearTs,
      monthlyTrend: monthlyTrend,
      tariffBreakdown: tariffBreakdown,
      golonganBreakdown: golonganBreakdown,
      dayaBreakdown: dayaBreakdown,
      kwhBreakdown: [],
      prevTotalCasesYear: prevYearCases,
      prevTotalKwhYear: prevYearKwh,
      prevTotalTsYear: 0,
      prevMonthlyTrend: prevMonthlyTrend,
      topFindings: topFindings
    }
  };
}

// ── Helper: get Realisasi logs for chart ──────────────────────────────────
function getLogsData(ss, page, limit, sort, search) {
  var realisasiSheet = ss.getSheetByName("Realisasi");
  if (!realisasiSheet) {
    return { status: "success", data: [], pagination: { page: 1, limit: limit, totalFiltered: 0, totalPages: 1 }, sortApplied: sort };
  }
  
  var allCases = readRealisasiSheetData(realisasiSheet);
  
  // Aggregate by date
  var dateGroupMap = {};
  allCases.forEach(function(c) {
    var d = c.date;
    if (!d) return;
    if (!dateGroupMap[d]) {
      dateGroupMap[d] = {
        Date: d,
        Timestamp: d + "T00:00:00.000Z",
        Realisasi_Harian_kWh: 0,
        Realisasi_LKBK_Plg: 0,
        Realisasi_3Phasa_Plg: 0,
        Realisasi_DLPD_Plg: 0,
        Realisasi_Pengembangan_Plg: 0,
        Realisasi_TS_Periodik_Plg: 0,
        Realisasi_TS_Macet_Plg: 0,
        Realisasi_Lainnya_Plg: 0,
        Realisasi_Harian_TS: 0
      };
    }
    dateGroupMap[d].Realisasi_Harian_kWh += c.kwh;
    dateGroupMap[d].Realisasi_Harian_TS  += c.Realisasi_Harian_TS;
    dateGroupMap[d].Realisasi_LKBK_Plg   += c.Realisasi_LKBK_Plg;
    dateGroupMap[d].Realisasi_3Phasa_Plg  += c.Realisasi_3Phasa_Plg;
    dateGroupMap[d].Realisasi_DLPD_Plg   += c.Realisasi_DLPD_Plg;
    dateGroupMap[d].Realisasi_Pengembangan_Plg += c.Realisasi_Pengembangan_Plg;
    dateGroupMap[d].Realisasi_TS_Periodik_Plg  += c.Realisasi_TS_Periodik_Plg;
    dateGroupMap[d].Realisasi_TS_Macet_Plg     += c.Realisasi_TS_Macet_Plg;
    dateGroupMap[d].Realisasi_Lainnya_Plg      += c.Realisasi_Lainnya_Plg;
  });
  
  var aggregatedList = Object.keys(dateGroupMap).map(function(k) {
    return dateGroupMap[k];
  });
  
  // Sort chronologically first to calculate cumulative values
  aggregatedList.sort(function(a, b) {
    return a.Date.localeCompare(b.Date);
  });
  
  // Calculate cumulative values
  var cumKwh = 0;
  var cumTs = 0;
  var prevYear = "";
  for (var i = 0; i < aggregatedList.length; i++) {
    var item = aggregatedList[i];
    var currentYear = item.Date.split("-")[0];
    if (currentYear !== prevYear) {
      cumKwh = 0;
      cumTs = 0;
      prevYear = currentYear;
    }
    cumKwh += item.Realisasi_Harian_kWh;
    cumTs  += item.Realisasi_Harian_TS;
    
    item.Realisasi_Kumulatif_kWh = cumKwh;
    item.Realisasi_Kumulatif_TS  = cumTs;
  }
  
  // Filter by search
  if (search) {
    var s = search.toLowerCase();
    aggregatedList = aggregatedList.filter(function(row) { return String(row.Date).toLowerCase().includes(s); });
  }
  
  // Sort according to requested sort direction
  aggregatedList.sort(function(a, b) {
    return sort === "date_asc" ? a.Date.localeCompare(b.Date) : b.Date.localeCompare(a.Date);
  });
  
  var totalFiltered = aggregatedList.length;
  var totalPages = Math.ceil(totalFiltered / limit) || 1;
  var safePage = Math.min(page, totalPages);
  var start = (safePage - 1) * limit;
  
  return {
    status: "success",
    data: aggregatedList.slice(start, start + limit),
    pagination: { page: safePage, limit: limit, totalFiltered: totalFiltered, totalPages: totalPages },
    sortApplied: sort
  };
}

// ── Helper: get monthly targets from "Target" sheet ───────────────────────
function getMonthlyTargets(ss, year) {
  var targetSheet = ss.getSheetByName("Target");
  if (!targetSheet) {
    var defaults = [];
    for (var i = 1; i <= 12; i++) {
      defaults.push({ Month: i, Year: year, Target_kWh: 130205 });
    }
    return { status: "success", data: defaults };
  }
  
  var allRows = readSheetData(targetSheet);
  var result  = [];
  
  allRows.forEach(function(row) {
    var rowYear  = String(row["Tahun"] || row["Year"] || row["year"] || "").trim();
    var rowMonth = toNum(row["Bulan"] || row["Month"] || row["month"] || row["BL"]);
    var rowKwh   = toNum(row["Target kWh"] || row["Target_kWh"] || row["target_kwh"] || row["KWH"]);
    
    if (rowYear === year && rowMonth >= 1 && rowMonth <= 12) {
      result.push({ Month: rowMonth, Year: rowYear, Target_kWh: rowKwh });
    }
  });
  
  if (result.length === 0) {
    for (var m = 1; m <= 12; m++) {
      result.push({ Month: m, Year: year, Target_kWh: 130205 });
    }
  }
  
  return { status: "success", data: result };
}

// Helper to convert sheet cells into json arrays
function readSheetData(sheet) {
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  var headers = rows[0];
  var data = [];
  
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    data.push(obj);
  }
  return data;
}

// ── Helper: custom parser for Realisasi sheet layout ──────────────────────
function readRealisasiSheetData(sheet) {
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 8) return [];
  
  // Find the main header row (Row 7, index 6 typically)
  var headerRowIdx = -1;
  for (var i = 0; i < Math.min(rows.length, 15); i++) {
    var row = rows[i];
    for (var j = 0; j < row.length; j++) {
      var val = String(row[j]).toUpperCase().replace(/[\s_]/g, "");
      if (val === "NOAGENDA" || val === "IDPEL") {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx !== -1) break;
  }
  
  if (headerRowIdx === -1) {
    return readSheetData(sheet);
  }
  
  var row7 = rows[headerRowIdx];
  var row8 = rows[headerRowIdx + 1];
  
  var colMap = {};
  for (var c = 0; c < row7.length; c++) {
    var h7 = String(row7[c] || "").trim();
    var h8 = String(row8[c] || "").trim();
    
    var name = h7 ? h7 : h8;
    var norm = name.toUpperCase().replace(/[\s_()/-]/g, "");
    
    if (norm === "NOAGENDA") {
      colMap["noagenda"] = c;
    } else if (norm === "IDPEL") {
      colMap["idpel"] = c;
    } else if (norm === "NAMA" || norm === "NAMAPELANGGAN") {
      colMap["nama"] = c;
    } else if (norm === "GOL" || norm === "GOLONGAN") {
      colMap["gol"] = c;
    } else if (norm === "ALAMAT") {
      colMap["alamat"] = c;
    } else if (norm === "TARIF/DAYA" || norm === "TARIFDAYA") {
      colMap["tarif_daya"] = c;
    } else if (norm === "KWH") {
      colMap["kwh"] = c;
    } else if (norm === "TS" || (h7.indexOf("SUSULAN") !== -1 && h8 === "TS")) {
      colMap["ts"] = c;
    } else if (norm === "TANGGALREGISTER" || norm === "TGLREGISTER") {
      colMap["tanggal_register"] = c;
    } else if (norm === "TANGGALSPH" || norm === "TGLSPH") {
      colMap["tanggal_sph"] = c;
    } else if (norm === "TARIF") {
      colMap["tarif"] = c;
    } else if (norm === "DAYA") {
      colMap["daya"] = c;
    }
  }
  
  if (colMap["noagenda"] === undefined) colMap["noagenda"] = 1;
  if (colMap["idpel"] === undefined) colMap["idpel"] = 3;
  if (colMap["nama"] === undefined) colMap["nama"] = 4;
  if (colMap["gol"] === undefined) colMap["gol"] = 7;
  if (colMap["alamat"] === undefined) colMap["alamat"] = 8;
  
  var data = [];
  var dataStartIdx = headerRowIdx + 3;
  
  for (var i = dataStartIdx; i < rows.length; i++) {
    var row = rows[i];
    var noVal = String(row[0]).trim();
    if (!noVal || isNaN(Number(noVal))) {
      continue;
    }
    
    var noagenda = colMap["noagenda"] !== undefined ? String(row[colMap["noagenda"]] || "").trim() : "";
    var idpel = colMap["idpel"] !== undefined ? String(row[colMap["idpel"]] || "").trim() : "";
    var nama = colMap["nama"] !== undefined ? String(row[colMap["nama"]] || "").trim() : "";
    var gol = colMap["gol"] !== undefined ? String(row[colMap["gol"]] || "").trim() : "";
    var alamat = colMap["alamat"] !== undefined ? String(row[colMap["alamat"]] || "").trim() : "";
    var tarifDaya = colMap["tarif_daya"] !== undefined ? String(row[colMap["tarif_daya"]] || "").trim() : "";
    
    var kwh = 0;
    if (colMap["kwh"] !== undefined) {
      kwh = toNum(row[colMap["kwh"]]);
    } else {
      kwh = toNum(row[11] || row[10] || 0);
    }
    
    var ts = 0;
    if (colMap["ts"] !== undefined) {
      ts = toNum(row[colMap["ts"]]);
    } else {
      ts = toNum(row[14] || row[15] || 0);
    }
    
    var dateVal = "";
    if (colMap["tanggal_register"] !== undefined) {
      dateVal = normalizeDateCell(row[colMap["tanggal_register"]]);
    }
    if (!dateVal && colMap["tanggal_sph"] !== undefined) {
      dateVal = normalizeDateCell(row[colMap["tanggal_sph"]]);
    }
    if (!dateVal && row.length > 29) {
      dateVal = normalizeDateCell(row[29] || row[30] || row[31] || "");
    }
    
    var parts = tarifDaya.split("/");
    var tarif = parts[0] || (colMap["tarif"] !== undefined ? String(row[colMap["tarif"]] || "").trim() : "");
    var daya = parts[1] || (colMap["daya"] !== undefined ? String(row[colMap["daya"]] || "").trim() : "");
    
    var classif = classifyFinding(gol, tarifDaya);
    
    data.push({
      "No": noVal,
      "No Agenda": noagenda,
      "noagenda": noagenda,
      "IDPEL": idpel,
      "idpel": idpel,
      "Nama": nama,
      "nama": nama,
      "NAMA": nama,
      "Golongan": gol,
      "gol": gol,
      "Alamat": alamat,
      "alamat": alamat,
      "ALAMAT": alamat,
      "Tarif": tarif,
      "tarif": tarif,
      "Daya": daya,
      "daya": daya,
      "KWH": kwh,
      "kwh": kwh,
      "Realisasi Harian kWh": kwh,
      "Realisasi Kumulatif kWh": kwh,
      "Realisasi Harian TS": ts,
      "Realisasi Kumulatif TS": ts,
      "Realisasi LKBK Plg": classif.lkbk,
      "Realisasi 3Phasa Plg": classif.ph3,
      "Realisasi DLPD Plg": classif.dlpd,
      "Realisasi Pengembangan Plg": classif.peng,
      "Realisasi TS Periodik Plg": classif.tsp,
      "Realisasi TS Macet Plg": classif.tsm,
      "Realisasi Lainnya Plg": classif.lain,
      "Tanggal": dateVal,
      "Date": dateVal,
      "date": dateVal,
      "TGL": dateVal,
      "TANGGAL REGISTER": dateVal
    });
  }
  
  return data;
}

// ── Helper: classify P2TL finding category ────────────────────────────────
function classifyFinding(golType, tarifDaya) {
  var res = {
    lkbk: 0,
    ph3: 0,
    dlpd: 0,
    peng: 0,
    tsp: 0,
    tsm: 0,
    lain: 0
  };
  
  var gol = String(golType || "").toUpperCase().trim();
  var td = String(tarifDaya || "").toUpperCase().trim();
  
  if (gol.indexOf("LKBK") !== -1) {
    res.lkbk = 1;
  } else if (gol.indexOf("3P") !== -1 || td.indexOf("3P") !== -1 || td.indexOf("3 PHASA") !== -1 || td.indexOf("3PHASA") !== -1) {
    res.ph3 = 1;
  } else if (gol.indexOf("DLPD") !== -1) {
    res.dlpd = 1;
  } else if (gol.indexOf("PENG") !== -1 || gol.indexOf("OVER") !== -1) {
    res.peng = 1;
  } else if (gol.indexOf("PERIODIK") !== -1 || gol.indexOf("TSP") !== -1) {
    res.tsp = 1;
  } else if (gol.indexOf("TSM") !== -1 || gol.indexOf("MACET") !== -1) {
    res.tsm = 1;
  } else {
    res.lain = 1;
  }
  return res;
}

// Helper: number conversion (robust with dot/comma separators)
function toNum(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  var str = String(val).trim();
  var cleaned = str.replace(/\./g, "").replace(/,/g, ".");
  var n = Number(cleaned);
  if (!isNaN(n)) return n;
  var n2 = Number(str);
  return isNaN(n2) ? 0 : n2;
}

// Helper: normalize date cell (Date object → YYYY-MM-DD string)
function normalizeDateCell(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, "0");
    var d = String(val.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }
  var str = String(val).trim();
  if (!str) return "";
  var isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (isoMatch) {
    return isoMatch[1] + "-" + isoMatch[2].padStart(2, "0") + "-" + isoMatch[3].padStart(2, "0");
  }
  var idMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (idMatch) {
    return idMatch[3] + "-" + idMatch[2].padStart(2, "0") + "-" + idMatch[1].padStart(2, "0");
  }
  return str;
}

// Helper: JSON response
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 3. POST API: WRITE / SYNC DATABASE ROWS
// ==========================================
function doPost(e) {
  var action   = e.parameter.action;
  var postData = JSON.parse(e.postData.contents);
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "syncBankTo") {
    var sheet = ss.getSheetByName("bank to");
    if (!sheet) sheet = ss.insertSheet("bank to");
    writeSheetData(sheet, postData.data, [
      "IDPEL", "NAMA", "ALAMAT", "TARIF", "DAYA", "GARDU", "TIANG", 
      "UNIT", "JAM NYALA", "JENIS TO", "LATITUDE", "LONGITUDE", "SUBDLPD"
    ]);
    return jsonResponse({ status: "success" });
  }
  
  if (action === "syncDataTo") {
    var sheet = ss.getSheetByName("data to");
    if (!sheet) sheet = ss.insertSheet("data to");
    writeSheetData(sheet, postData.data, [
      "No", "IDPel", "Nama Pelanggan", "Tarif", "Daya", "Gardu", "Tiang", 
      "ULP", "UP3", "DLPD", "Sub DLPD", "Tanggal Upload", "Regu Petugas", 
      "Tanggal Order", "Tanggal Pelaksanaan", "Status Progress", "Durasi (Menit)", 
      "Sumber", "bank_id"
    ]);
    return jsonResponse({ status: "success" });
  }
  
  // Save monthly targets
  if (action === "save_monthly_targets") {
    var year    = postData.year || new Date().getFullYear().toString();
    var targets = postData.targets || [];
    var sheet   = ss.getSheetByName("Target");
    if (!sheet) sheet = ss.insertSheet("Target");
    
    // Read existing rows and update/append monthly targets for this year
    var existingData = readSheetData(sheet);
    var updatedMap = {};
    existingData.forEach(function(row) {
      var rowYear  = String(row["Tahun"] || row["Year"] || "").trim();
      var rowMonth = toNum(row["Bulan"] || row["Month"] || 0);
      if (rowYear === year && rowMonth >= 1 && rowMonth <= 12) {
        updatedMap[rowMonth] = true;
      }
    });
    
    // Append new monthly targets for this year
    targets.forEach(function(t) {
      if (!updatedMap[t.Month]) {
        // Row doesn't exist, append it
        var lastRow = sheet.getLastRow() + 1;
        sheet.getRange(lastRow, 1, 1, 3).setValues([[year, t.Month, t.Target_kWh]]);
      } else {
        // Update existing row
        var allVals = sheet.getDataRange().getValues();
        var headers = allVals[0];
        var yearIdx  = headers.indexOf("Tahun") !== -1 ? headers.indexOf("Tahun") : headers.indexOf("Year");
        var monthIdx = headers.indexOf("Bulan") !== -1 ? headers.indexOf("Bulan") : headers.indexOf("Month");
        var kwhIdx   = headers.indexOf("Target kWh") !== -1 ? headers.indexOf("Target kWh") : headers.indexOf("Target_kWh");
        if (yearIdx < 0 || monthIdx < 0 || kwhIdx < 0) return;
        for (var i = 1; i < allVals.length; i++) {
          if (String(allVals[i][yearIdx]).trim() === year && toNum(allVals[i][monthIdx]) === t.Month) {
            sheet.getRange(i + 1, kwhIdx + 1).setValue(t.Target_kWh);
            break;
          }
        }
      }
    });
    
    return jsonResponse({ status: "success", message: "Target bulanan berhasil disimpan." });
  }
  
  return jsonResponse({ status: "error", message: "Aksi tidak dikenal." });
}

// Helper to clear and re-write json array to sheet cells
function writeSheetData(sheet, dataList, keys) {
  sheet.clearContents();
  
  // Re-write headers
  sheet.getRange(1, 1, 1, keys.length).setValues([keys]);
  
  if (!dataList || dataList.length === 0) return;
  
  var values = [];
  dataList.forEach(function(item) {
    var row = [];
    keys.forEach(function(key) {
      // Normalize key match for mapping
      var foundVal = "";
      Object.keys(item).forEach(function(itemKey) {
        if (itemKey.toLowerCase().replace(/[\s_()]/g, "") === key.toLowerCase().replace(/[\s_()]/g, "")) {
          foundVal = item[itemKey];
        }
      });
      row.push(foundVal !== undefined ? foundVal : "");
    });
    values.push(row);
  });
  
  sheet.getRange(2, 1, values.length, keys.length).setValues(values);
}

function classifyDaya(dayaStr) {
  if (!dayaStr) return "Lainnya";
  var d = String(dayaStr).toUpperCase().replace(/[\sVA.]/g, "");
  var val = parseInt(d, 10);
  if (isNaN(val)) return "Lainnya";
  
  if (val <= 450) return "450 VA";
  if (val <= 900) return "900 VA";
  if (val <= 1300) return "1300 VA";
  if (val <= 2200) return "2200 VA";
  return "> 2200 VA";
}
