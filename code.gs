// ── Helper: find sheet by name case-insensitively and flexibly ───────────
function findSheetCaseInsensitive(ss, possibleNames) {
  if (!ss) return null;
  if (typeof possibleNames === "string") possibleNames = [possibleNames];
  
  // 1. Try exact match first
  for (var i = 0; i < possibleNames.length; i++) {
    var s = ss.getSheetByName(possibleNames[i]);
    if (s) return s;
  }
  
  // 2. Try normalized case-insensitive match (stripping spaces, underscores, hyphens)
  var sheets = ss.getSheets();
  var normalizedTargets = possibleNames.map(function(n) {
    return String(n).toLowerCase().replace(/[\s_-]/g, "");
  });
  
  for (var j = 0; j < sheets.length; j++) {
    var sName = sheets[j].getName().toLowerCase().replace(/[\s_-]/g, "");
    for (var k = 0; k < normalizedTargets.length; k++) {
      if (sName === normalizedTargets[k]) {
        return sheets[j];
      }
    }
  }
  return null;
}

// ==========================================
// 1. SETUP TABLES (RUN THIS ONCE FIRST)
// ==========================================
function setupTables() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup "bank to" sheet
  var bankToSheet = findSheetCaseInsensitive(ss, ["bank to", "bankto", "bank_to", "Bank TO", "BANK TO"]);
  if (!bankToSheet) {
    bankToSheet = ss.insertSheet("bank to");
  }
  bankToSheet.clear();
  var bankToHeaders = [
    "IDPEL", "NAMA", "ALAMAT", "TARIF", "DAYA", "GARDU", "TIANG", 
    "UNIT", "JAM NYALA", "JENIS TO", "LATITUDE", "LONGITUDE", "SUBDLPD", "LAST UPDATED"
  ];
  bankToSheet.getRange(1, 1, 1, bankToHeaders.length).setValues([bankToHeaders]);
  bankToSheet.getRange(1, 1, 1, bankToHeaders.length).setFontWeight("bold").setBackground("#cfe2f3");
  
  // Setup "data to" sheet (Pemeriksaan)
  var dataToSheet = findSheetCaseInsensitive(ss, ["data to", "datato", "data_to", "Data TO", "DATA TO", "pemeriksaan", "Pemeriksaan"]);
  if (!dataToSheet) {
    dataToSheet = ss.insertSheet("data to");
  }
  dataToSheet.clear();
  var dataToHeaders = [
    "No", "IDPel", "Nama Pelanggan", "Tarif", "Daya", "Gardu", "Tiang", 
    "ULP", "UP3", "DLPD", "Sub DLPD", "Tanggal Upload", "Regu Petugas", 
    "Tanggal Order", "Tanggal Pelaksanaan", "Status Progress", "Durasi (Menit)", 
    "Sumber", "bank_id", "LAST UPDATED"
  ];
  dataToSheet.getRange(1, 1, 1, dataToHeaders.length).setValues([dataToHeaders]);
  dataToSheet.getRange(1, 1, 1, dataToHeaders.length).setFontWeight("bold").setBackground("#d9ead3");
  
  // Setup "users" sheet
  var usersSheet = findSheetCaseInsensitive(ss, ["users", "user", "pengguna", "Users"]);
  if (!usersSheet) {
    usersSheet = ss.insertSheet("users");
  }
  usersSheet.clear();
  var usersHeaders = [
    "username", "password", "role", "whatsapp", "unit", "lastUpdated"
  ];
  usersSheet.getRange(1, 1, 1, usersHeaders.length).setValues([usersHeaders]);
  usersSheet.getRange(1, 1, 1, usersHeaders.length).setFontWeight("bold").setBackground("#ffd966");
  
  // Seed default admin account
  var defaultAdmin = [
    "Admin", "Salkot@26", "Administrator", "08123456789", "Salatiga Kota", new Date().toISOString()
  ];
  usersSheet.getRange(2, 1, 1, usersHeaders.length).setValues([defaultAdmin]);
  
  Logger.log("Tabel 'bank to', 'data to', dan 'users' berhasil dibuat!");
}

// ==========================================
// 2. GET API: READ DATABASE DATA
// ==========================================
function doGet(e) {
  var action = e.parameter.action || "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ── Existing readAll action (always priority from spreadsheet) ───────────
  if (action === "readAll") {
    var bankToSheet = findSheetCaseInsensitive(ss, ["bank to", "bankto", "bank_to", "Bank TO", "BANK TO"]);
    var dataToSheet = findSheetCaseInsensitive(ss, ["data to", "datato", "data_to", "Data TO", "DATA TO", "pemeriksaan", "Pemeriksaan", "data pemeriksaan"]);
    var usersSheet = findSheetCaseInsensitive(ss, ["users", "user", "pengguna", "Users"]);
    var bankToData = bankToSheet ? readSheetData(bankToSheet) : [];
    var dataToData = dataToSheet ? readSheetData(dataToSheet) : [];
    var usersData = usersSheet ? readSheetData(usersSheet) : [];
    return jsonResponse({
      status: "success",
      bankTo: bankToData,
      targets: dataToData,
      users: usersData
    });
  }
  
  // ── Dashboard Data (Realisasi + Target + execSummary) ────────────────────
  if (action === "get_dashboard_data") {
    var date = e.parameter.date || getTodayDate();
    var unitCode = e.parameter.unit_code || "52350";
    return jsonResponse(getDashboardData(ss, date, unitCode));
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
function getDashboardData(ss, date, unitCode) {
  var uCode = unitCode || "52350";
  var parts = date.split("-");
  var year  = parts[0];
  var month = parseInt(parts[1], 10);
  
  // 1. Read Target sheet row for the given date
  var targetSheet = findSheetCaseInsensitive(ss, ["Target", "target", "TARGET", "Target P2TL"]);
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
        var rowUnit = String(r["UNIT"] || r["Unit"] || r["ULP"] || r["Ulp"] || "").toUpperCase().trim();
        var matchesUnit = false;
        
        if (uCode === "52350") {
          matchesUnit = true;
        } else if (uCode === "52351" && (rowUnit.indexOf("52351") !== -1 || rowUnit.indexOf("SALATIGA KOTA") !== -1)) {
          matchesUnit = true;
        } else if (uCode === "52352" && (rowUnit.indexOf("52352") !== -1 || rowUnit.indexOf("AMBARAWA") !== -1)) {
          matchesUnit = true;
        } else if (uCode === "52353" && (rowUnit.indexOf("52353") !== -1 || rowUnit.indexOf("UNGARAN") !== -1)) {
          matchesUnit = true;
        } else if (rowUnit === "") {
          matchesUnit = true;
        }
        
        if (matchesUnit) {
          if (uCode === "52350") {
            // For UP3, sum the targets of all units
            targetObj.targetHarianKwh      += toNum(r["Target Harian kWh"] || r["Target_Harian_kWh"] || r["targetHarianKwh"]);
            targetObj.targetKumulatifKwh   += toNum(r["Target Kumulatif kWh"] || r["Target_Kumulatif_kWh"] || r["targetKumulatifKwh"]);
            targetObj.targetLkbkPlg        += toNum(r["Target LKBK Plg"] || r["Target_LKBK_Plg"] || r["targetLkbkPlg"]);
            targetObj.target3PhasaPlg      += toNum(r["Target 3Phasa Plg"] || r["Target_3Phasa_Plg"] || r["target3PhasaPlg"]);
            targetObj.targetDlpdPlg        += toNum(r["Target DLPD Plg"] || r["Target_DLPD_Plg"] || r["targetDlpdPlg"]);
            targetObj.targetPengembanganPlg += toNum(r["Target Pengembangan Plg"] || r["Target_Pengembangan_Plg"] || r["targetPengembanganPlg"]);
            targetObj.targetTsPeriodikPlg  += toNum(r["Target TS Periodik Plg"] || r["Target_TS_Periodik_Plg"] || r["targetTsPeriodikPlg"]);
            targetObj.targetTsMacetPlg     += toNum(r["Target TS Macet Plg"] || r["Target_TS_Macet_Plg"] || r["targetTsMacetPlg"]);
            targetObj.targetLainnyaPlg     += toNum(r["Target Lainnya Plg"] || r["Target_Lainnya_Plg"] || r["targetLainnyaPlg"]);
          } else {
            // For specific unit, overwrite (or sum if there are duplicates)
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
    }
  }
  
  // 2. Read Realisasi sheet rows for that date + aggregates
  var realisasiSheet = findSheetCaseInsensitive(ss, ["Realisasi", "realisasi", "REALISASI", "Realisasi P2TL"]);
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
  
  // Dynamic monthly breakdowns
  var tariffMapMonth    = {};
  var golonganMapMonth  = {};
  var dayaMapMonth      = {};
  
  // Dynamic daily breakdowns
  var tariffMapDay    = {};
  var golonganMapDay  = {};
  var dayaMapDay      = {};
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
      
      var rowUnitCode = String(row.unitCode || "");
      var matchesRealUnit = false;
      if (uCode === "52350") {
        matchesRealUnit = true;
      } else if (uCode === "52351" && rowUnitCode === "52351") {
        matchesRealUnit = true;
      } else if (uCode === "52352" && rowUnitCode === "52352") {
        matchesRealUnit = true;
      } else if (uCode === "52353" && rowUnitCode === "52353") {
        matchesRealUnit = true;
      } else if (rowUnitCode === "") {
        // If unitCode could not be determined, include when filtering UP3 aggregate
        matchesRealUnit = (uCode === "52350");
      }
      
      if (!matchesRealUnit) continue;
      
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
      var tarif = (row.tarif || "").toUpperCase().trim();
      
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
        
        // Tariff breakdown (Yearly)
        if (tarif) {
          var tariffKey = tarif[0]; // R, B, S, I, P
          if (!tariffMap[tariffKey]) tariffMap[tariffKey] = { kwh: 0, cases: 0, ts: 0 };
          tariffMap[tariffKey].kwh   += kwh;
          tariffMap[tariffKey].cases += cases;
          tariffMap[tariffKey].ts    += hTs;
        }
        
        // Golongan breakdown (Yearly)
        var gol = (row.gol || "").toUpperCase().trim();
        if (gol) {
          if (!golonganMap[gol]) golonganMap[gol] = { kwh: 0, cases: 0, ts: 0 };
          golonganMap[gol].kwh   += kwh;
          golonganMap[gol].cases += cases;
          golonganMap[gol].ts    += hTs;
        }
        
        // Daya breakdown (Yearly)
        var daya = (row.daya || "").toUpperCase().trim();
        if (daya) {
          var dayaKey = classifyDaya(daya);
          if (!dayaMap[dayaKey]) dayaMap[dayaKey] = { kwh: 0, cases: 0, ts: 0 };
          dayaMap[dayaKey].kwh   += kwh;
          dayaMap[dayaKey].cases += cases;
          dayaMap[dayaKey].ts    += hTs;
        }

        // --- Monthly breakdown ---
        if (rowYear === year && parseInt(rowMonth, 10) === month) {
          if (tarif) {
            var tariffKey = tarif[0];
            if (!tariffMapMonth[tariffKey]) tariffMapMonth[tariffKey] = { kwh: 0, cases: 0, ts: 0 };
            tariffMapMonth[tariffKey].kwh   += kwh;
            tariffMapMonth[tariffKey].cases += cases;
            tariffMapMonth[tariffKey].ts    += hTs;
          }
          if (gol) {
            if (!golonganMapMonth[gol]) golonganMapMonth[gol] = { kwh: 0, cases: 0, ts: 0 };
            golonganMapMonth[gol].kwh   += kwh;
            golonganMapMonth[gol].cases += cases;
            golonganMapMonth[gol].ts    += hTs;
          }
          if (daya) {
            var dayaKey = classifyDaya(daya);
            if (!dayaMapMonth[dayaKey]) dayaMapMonth[dayaKey] = { kwh: 0, cases: 0, ts: 0 };
            dayaMapMonth[dayaKey].kwh   += kwh;
            dayaMapMonth[dayaKey].cases += cases;
            dayaMapMonth[dayaKey].ts    += hTs;
          }
        }

        // --- Daily breakdown ---
        if (rowDate === date) {
          if (tarif) {
            var tariffKey = tarif[0];
            if (!tariffMapDay[tariffKey]) tariffMapDay[tariffKey] = { kwh: 0, cases: 0, ts: 0 };
            tariffMapDay[tariffKey].kwh   += kwh;
            tariffMapDay[tariffKey].cases += cases;
            tariffMapDay[tariffKey].ts    += hTs;
          }
          if (gol) {
            if (!golonganMapDay[gol]) golonganMapDay[gol] = { kwh: 0, cases: 0, ts: 0 };
            golonganMapDay[gol].kwh   += kwh;
            golonganMapDay[gol].cases += cases;
            golonganMapDay[gol].ts    += hTs;
          }
          if (daya) {
            var dayaKey = classifyDaya(daya);
            if (!dayaMapDay[dayaKey]) dayaMapDay[dayaKey] = { kwh: 0, cases: 0, ts: 0 };
            dayaMapDay[dayaKey].kwh   += kwh;
            dayaMapDay[dayaKey].cases += cases;
            dayaMapDay[dayaKey].ts    += hTs;
          }
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
  
  // Helper to build breakdown arrays
  var buildBreakdown = function(map) {
    return Object.keys(map).map(function(k) {
      return { class: k, kwh: map[k].kwh, cases: map[k].cases, ts: map[k].ts || 0 };
    });
  };

  // Build tariff breakdown (Yearly)
  var tariffBreakdown = buildBreakdown(tariffMap);
  var golonganBreakdown = buildBreakdown(golonganMap);
  var dayaBreakdown = buildBreakdown(dayaMap);

  // Dynamic monthly breakdowns
  var tariffBreakdownMonth = buildBreakdown(tariffMapMonth);
  var golonganBreakdownMonth = buildBreakdown(golonganMapMonth);
  var dayaBreakdownMonth = buildBreakdown(dayaMapMonth);

  // Dynamic daily breakdowns
  var tariffBreakdownDay = buildBreakdown(tariffMapDay);
  var golonganBreakdownDay = buildBreakdown(golonganMapDay);
  var dayaBreakdownDay = buildBreakdown(dayaMapDay);
  
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
      
      tariffBreakdownMonth: tariffBreakdownMonth,
      golonganBreakdownMonth: golonganBreakdownMonth,
      dayaBreakdownMonth: dayaBreakdownMonth,

      tariffBreakdownDay: tariffBreakdownDay,
      golonganBreakdownDay: golonganBreakdownDay,
      dayaBreakdownDay: dayaBreakdownDay,

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
  var realisasiSheet = findSheetCaseInsensitive(ss, ["Realisasi", "realisasi", "REALISASI", "Realisasi P2TL"]);
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
  var targetSheet = findSheetCaseInsensitive(ss, ["Target", "target", "TARGET", "Target P2TL"]);
  if (!targetSheet) {
    var defaults = [];
    for (var i = 1; i <= 12; i++) {
      defaults.push({ Month: i, Year: year, Target_kWh: 0 });
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
      result.push({ Month: m, Year: year, Target_kWh: 0 });
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
    var hasContent = false;
    for (var k = 0; k < row.length; k++) {
      if (row[k] !== "" && row[k] !== null && row[k] !== undefined) {
        hasContent = true;
        break;
      }
    }
    if (!hasContent) continue;

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var h = String(headers[j] || "").trim();
      if (!h) continue;
      var cellVal = row[j];
      if (cellVal instanceof Date) {
        try {
          cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd HH:mm:ss");
        } catch(e) {
          cellVal = cellVal.toISOString();
        }
      }
      obj[h] = cellVal;
    }
    data.push(obj);
  }
  return data;
}

// ── Helper: custom parser for Realisasi sheet layout ──────────────────────
function readRealisasiSheetData(sheet) {
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  // Find the header row (typically row 1, or within first 15 rows)
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
  
  // Dynamically find where actual data rows start
  var dataStartIdx = headerRowIdx + 1;
  for (var r = headerRowIdx + 1; r < Math.min(rows.length, headerRowIdx + 6); r++) {
    var checkNo = parseInt(String(rows[r][0] || "").trim(), 10);
    var checkAgenda = String(rows[r][1] || "").toUpperCase();
    if (!isNaN(checkNo) && checkNo === 1) {
      dataStartIdx = r;
      break;
    }
    if (checkAgenda.indexOf("P2TL/") !== -1) {
      dataStartIdx = r;
      break;
    }
  }

  // Scan and map all header columns across header rows (supports single-row and multi-tier headers)
  var colMap = {};
  var numCols = rows[headerRowIdx].length;
  for (var c = 0; c < numCols; c++) {
    var combinedName = "";
    for (var hr = headerRowIdx; hr < dataStartIdx; hr++) {
      var cellVal = String(rows[hr][c] || "").trim();
      if (cellVal) {
        combinedName += (combinedName ? " " : "") + cellVal;
      }
    }
    var norm = combinedName.toUpperCase().replace(/[\s_()/-]/g, "");
    
    if (norm === "NOAGENDA" || norm === "NOMORAGENDA" || norm === "AGENDA") {
      colMap["noagenda"] = c;
    } else if (norm === "IDPEL" || norm === "IDPELANGGAN" || norm === "NOMORPELANGGAN" || norm === "NOPEL") {
      colMap["idpel"] = c;
    } else if (norm === "NAMA" || norm === "NAMAPELANGGAN") {
      colMap["nama"] = c;
    } else if (norm === "GOL" || norm === "GOLONGAN" || norm === "GOLTARIF") {
      colMap["gol"] = c;
    } else if (norm === "ALAMAT") {
      colMap["alamat"] = c;
    } else if (norm === "TARIFDAYA" || norm === "TARIPDAYA") {
      colMap["tarif_daya"] = c;
    } else if (norm === "TARIF" || norm === "TARIP" || norm === "TRF") {
      colMap["tarif"] = c;
    } else if (norm === "DAYA") {
      colMap["daya"] = c;
    } else if (norm === "KWH" || norm === "TSKWH" || norm === "TAGIHANSUSULANKWH" || norm === "REALISASIKWH") {
      colMap["kwh"] = c;
    } else if (norm === "RPTS" || norm === "TS" || norm === "TAGIHANSUSULAN" || norm === "RPTAGIHANSUSULAN" || norm === "TOTALTS" || norm === "NILAITS" || (combinedName.toUpperCase().indexOf("SUSULAN") !== -1 && combinedName.toUpperCase().indexOf("TS") !== -1)) {
      colMap["ts"] = c;
    } else if (norm === "RPKWH") {
      colMap["rp_kwh"] = c;
    } else if (norm === "RPBEBAN") {
      colMap["rp_beban"] = c;
    } else if (norm === "TOTALP2TL" || norm === "TOTALTAGIHAN") {
      colMap["total_p2tl"] = c;
    } else if (norm === "TUNAI" || norm === "BAYARTUNAI") {
      colMap["tunai"] = c;
    } else if (norm === "RPTOTALANGSUR" || norm === "ANGSURAN") {
      colMap["total_angsur"] = c;
    } else if (norm === "TGLREGISTER" || norm === "TANGGALREGISTER" || norm === "TGLREG" || norm === "TANGGALREG") {
      colMap["tanggal_register"] = c;
    } else if (norm === "TGLSPH" || norm === "TANGGALSPH" || norm === "TGLBA" || norm === "TANGGALBA" || norm === "TGLPELAKSANAAN" || norm === "TANGGALPELAKSANAAN") {
      colMap["tanggal_sph"] = c;
    } else if (norm === "NOSIP" || norm === "SIP") {
      colMap["no_sip"] = c;
    } else if (norm === "NOSPH" || norm === "SPH") {
      colMap["no_sph"] = c;
    } else if (norm === "NOREGISTER" || norm === "NOMOREGISTER" || norm === "NOREG" || norm === "REGISTER") {
      colMap["no_register"] = c;
    }
  }
  
  // Intelligent fallbacks based on standard column layout if headers were ambiguous
  if (colMap["noagenda"] === undefined) colMap["noagenda"] = 1;
  if (colMap["idpel"] === undefined) colMap["idpel"] = 2;
  if (colMap["nama"] === undefined) colMap["nama"] = 3;
  if (colMap["gol"] === undefined) colMap["gol"] = 4;
  if (colMap["alamat"] === undefined) colMap["alamat"] = 5;
  if (colMap["tarif"] === undefined && colMap["tarif_daya"] === undefined) colMap["tarif"] = 6;
  if (colMap["daya"] === undefined && colMap["tarif_daya"] === undefined) colMap["daya"] = 7;
  if (colMap["kwh"] === undefined) colMap["kwh"] = 8;
  if (colMap["ts"] === undefined) colMap["ts"] = 11;
  if (colMap["tanggal_register"] === undefined) colMap["tanggal_register"] = 18;
  if (colMap["tanggal_sph"] === undefined) colMap["tanggal_sph"] = 20;
  
  var data = [];
  
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
    
    var tarif = colMap["tarif"] !== undefined ? String(row[colMap["tarif"]] || "").trim() : "";
    var daya = colMap["daya"] !== undefined ? String(row[colMap["daya"]] || "").trim() : "";
    var tarifDaya = colMap["tarif_daya"] !== undefined ? String(row[colMap["tarif_daya"]] || "").trim() : "";
    
    if (!tarif && tarifDaya) {
      tarif = tarifDaya.split("/")[0] || "";
    }
    if (!daya && tarifDaya) {
      daya = tarifDaya.split("/")[1] || "";
    }
    if (!tarifDaya && tarif) {
      tarifDaya = tarif + (daya ? "/" + daya : "");
    }
    
    var noregister = "";
    if (colMap["no_register"] !== undefined) {
      noregister = String(row[colMap["no_register"]] || "").trim();
    } else if (colMap["no_sip"] !== undefined) {
      noregister = String(row[colMap["no_sip"]] || "").trim();
    } else if (colMap["no_sph"] !== undefined) {
      noregister = String(row[colMap["no_sph"]] || "").trim();
    }
    
    // ── Detect unit code for this row ──────────────────────────────────────
    // Priority 1: parse code from No Agenda after "P2TL/" e.g. "P2TL/52353/..." or direct 5-digit unit prefix
    var unitCode = "";
    var agendaUpper = noagenda.toUpperCase();
    var p2tlIdx = agendaUpper.indexOf("P2TL/");
    if (p2tlIdx !== -1) {
      var afterP2tl = noagenda.substring(p2tlIdx + 5);
      var codeMatch = afterP2tl.match(/^(\d{5})/);
      if (codeMatch) unitCode = codeMatch[1];
    } else {
      var directMatch = agendaUpper.match(/^(\d{5})/);
      if (directMatch && /^5235[0-3]$/.test(directMatch[1])) {
        unitCode = directMatch[1];
      }
    }
    // Priority 2: first 5 digits of No Register / SIP if distinct from IDPEL
    if (!unitCode && noregister && noregister.length >= 5) {
      var regMatch = noregister.replace(/[^\d]/g, "").substring(0, 5);
      if (/^5235[0-3]$/.test(regMatch)) unitCode = regMatch;
    }
    // Priority 3: first 5 digits of IDPEL
    if (!unitCode && idpel.length >= 5) {
      var idMatch = idpel.replace(/[^\d]/g, "").substring(0, 5);
      if (/^5235[0-3]$/.test(idMatch)) unitCode = idMatch;
    }
    
    var kwh = colMap["kwh"] !== undefined ? toNum(row[colMap["kwh"]]) : 0;
    var ts  = colMap["ts"]  !== undefined ? toNum(row[colMap["ts"]])  : 0;
    
    // Priority date: TGL REGISTER, then TGL SPH, then scan fallback
    var dateVal = "";
    if (colMap["tanggal_register"] !== undefined) {
      dateVal = normalizeDateCell(row[colMap["tanggal_register"]]);
    }
    if (!dateVal && colMap["tanggal_sph"] !== undefined) {
      dateVal = normalizeDateCell(row[colMap["tanggal_sph"]]);
    }
    if (!dateVal && row.length > 20) {
      for (var dc = 18; dc < Math.min(row.length, 25); dc++) {
        var cand = normalizeDateCell(row[dc]);
        if (cand && cand.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dateVal = cand;
          break;
        }
      }
    }
    
    var classif = classifyFinding(gol, tarifDaya, daya, tarif);
    
    // Do not count as case/finding if kwh is 0, unless gol is "P1"
    if (kwh === 0 && gol !== "P1") {
      classif = {
        lkbk: 0,
        ph3: 0,
        dlpd: 0,
        peng: 0,
        tsp: 0,
        tsm: 0,
        lain: 0
      };
    }
    
    data.push({
      "No": noVal,
      "No Agenda": noagenda,
      "noagenda": noagenda,
      "IDPEL": idpel,
      "idpel": idpel,
      "unitCode": unitCode,
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
      "Realisasi_Harian_TS": ts,
      "Realisasi Kumulatif TS": ts,
      "Realisasi LKBK Plg": classif.lkbk,
      "Realisasi_LKBK_Plg": classif.lkbk,
      "Realisasi 3Phasa Plg": classif.ph3,
      "Realisasi_3Phasa_Plg": classif.ph3,
      "Realisasi DLPD Plg": classif.dlpd,
      "Realisasi_DLPD_Plg": classif.dlpd,
      "Realisasi Pengembangan Plg": classif.peng,
      "Realisasi_Pengembangan_Plg": classif.peng,
      "Realisasi TS Periodik Plg": classif.tsp,
      "Realisasi_TS_Periodik_Plg": classif.tsp,
      "Realisasi TS Macet Plg": classif.tsm,
      "Realisasi_TS_Macet_Plg": classif.tsm,
      "Realisasi Lainnya Plg": classif.lain,
      "Realisasi_Lainnya_Plg": classif.lain,
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
function classifyFinding(golType, tarifDaya, dayaVal, tarifVal) {
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
  var trf = String(tarifVal || "").toUpperCase().trim();
  var dNum = toNum(dayaVal);
  
  var is3Phasa = gol.indexOf("3P") !== -1 || td.indexOf("3P") !== -1 || td.indexOf("3 PHASA") !== -1 || td.indexOf("3PHASA") !== -1 ||
                 trf === "I3" || trf === "I4" || trf === "B3" || trf === "P2" || trf === "S3" ||
                 (dNum >= 6600 && dNum !== 7700);
  
  if (gol.indexOf("LKBK") !== -1) {
    res.lkbk = 1;
  } else if (is3Phasa) {
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
    var sheet = findSheetCaseInsensitive(ss, ["bank to", "bankto", "bank_to", "Bank TO", "BANK TO"]);
    if (!sheet) sheet = ss.insertSheet("bank to");
    writeSheetData(sheet, postData.data, [
      "IDPEL", "NAMA", "ALAMAT", "TARIF", "DAYA", "GARDU", "TIANG", 
      "UNIT", "JAM NYALA", "JENIS TO", "LATITUDE", "LONGITUDE", "SUBDLPD", "LAST UPDATED"
    ]);
    return jsonResponse({ status: "success" });
  }
  
  if (action === "syncDataTo") {
    var sheet = findSheetCaseInsensitive(ss, ["data to", "datato", "data_to", "Data TO", "DATA TO", "pemeriksaan", "Pemeriksaan", "data pemeriksaan"]);
    if (!sheet) sheet = ss.insertSheet("data to");
    writeSheetData(sheet, postData.data, [
      "No", "IDPel", "Nama Pelanggan", "Tarif", "Daya", "Gardu", "Tiang", 
      "ULP", "UP3", "DLPD", "Sub DLPD", "Tanggal Upload", "Regu Petugas", 
      "Tanggal Order", "Tanggal Pelaksanaan", "Status Progress", "Durasi (Menit)", 
      "Sumber", "bank_id", "LAST UPDATED"
    ]);
    return jsonResponse({ status: "success" });
  }
  
  // Save monthly targets
  if (action === "save_monthly_targets") {
    var year    = postData.year || new Date().getFullYear().toString();
    var targets = postData.targets || [];
    var sheet   = findSheetCaseInsensitive(ss, ["Target", "target", "TARGET", "Target P2TL"]);
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
  
  if (action === "syncUsers") {
    var sheet = findSheetCaseInsensitive(ss, ["users", "user", "pengguna", "Users"]);
    if (!sheet) sheet = ss.insertSheet("users");
    writeSheetData(sheet, postData.data, [
      "username", "password", "role", "whatsapp", "unit", "lastUpdated"
    ]);
    return jsonResponse({ status: "success" });
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
