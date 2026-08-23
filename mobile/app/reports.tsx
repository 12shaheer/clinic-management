import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  totalPayments: number;
}

export default function ReportsScreen() {
  const [range, setRange] = useState<DateRange>("today");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<string | null>(null);

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

    let paymentsQuery = supabase.from("payments").select("*, patients(first_name, last_name, phone, patient_code)").order("paid_at", { ascending: false });
    if (dateFrom) paymentsQuery = paymentsQuery.gte("paid_at", dateFrom);
    const { data: payments } = await paymentsQuery;

    const totalRevenue = (payments ?? []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const totalInvoiced = (invoices ?? []).reduce((sum: number, i: any) => sum + (i.total || 0), 0);

    const report: ReportSummary = {
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
      totalPayments: (payments ?? []).length,
    };

    setSummary(report);

    // Build CSV
    const lines: string[] = [];
    const rangeLabel = DATE_RANGES.find(r => r.value === range)?.label ?? range;
    lines.push(`CLINIC REPORT - ${rangeLabel}`);
    lines.push(`Generated,${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("SUMMARY");
    lines.push(`Total Patients,${report.totalPatients}`);
    lines.push(`Total Appointments,${report.totalAppointments}`);
    lines.push(`Completed,${report.completedAppointments}`);
    lines.push(`Cancelled,${report.cancelledAppointments}`);
    lines.push(`Checked In,${report.checkedIn}`);
    lines.push(`Total Invoices,${report.totalInvoices}`);
    lines.push(`Unpaid Invoices,${report.unpaidInvoices}`);
    lines.push(`Total Invoiced (PKR),${report.totalInvoiced}`);
    lines.push(`Total Revenue (PKR),${report.totalRevenue}`);
    lines.push(`Outstanding (PKR),${report.outstandingAmount}`);
    lines.push(`Total Payments,${report.totalPayments}`);
    lines.push("");
    lines.push("PATIENTS");
    lines.push("Code,Name,Phone,Gender,Status,Registered");
    for (const p of (patients ?? [])) {
      lines.push(`${p.patient_code},${p.first_name} ${p.last_name},${p.phone},${p.gender || ""},${p.status},${p.created_at}`);
    }
    lines.push("");
    lines.push("APPOINTMENTS");
    lines.push("Code,Patient,Physiotherapist,Date,Time,Type,Status");
    for (const a of (appointments ?? [])) {
      const pat = (a as any).patients;
      const phy = (a as any).physiotherapists;
      lines.push(`${a.appointment_code},${pat?.first_name} ${pat?.last_name},Dr. ${phy?.first_name} ${phy?.last_name},${a.appointment_date},${a.start_time},${a.appointment_type || ""},${a.status}`);
    }
    lines.push("");
    lines.push("INVOICES");
    lines.push("Code,Patient,Subtotal,Discount,Total,Status,Collected By");
    for (const i of (invoices ?? [])) {
      const pat = (i as any).patients;
      lines.push(`${i.invoice_code},${pat?.first_name} ${pat?.last_name},${i.subtotal},${i.discount},${i.total},${i.status},${i.collected_by || ""}`);
    }
    lines.push("");
    lines.push("PAYMENTS");
    lines.push("Code,Patient,Amount,Method,Status,Paid At");
    for (const p of (payments ?? [])) {
      const pat = (p as any).patients;
      lines.push(`${p.payment_code || ""},${pat?.first_name} ${pat?.last_name},${p.amount},${p.payment_method},${p.payment_status},${p.paid_at || ""}`);
    }

    setCsvData(lines.join("\n"));
    setLoading(false);
  }, [range]);

  async function handleShare() {
    if (!csvData) {
      Alert.alert("Generate First", "Please generate a report first.");
      return;
    }
    const rangeLabel = DATE_RANGES.find(r => r.value === range)?.label ?? range;
    await Share.share({
      message: csvData,
      title: `Clinic Report - ${rangeLabel}`,
    });
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

        <TouchableOpacity style={styles.shareButton} onPress={handleShare} disabled={!csvData}>
          <Ionicons name="share-outline" size={18} color="#2563EB" />
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>

      {summary && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Patients" value={summary.totalPatients} />
            <StatCard label="Appointments" value={summary.totalAppointments} />
            <StatCard label="Completed" value={summary.completedAppointments} color="#059669" />
            <StatCard label="Cancelled" value={summary.cancelledAppointments} color="#DC2626" />
            <StatCard label="Checked In" value={summary.checkedIn} color="#D97706" />
            <StatCard label="Invoices" value={summary.totalInvoices} />
            <StatCard label="Unpaid" value={summary.unpaidInvoices} color="#DC2626" />
            <StatCard label="Payments" value={summary.totalPayments} />
          </View>

          <View style={styles.revenueSection}>
            <RevenueRow label="Total Invoiced" amount={summary.totalInvoiced} />
            <RevenueRow label="Total Revenue" amount={summary.totalRevenue} color="#059669" />
            <RevenueRow label="Outstanding" amount={summary.outstandingAmount} color="#D97706" />
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
