import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import type { Invoice, Payment } from "@/types/database";

type Tab = "invoices" | "payments";

export default function BillingScreen() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: inv }, { data: pay }] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, patients(first_name, last_name, patient_code)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("payments")
        .select("*, patients(first_name, last_name, patient_code)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    setInvoices((inv as Invoice[]) ?? []);
    setPayments((pay as Payment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "invoices" && styles.tabActive]}
          onPress={() => setTab("invoices")}
        >
          <Text style={[styles.tabText, tab === "invoices" && styles.tabTextActive]}>Invoices</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "payments" && styles.tabActive]}
          onPress={() => setTab("payments")}
        >
          <Text style={[styles.tabText, tab === "payments" && styles.tabTextActive]}>Payments</Text>
        </TouchableOpacity>
      </View>

      {tab === "invoices" ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>
                    {item.patients?.first_name} {item.patients?.last_name}
                  </Text>
                  <Text style={styles.code}>{item.invoice_code}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>PKR {item.total.toLocaleString()}</Text>
                <Text style={styles.date}>{format(new Date(item.issued_at), "MMM d, yyyy")}</Text>
              </View>
              {item.discount > 0 && (
                <Text style={styles.discount}>Discount: PKR {item.discount.toLocaleString()}</Text>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No invoices</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>
                    {item.patients?.first_name} {item.patients?.last_name}
                  </Text>
                  <Text style={styles.code}>{item.payment_code}</Text>
                </View>
                <StatusBadge status={item.payment_status} />
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.amount}>PKR {item.amount.toLocaleString()}</Text>
                <View style={styles.methodBadge}>
                  <Text style={styles.methodText}>{item.payment_method.replace(/_/g, " ")}</Text>
                </View>
              </View>
              {item.paid_at && (
                <Text style={styles.date}>{format(new Date(item.paid_at), "MMM d, yyyy · h:mm a")}</Text>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No payments</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#2563EB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  patientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  code: {
    fontSize: 12,
    color: "#9CA3AF",
    fontFamily: "monospace",
    marginTop: 2,
  },
  amount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  date: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  discount: {
    fontSize: 12,
    color: "#D97706",
    marginTop: 4,
  },
  methodBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 12,
  },
});
