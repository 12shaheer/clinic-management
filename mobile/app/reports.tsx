import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type DateRange = "today" | "yesterday" | "last_7_days" | "last_30_days" | "last_6_months" | "last_year" | "all_time";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "last_year", label: "Last Year" },
  { value: "all_time", label: "All Time" },
];

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

interface ReportSummary {
  totalPatients: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  checkedIn: number;
  totalInvoices: number;
  unpaidInvoices: number;
  totalInvoiced: number;
  totalRevenue: number;
  outstandingAmount: number;
}

interface ReportData {
  summary: ReportSummary;
  patients: any[];
  appointments: any[];
  invoices: any[];
}

export default function ReportsScreen() {
  const [range, setRange] = useState<DateRange>("today");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const generateReport = useCallback(async () => {
    setLoading(true);
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

    const totalInvoiced = (invoices ?? []).reduce((sum: number, i: any) => sum + (i.total || 0), 0);
    const totalRevenue = (invoices ?? []).filter((i: any) => i.status === "paid").reduce((sum: number, i: any) => sum + (i.total || 0), 0);

    const summary: ReportSummary = {
      totalPatients: (patients ?? []).length,
      totalAppointments: (appointments ?? []).length,
      completedAppointments: (appointments ?? []).filter((a: any) => a.status === "completed").length,
      cancelledAppointments: (appointments ?? []).filter((a: any) => a.status === "cancelled").length,
      checkedIn: (appointments ?? []).filter((a: any) => a.status === "checked_in").length,
      totalInvoices: (invoices ?? []).length,
      unpaidInvoices: (invoices ?? []).filter((i: any) => i.status === "unpaid").length,
      totalInvoiced,
      totalRevenue,
      outstandingAmount: totalInvoiced - totalRevenue,
    };

    setReport({ summary, patients: patients ?? [], appointments: appointments ?? [], invoices: invoices ?? [] });
    setLoading(false);
  }, [range]);

  async function handleShare() {
    if (!report) {
      Alert.alert("Generate First", "Please generate a report first.");
      return;
    }

    setSharing(true);

    try {
      const rangeLabel = DATE_RANGES.find(r => r.value === range)?.label ?? range;
      const wb = XLSX.utils.book_new();

      // --- Summary Sheet ---
      const summaryRows = [
        ["CLINIC REPORT"],
        ["Date Range", rangeLabel],
        ["Generated", new Date().toLocaleString()],
        [],
        ["OVERVIEW"],
        ["Metric", "Value"],
        ["Total Patients", report.summary.totalPatients],
        ["Total Appointments", report.summary.totalAppointments],
        ["Completed Appointments", report.summary.completedAppointments],
        ["Cancelled Appointments", report.summary.cancelledAppointments],
        ["Checked In", report.summary.checkedIn],
        [],
        ["FINANCIAL SUMMARY"],
        ["Metric", "Amount (PKR)"],
        ["Total Invoiced", report.summary.totalInvoiced],
        ["Total Revenue Collected", report.summary.totalRevenue],
        ["Outstanding Amount", report.summary.outstandingAmount],
        ["Total Invoices", report.summary.totalInvoices],
        ["Unpaid Invoices", report.summary.unpaidInvoices],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary["!cols"] = [{ wch: 28 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // --- Patients Sheet (with balances/dues) ---
      const patientInvoicedMap: Record<string, number> = {};
      const patientPaidMap: Record<string, number> = {};
      for (const inv of report.invoices) {
        patientInvoicedMap[inv.patient_id] = (patientInvoicedMap[inv.patient_id] || 0) + (inv.total || 0);
        if (inv.status === "paid") {
          patientPaidMap[inv.patient_id] = (patientPaidMap[inv.patient_id] || 0) + (inv.total || 0);
        }
      }

      const patientRows = [
        ["Code", "Name", "Phone", "Gender", "Status", "Credit Balance (PKR)", "Total Invoiced (PKR)", "Total Paid (PKR)", "Dues (PKR)", "Registered"],
      ];
      for (const p of report.patients) {
        const invoiced = patientInvoicedMap[p.id] || 0;
        const paid = patientPaidMap[p.id] || 0;
        const dues = invoiced - paid;
        patientRows.push([
          p.patient_code,
          `${p.first_name} ${p.last_name}`,
          p.phone,
          p.gender || "",
          p.status,
          p.credit_balance || 0,
          invoiced,
          paid,
          dues,
          p.created_at?.split("T")[0] || "",
        ]);
      }
      const wsPatients = XLSX.utils.aoa_to_sheet(patientRows);
      wsPatients["!cols"] = [{ wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsPatients, "Patients");

      // --- Appointments Sheet ---
      const appointmentRows = [
        ["Code", "Patient", "Phone", "Physiotherapist", "Date", "Time", "Type", "Status"],
      ];
      for (const a of report.appointments) {
        const pat = a.patients;
        const phy = a.physiotherapists;
        appointmentRows.push([
          a.appointment_code,
          pat ? `${pat.first_name} ${pat.last_name}` : "",
          pat?.phone || "",
          phy ? `Dr. ${phy.first_name} ${phy.last_name}` : "",
          a.appointment_date,
          a.start_time,
          a.appointment_type || "",
          a.status,
        ]);
      }
      const wsAppointments = XLSX.utils.aoa_to_sheet(appointmentRows);
      wsAppointments["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsAppointments, "Appointments");

      // --- Invoices Sheet ---
      const collectedByLabel = (value: string | null) => {
        if (!value) return "";
        if (value === "reception") return "At Reception";
        if (value === "doctor") return "By Doctor";
        if (value === "credit") return "Credit Settlement";
        return value;
      };

      const invoiceRows = [
        ["Code", "Patient", "Phone", "Subtotal (PKR)", "Discount (PKR)", "Total (PKR)", "Status", "Collected By", "Payment Date", "Issued Date"],
      ];
      for (const i of report.invoices) {
        const pat = i.patients;
        invoiceRows.push([
          i.invoice_code,
          pat ? `${pat.first_name} ${pat.last_name}` : "",
          pat?.phone || "",
          i.subtotal,
          i.discount,
          i.total,
          i.status === "paid" ? "Paid" : i.status === "partially_paid" ? "Partially Paid" : i.status === "cancelled" ? "Cancelled" : "Unpaid",
          i.status === "paid" ? collectedByLabel(i.collected_by) : "",
          i.payment_confirmed_at?.split("T")[0] || "",
          i.issued_at?.split("T")[0] || "",
        ]);
      }
      const wsInvoices = XLSX.utils.aoa_to_sheet(invoiceRows);
      wsInvoices["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsInvoices, "Invoices");

      // Write to file and share
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileName = `Clinic_Report_${rangeLabel.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      const file = new File(Paths.cache, fileName);
      file.write(wbout, { encoding: "base64" });

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Clinic Report - ${rangeLabel}`,
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (error: any) {
      Alert.alert("Error", "Failed to generate Excel file. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Select Date Range</Text>
      <View style={styles.rangeGrid}>
        {DATE_RANGES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.rangeChip, range === r.value && styles.rangeChipActive]}
            onPress={() => setRange(r.value)}
          >
            <Text style={[styles.rangeChipText, range === r.value && styles.rangeChipTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.generateButton} onPress={generateReport} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="stats-chart" size={18} color="#FFFFFF" />
              <Text style={styles.generateText}>Generate Report</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.shareButton, !report && styles.shareButtonDisabled]} onPress={handleShare} disabled={!report || sharing}>
          {sharing ? (
            <ActivityIndicator color="#2563EB" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color={report ? "#2563EB" : "#9CA3AF"} />
              <Text style={[styles.shareText, !report && { color: "#9CA3AF" }]}>Excel</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {report && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Patients" value={report.summary.totalPatients} />
            <StatCard label="Appointments" value={report.summary.totalAppointments} />
            <StatCard label="Completed" value={report.summary.completedAppointments} color="#059669" />
            <StatCard label="Cancelled" value={report.summary.cancelledAppointments} color="#DC2626" />
            <StatCard label="Checked In" value={report.summary.checkedIn} color="#D97706" />
            <StatCard label="Invoices" value={report.summary.totalInvoices} />
            <StatCard label="Unpaid" value={report.summary.unpaidInvoices} color="#DC2626" />
          </View>

          <View style={styles.revenueSection}>
            <RevenueRow label="Total Invoiced" amount={report.summary.totalInvoiced} />
            <RevenueRow label="Total Revenue" amount={report.summary.totalRevenue} color="#059669" />
            <RevenueRow label="Outstanding" amount={report.summary.outstandingAmount} color="#D97706" />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

function RevenueRow({ label, amount, color }: { label: string; amount: number; color?: string }) {
  return (
    <View style={styles.revenueRow}>
      <Text style={styles.revenueLabel}>{label}</Text>
      <Text style={[styles.revenueAmount, color ? { color } : undefined]}>
        PKR {amount.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
  },
  rangeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  rangeChipActive: {
    backgroundColor: "#2563EB",
  },
  rangeChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  rangeChipTextActive: {
    color: "#FFFFFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  generateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 10,
  },
  generateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  shareButtonDisabled: {
    backgroundColor: "#F3F4F6",
  },
  shareText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
  summarySection: {
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  revenueSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  revenueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
});
