import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";

interface DashboardData {
  todayAppointments: number;
  completedAppointments: number;
  checkedInPatients: number;
  todayRevenue: number;
  recentAppointments: Array<{
    id: string;
    start_time: string;
    end_time: string;
    status: string;
    patients: { first_name: string; last_name: string } | null;
    physiotherapists: { first_name: string; last_name: string } | null;
  }>;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    const [
      { count: todayAppointments },
      { count: completedAppointments },
      { count: checkedInPatients },
      { data: todayPayments },
      { data: recentAppointments },
    ] = await Promise.all([
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today)
        .eq("status", "completed"),
      supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("appointment_date", today)
        .eq("status", "checked_in"),
      supabase
        .from("payments")
        .select("amount")
        .eq("payment_status", "completed")
        .gte("paid_at", `${today}T00:00:00`),
      supabase
        .from("appointments")
        .select("*, patients(first_name, last_name), physiotherapists(first_name, last_name)")
        .eq("appointment_date", today)
        .order("start_time", { ascending: true })
        .limit(8),
    ]);

    const todayRevenue = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

    setData({
      todayAppointments: todayAppointments ?? 0,
      completedAppointments: completedAppointments ?? 0,
      checkedInPatients: checkedInPatients ?? 0,
      todayRevenue,
      recentAppointments: (recentAppointments as DashboardData["recentAppointments"]) ?? [],
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
    >
      <Text style={styles.greeting}>Hello, {user?.name ?? "User"}</Text>
      <Text style={styles.date}>{format(new Date(), "EEEE, MMMM d, yyyy")}</Text>

      <View style={styles.statsGrid}>
        <StatCard title="Appointments" value={data!.todayAppointments} color="#2563EB" bg="#EFF6FF" />
        <StatCard title="Completed" value={data!.completedAppointments} color="#15803D" bg="#F0FDF4" />
        <StatCard title="Checked In" value={data!.checkedInPatients} color="#D97706" bg="#FFFBEB" />
        <StatCard title="Revenue" value={`PKR ${data!.todayRevenue.toLocaleString()}`} color="#059669" bg="#ECFDF5" />
      </View>

      <Text style={styles.sectionTitle}>Today's Schedule</Text>
      {data!.recentAppointments.length > 0 ? (
        data!.recentAppointments.map((apt) => (
          <Card key={apt.id} style={styles.appointmentCard}>
            <View style={styles.appointmentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>
                  {apt.patients?.first_name} {apt.patients?.last_name}
                </Text>
                <Text style={styles.appointmentMeta}>
                  {apt.start_time}{apt.end_time ? ` - ${apt.end_time}` : ""} {apt.physiotherapists ? `· Dr. ${apt.physiotherapists.first_name}` : ""}
                </Text>
              </View>
              <StatusBadge status={apt.status} />
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No appointments scheduled for today</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function StatCard({ title, value, color, bg }: { title: string; value: string | number; color: string; bg: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
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
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  date: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 12,
    padding: 14,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginTop: 24,
    marginBottom: 12,
  },
  appointmentCard: {
    marginBottom: 8,
  },
  appointmentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  appointmentMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
