"use server";

import { createClient } from "@/lib/supabase/server";

export type DateRange = "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_6_months" | "last_year" | "all_time";

function getDateFilter(range: DateRange): string | null {
  const now = new Date();
  switch (range) {
    case "today":
      return now.toISOString().split("T")[0];
    case "yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    }
    case "last_7_days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    }
    case "last_30_days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d.toISOString().split("T")[0];
    }
    case "last_6_months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().split("T")[0];
    }
    case "last_year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().split("T")[0];
    }
    case "all_time":
      return null;
  }
}

export async function generateReport(range: DateRange) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: clinicUser } = await supabase
    .from("clinic_users")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!clinicUser || clinicUser.role !== "admin") {
    return { error: "Access denied. Admin only." };
  }

  const dateFrom = getDateFilter(range);

  let patientsQuery = supabase.from("patients").select("*").order("created_at", { ascending: false });
  if (dateFrom) patientsQuery = patientsQuery.gte("created_at", dateFrom);
  const { data: patients } = await patientsQuery;

  let appointmentsQuery = supabase.from("appointments").select("*, patients(first_name, last_name, phone, patient_code), physiotherapists(first_name, last_name)").order("appointment_date", { ascending: false });
  if (dateFrom) appointmentsQuery = appointmentsQuery.gte("appointment_date", dateFrom);
  const { data: appointments } = await appointmentsQuery;

  let invoicesQuery = supabase.from("invoices").select("*, patients(first_name, last_name, phone, patient_code)").order("issued_at", { ascending: false });
  if (dateFrom) invoicesQuery = invoicesQuery.gte("issued_at", dateFrom);
  const { data: invoices } = await invoicesQuery;

  const totalInvoiced = (invoices ?? []).reduce((sum, i) => sum + (i.total || 0), 0);
  const totalRevenue = (invoices ?? []).filter(i => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);

  return {
    summary: {
      totalPatients: (patients ?? []).length,
      totalAppointments: (appointments ?? []).length,
      completedAppointments: (appointments ?? []).filter(a => a.status === "completed").length,
      cancelledAppointments: (appointments ?? []).filter(a => a.status === "cancelled").length,
      checkedIn: (appointments ?? []).filter(a => a.status === "checked_in").length,
      totalInvoices: (invoices ?? []).length,
      unpaidInvoices: (invoices ?? []).filter(i => i.status === "unpaid").length,
      totalInvoiced,
      totalRevenue,
      outstandingAmount: totalInvoiced - totalRevenue,
    },
    patients: patients ?? [],
    appointments: appointments ?? [],
    invoices: invoices ?? [],
  };
}

export async function downloadReportExcel(range: DateRange) {
  const reportData = await generateReport(range);
  if ("error" in reportData) return { error: reportData.error };

  const XLSX = (await import("xlsx-js-style")).default;

  const BLUE = "1F4E79";
  const LIGHT_BLUE = "D6E4F0";
  const WHITE = "FFFFFF";
  const GRAY_BG = "F2F2F2";
  const BORDER_COLOR = "B4C6E7";

  const thin = { style: "thin" as const, color: { rgb: BORDER_COLOR } };
  const borders = { top: thin, bottom: thin, left: thin, right: thin };

  const headerStyle = {
    font: { bold: true, color: { rgb: WHITE }, sz: 11, name: "Calibri" },
    fill: { fgColor: { rgb: BLUE } },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
    border: borders,
  };

  const titleStyle = {
    font: { bold: true, color: { rgb: BLUE }, sz: 14, name: "Calibri" },
    alignment: { horizontal: "left" as const, vertical: "center" as const },
  };

  const subtitleStyle = {
    font: { bold: true, color: { rgb: BLUE }, sz: 11, name: "Calibri" },
    fill: { fgColor: { rgb: LIGHT_BLUE } },
    alignment: { horizontal: "left" as const, vertical: "center" as const },
    border: borders,
  };

  const cellStyle = {
    font: { sz: 10, name: "Calibri" },
    alignment: { vertical: "center" as const },
    border: borders,
  };

  const cellCenterStyle = { ...cellStyle, alignment: { ...cellStyle.alignment, horizontal: "center" as const } };
  const currencyStyle = { ...cellStyle, alignment: { ...cellStyle.alignment, horizontal: "right" as const }, numFmt: "#,##0" };
  const altRowStyle = { ...cellStyle, fill: { fgColor: { rgb: GRAY_BG } } };
  const altCurrencyStyle = { ...currencyStyle, fill: { fgColor: { rgb: GRAY_BG } } };
  const altCenterStyle = { ...cellCenterStyle, fill: { fgColor: { rgb: GRAY_BG } } };
  const metricLabelStyle = { font: { sz: 10, name: "Calibri", bold: true }, alignment: { vertical: "center" as const }, border: borders };
  const metricValueStyle = { font: { sz: 10, name: "Calibri", bold: true }, alignment: { vertical: "center" as const, horizontal: "right" as const }, border: borders, numFmt: "#,##0" };

  function styledCell(v: any, s: any) {
    if (typeof v === "number") return { v, t: "n" as const, s };
    return { v: v ?? "", t: "s" as const, s };
  }

  function buildStyledSheet(headers: string[], rows: any[][], colWidths: number[], currencyCols: number[] = [], centerCols: number[] = []) {
    const ws: any = {};
    const totalRows = rows.length + 1;
    const totalCols = headers.length;

    for (let c = 0; c < totalCols; c++) {
      ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: headers[c], t: "s", s: headerStyle };
    }

    for (let r = 0; r < rows.length; r++) {
      const isAlt = r % 2 === 1;
      for (let c = 0; c < totalCols; c++) {
        const ref = XLSX.utils.encode_cell({ r: r + 1, c });
        const isCurrency = currencyCols.includes(c);
        const isCenter = centerCols.includes(c);
        let style;
        if (isCurrency) style = isAlt ? altCurrencyStyle : currencyStyle;
        else if (isCenter) style = isAlt ? altCenterStyle : cellCenterStyle;
        else style = isAlt ? altRowStyle : cellStyle;
        ws[ref] = styledCell(rows[r][c], style);
      }
    }

    ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows - 1, c: totalCols - 1 } });
    ws["!cols"] = colWidths.map(wch => ({ wch }));
    ws["!rows"] = [{ hpt: 28 }, ...rows.map(() => ({ hpt: 22 }))];
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }) };
    return ws;
  }

  const rangeLabels: Record<DateRange, string> = {
    today: "Today", yesterday: "Yesterday", last_7_days: "Last 7 Days",
    last_30_days: "Last 30 Days", last_6_months: "Last 6 Months",
    last_year: "Last Year", all_time: "All Time",
  };
  const rangeLabel = rangeLabels[range];

  const wb = XLSX.utils.book_new();

  // --- SUMMARY ---
  const ws: any = {};
  let row = 0;
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: "CLINIC REPORT", t: "s", s: titleStyle };
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  row++;
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: "Date Range", t: "s", s: { ...metricLabelStyle, fill: { fgColor: { rgb: LIGHT_BLUE } } } };
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: rangeLabel, t: "s", s: { ...cellStyle, fill: { fgColor: { rgb: LIGHT_BLUE } } } };
  row++;
  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: "Generated", t: "s", s: metricLabelStyle };
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: new Date().toLocaleString(), t: "s", s: cellStyle };
  row += 2;

  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: "OVERVIEW", t: "s", s: subtitleStyle };
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: "", t: "s", s: subtitleStyle };
  row++;
  for (const [label, val] of [
    ["Total Patients", reportData.summary.totalPatients],
    ["Total Appointments", reportData.summary.totalAppointments],
    ["Completed", reportData.summary.completedAppointments],
    ["Cancelled", reportData.summary.cancelledAppointments],
    ["Checked In", reportData.summary.checkedIn],
  ] as const) {
    const isAlt = row % 2 === 0;
    const bg = isAlt ? { fill: { fgColor: { rgb: GRAY_BG } } } : {};
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: label, t: "s", s: { ...metricLabelStyle, ...bg } };
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: val, t: "n", s: { ...metricValueStyle, ...bg } };
    row++;
  }
  row++;

  ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: "FINANCIAL SUMMARY", t: "s", s: subtitleStyle };
  ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: "", t: "s", s: subtitleStyle };
  row++;
  for (const [label, val] of [
    ["Total Invoiced (PKR)", reportData.summary.totalInvoiced],
    ["Revenue Collected (PKR)", reportData.summary.totalRevenue],
    ["Outstanding (PKR)", reportData.summary.outstandingAmount],
    ["Total Invoices", reportData.summary.totalInvoices],
    ["Unpaid Invoices", reportData.summary.unpaidInvoices],
  ] as const) {
    const isAlt = row % 2 === 0;
    const bg = isAlt ? { fill: { fgColor: { rgb: GRAY_BG } } } : {};
    ws[XLSX.utils.encode_cell({ r: row, c: 0 })] = { v: label, t: "s", s: { ...metricLabelStyle, ...bg } };
    ws[XLSX.utils.encode_cell({ r: row, c: 1 })] = { v: val, t: "n", s: { ...metricValueStyle, ...bg, numFmt: "#,##0" } };
    row++;
  }
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: 1 } });
  ws["!cols"] = [{ wch: 28 }, { wch: 24 }];
  ws["!rows"] = Array.from({ length: row }, (_, i) => ({ hpt: i === 0 ? 32 : 22 }));
  XLSX.utils.book_append_sheet(wb, ws, "Summary");

  // --- PATIENTS ---
  const patientInvoicedMap: Record<string, number> = {};
  const patientPaidMap: Record<string, number> = {};
  for (const inv of reportData.invoices) {
    patientInvoicedMap[inv.patient_id] = (patientInvoicedMap[inv.patient_id] || 0) + (inv.total || 0);
    if (inv.status === "paid") {
      patientPaidMap[inv.patient_id] = (patientPaidMap[inv.patient_id] || 0) + (inv.total || 0);
    }
  }
  const patientRows = reportData.patients.map((p: any) => {
    const invoiced = patientInvoicedMap[p.id] || 0;
    const paid = patientPaidMap[p.id] || 0;
    return [
      p.patient_code, `${p.first_name} ${p.last_name}`, p.phone, p.gender || "—",
      (p.status as string).charAt(0).toUpperCase() + (p.status as string).slice(1),
      p.credit_balance || 0, invoiced, paid, invoiced - paid, p.created_at?.split("T")[0] || "",
    ];
  });
  XLSX.utils.book_append_sheet(wb,
    buildStyledSheet(["Code", "Name", "Phone", "Gender", "Status", "Credit Balance", "Total Invoiced", "Total Paid", "Dues", "Registered"],
      patientRows, [12, 22, 16, 10, 10, 16, 16, 14, 14, 14], [5, 6, 7, 8], [3, 4]),
    "Patients"
  );

  // --- APPOINTMENTS ---
  const statusLabel = (s: string) => s.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const apptRows = reportData.appointments.map((a: any) => {
    const pat = a.patients as any;
    const phy = a.physiotherapists as any;
    return [
      a.appointment_code, pat ? `${pat.first_name} ${pat.last_name}` : "", pat?.phone || "",
      phy ? `Dr. ${phy.first_name} ${phy.last_name}` : "", a.appointment_date, a.start_time,
      a.appointment_type || "—", statusLabel(a.status),
    ];
  });
  XLSX.utils.book_append_sheet(wb,
    buildStyledSheet(["Code", "Patient", "Phone", "Physiotherapist", "Date", "Time", "Type", "Status"],
      apptRows, [14, 22, 16, 24, 14, 10, 14, 14], [], [4, 5, 7]),
    "Appointments"
  );

  // --- INVOICES ---
  const collectedByLabel = (v: string | null) => {
    if (!v) return ""; if (v === "reception") return "At Reception";
    if (v === "doctor") return "By Doctor"; if (v === "credit") return "Credit Settlement"; return v;
  };
  const invRows = reportData.invoices.map((i: any) => {
    const pat = i.patients as any;
    return [
      i.invoice_code, pat ? `${pat.first_name} ${pat.last_name}` : "", pat?.phone || "",
      i.subtotal, i.discount, i.total,
      i.status === "paid" ? "Paid" : i.status === "partially_paid" ? "Partially Paid" : i.status === "cancelled" ? "Cancelled" : "Unpaid",
      i.status === "paid" ? collectedByLabel(i.collected_by) : "",
      i.payment_confirmed_at?.split("T")[0] || "", i.issued_at?.split("T")[0] || "",
    ];
  });
  XLSX.utils.book_append_sheet(wb,
    buildStyledSheet(["Code", "Patient", "Phone", "Subtotal", "Discount", "Total", "Status", "Collected By", "Payment Date", "Issued Date"],
      invRows, [14, 22, 16, 14, 14, 14, 14, 18, 14, 14], [3, 4, 5], [6, 8, 9]),
    "Invoices"
  );

  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

  return {
    base64: wbout,
    filename: `Clinic_Report_${rangeLabel.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`,
  };
}
