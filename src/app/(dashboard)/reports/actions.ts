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

  let paymentsQuery = supabase.from("payments").select("*, patients(first_name, last_name, phone, patient_code)").order("paid_at", { ascending: false });
  if (dateFrom) paymentsQuery = paymentsQuery.gte("paid_at", dateFrom);
  const { data: payments } = await paymentsQuery;

  const totalRevenue = (payments ?? []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalInvoiced = (invoices ?? []).reduce((sum, i) => sum + (i.total || 0), 0);
  const unpaidInvoices = (invoices ?? []).filter(i => i.status === "unpaid");
  const completedAppointments = (appointments ?? []).filter(a => a.status === "completed");
  const cancelledAppointments = (appointments ?? []).filter(a => a.status === "cancelled");
  const checkedInAppointments = (appointments ?? []).filter(a => a.status === "checked_in");

  return {
    summary: {
      totalPatients: (patients ?? []).length,
      totalAppointments: (appointments ?? []).length,
      completedAppointments: completedAppointments.length,
      cancelledAppointments: cancelledAppointments.length,
      checkedIn: checkedInAppointments.length,
      totalInvoices: (invoices ?? []).length,
      unpaidInvoices: unpaidInvoices.length,
      totalInvoiced,
      totalRevenue,
      outstandingAmount: totalInvoiced - totalRevenue,
      totalPayments: (payments ?? []).length,
    },
    patients: patients ?? [],
    appointments: appointments ?? [],
    invoices: invoices ?? [],
    payments: payments ?? [],
  };
}

export async function downloadReportCSV(range: DateRange) {
  const reportData = await generateReport(range);
  if ("error" in reportData) return { error: reportData.error };

  const lines: string[] = [];

  const rangeLabels: Record<DateRange, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last_7_days: "Last 7 Days",
    last_30_days: "Last 30 Days",
    last_6_months: "Last 6 Months",
    last_year: "Last Year",
    all_time: "All Time",
  };

  lines.push(`CLINIC REPORT - ${rangeLabels[range]}`);
  lines.push(`Generated,${new Date().toLocaleString()}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(`Total Patients,${reportData.summary.totalPatients}`);
  lines.push(`Total Appointments,${reportData.summary.totalAppointments}`);
  lines.push(`Completed Appointments,${reportData.summary.completedAppointments}`);
  lines.push(`Cancelled Appointments,${reportData.summary.cancelledAppointments}`);
  lines.push(`Checked In,${reportData.summary.checkedIn}`);
  lines.push(`Total Invoices,${reportData.summary.totalInvoices}`);
  lines.push(`Unpaid Invoices,${reportData.summary.unpaidInvoices}`);
  lines.push(`Total Invoiced (PKR),${reportData.summary.totalInvoiced}`);
  lines.push(`Total Revenue (PKR),${reportData.summary.totalRevenue}`);
  lines.push(`Outstanding (PKR),${reportData.summary.outstandingAmount}`);
  lines.push(`Total Payments,${reportData.summary.totalPayments}`);
  lines.push("");

  lines.push("PATIENTS");
  lines.push("Patient Code,First Name,Last Name,Phone,Email,Gender,Date of Birth,Status,Registered On");
  for (const p of reportData.patients) {
    lines.push(`${p.patient_code},${esc(p.first_name)},${esc(p.last_name)},${p.phone},${p.email || ""},${p.gender || ""},${p.date_of_birth || ""},${p.status},${p.created_at}`);
  }
  lines.push("");

  lines.push("APPOINTMENTS");
  lines.push("Appointment Code,Patient,Phone,Physiotherapist,Date,Start Time,End Time,Type,Status,Notes");
  for (const a of reportData.appointments) {
    const patient = a.patients as any;
    const physio = a.physiotherapists as any;
    lines.push(`${a.appointment_code},${esc(patient?.first_name + " " + patient?.last_name)},${patient?.phone || ""},${esc("Dr. " + (physio?.first_name || "") + " " + (physio?.last_name || ""))},${a.appointment_date},${a.start_time},${a.end_time || ""},${a.appointment_type || ""},${a.status},${esc(a.notes || "")}`);
  }
  lines.push("");

  lines.push("INVOICES");
  lines.push("Invoice Code,Patient,Phone,Subtotal,Discount,Total,Status,Collected By,Issued At");
  for (const i of reportData.invoices) {
    const patient = i.patients as any;
    lines.push(`${i.invoice_code},${esc(patient?.first_name + " " + patient?.last_name)},${patient?.phone || ""},${i.subtotal},${i.discount},${i.total},${i.status},${i.collected_by || ""},${i.issued_at}`);
  }
  lines.push("");

  lines.push("PAYMENTS");
  lines.push("Payment Code,Patient,Phone,Amount,Method,Status,Paid At");
  for (const p of reportData.payments) {
    const patient = p.patients as any;
    lines.push(`${p.payment_code || ""},${esc(patient?.first_name + " " + patient?.last_name)},${patient?.phone || ""},${p.amount},${p.payment_method},${p.payment_status},${p.paid_at}`);
  }

  return { csv: lines.join("\n"), filename: `clinic-report-${range}-${new Date().toISOString().split("T")[0]}.csv` };
}

function esc(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}
