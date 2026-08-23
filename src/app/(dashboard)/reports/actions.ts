"use server";

import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

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

export async function sendReportEmail(range: DateRange) {
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

  const reportData = await generateReport(range);
  if ("error" in reportData) return { error: reportData.error };

  const rangeLabels: Record<DateRange, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last_7_days: "Last 7 Days",
    last_30_days: "Last 30 Days",
    last_6_months: "Last 6 Months",
    last_year: "Last Year",
    all_time: "All Time",
  };

  const csv = buildCSV(reportData);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { error: "Email service not configured. Add RESEND_API_KEY to your environment." };
  }

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: "Clinic Reports <onboarding@resend.dev>",
    to: "itztheshaheer@gmail.com",
    subject: `Clinic Report - ${rangeLabels[range]} (${new Date().toLocaleDateString()})`,
    html: `
      <h2>Clinic Report - ${rangeLabels[range]}</h2>
      <p>Generated on ${new Date().toLocaleString()}</p>
      <h3>Summary</h3>
      <ul>
        <li><strong>Patients:</strong> ${reportData.summary.totalPatients}</li>
        <li><strong>Appointments:</strong> ${reportData.summary.totalAppointments} (${reportData.summary.completedAppointments} completed, ${reportData.summary.cancelledAppointments} cancelled)</li>
        <li><strong>Invoices:</strong> ${reportData.summary.totalInvoices} (${reportData.summary.unpaidInvoices} unpaid)</li>
        <li><strong>Total Revenue:</strong> PKR ${reportData.summary.totalRevenue.toLocaleString()}</li>
        <li><strong>Outstanding:</strong> PKR ${reportData.summary.outstandingAmount.toLocaleString()}</li>
        <li><strong>Payments:</strong> ${reportData.summary.totalPayments}</li>
      </ul>
      <p>See attached CSV for full details.</p>
    `,
    attachments: [
      {
        filename: `clinic-report-${range}-${new Date().toISOString().split("T")[0]}.csv`,
        content: Buffer.from(csv).toString("base64"),
        contentType: "text/csv",
      },
    ],
  });

  if (error) return { error: "Failed to send email: " + error.message };
  return { success: true };
}

function buildCSV(data: { summary: any; patients: any[]; appointments: any[]; invoices: any[]; payments: any[] }) {
  const lines: string[] = [];

  lines.push("=== CLINIC REPORT ===");
  lines.push("");
  lines.push("SUMMARY");
  lines.push(`Total Patients,${data.summary.totalPatients}`);
  lines.push(`Total Appointments,${data.summary.totalAppointments}`);
  lines.push(`Completed Appointments,${data.summary.completedAppointments}`);
  lines.push(`Cancelled Appointments,${data.summary.cancelledAppointments}`);
  lines.push(`Checked In,${data.summary.checkedIn}`);
  lines.push(`Total Invoices,${data.summary.totalInvoices}`);
  lines.push(`Unpaid Invoices,${data.summary.unpaidInvoices}`);
  lines.push(`Total Invoiced (PKR),${data.summary.totalInvoiced}`);
  lines.push(`Total Revenue (PKR),${data.summary.totalRevenue}`);
  lines.push(`Outstanding (PKR),${data.summary.outstandingAmount}`);
  lines.push(`Total Payments,${data.summary.totalPayments}`);
  lines.push("");

  lines.push("PATIENTS");
  lines.push("Patient Code,First Name,Last Name,Phone,Email,Gender,Date of Birth,Status,Registered On");
  for (const p of data.patients) {
    lines.push(`${p.patient_code},${esc(p.first_name)},${esc(p.last_name)},${p.phone},${p.email || ""},${p.gender || ""},${p.date_of_birth || ""},${p.status},${p.created_at}`);
  }
  lines.push("");

  lines.push("APPOINTMENTS");
  lines.push("Appointment Code,Patient,Phone,Physiotherapist,Date,Start Time,End Time,Type,Status,Notes");
  for (const a of data.appointments) {
    const patient = a.patients as any;
    const physio = a.physiotherapists as any;
    lines.push(`${a.appointment_code},${esc(patient?.first_name + " " + patient?.last_name)},${patient?.phone || ""},${esc("Dr. " + (physio?.first_name || "") + " " + (physio?.last_name || ""))},${a.appointment_date},${a.start_time},${a.end_time || ""},${a.appointment_type || ""},${a.status},${esc(a.notes || "")}`);
  }
  lines.push("");

  lines.push("INVOICES");
  lines.push("Invoice Code,Patient,Phone,Subtotal,Discount,Total,Status,Collected By,Issued At");
  for (const i of data.invoices) {
    const patient = i.patients as any;
    lines.push(`${i.invoice_code},${esc(patient?.first_name + " " + patient?.last_name)},${patient?.phone || ""},${i.subtotal},${i.discount},${i.total},${i.status},${i.collected_by || ""},${i.issued_at}`);
  }
  lines.push("");

  lines.push("PAYMENTS");
  lines.push("Payment Code,Patient,Phone,Amount,Method,Status,Paid At");
  for (const p of data.payments) {
    const patient = p.patients as any;
    lines.push(`${p.payment_code || ""},${esc(patient?.first_name + " " + patient?.last_name)},${patient?.phone || ""},${p.amount},${p.payment_method},${p.payment_status},${p.paid_at}`);
  }

  return lines.join("\n");
}

function esc(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}
