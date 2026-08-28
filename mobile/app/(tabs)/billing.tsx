import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import type { Invoice, Payment } from "@/types/database";

type Tab = "invoices" | "payments";

export default function BillingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];

    let invQuery = supabase
      .from("invoices")
      .select("*, patients(first_name, last_name, patient_code)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!isAdmin) {
      invQuery = invQuery.or(`created_at.gte.${today},status.in.(unpaid,partially_paid)`);
    }

    const [{ data: inv }, { data: pay }] = await Promise.all([
      invQuery,
      supabase
        .from("payments")
        .select("*, patients(first_name, last_name, patient_code)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const sortedInv = (inv ?? []).sort((a, b) => {
      const priority: Record<string, number> = { unpaid: 0, partially_paid: 1, paid: 2, cancelled: 3 };
      return (priority[a.status] ?? 4) - (priority[b.status] ?? 4);
    });

    setInvoices(sortedInv as Invoice[]);
    setPayments((pay as Payment[]) ?? []);
    setLoading(false);
  }, [isAdmin]);

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

      {!isAdmin && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
          <Text style={styles.infoBannerText}>Showing today&apos;s invoices & pending payments</Text>
        </View>
      )}

      {tab === "invoices" ? (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          ListHeaderComponent={
            <TouchableOpacity style={styles.newButton} onPress={() => setShowNewInvoice(true)}>
              <Ionicons name="add-circle" size={20} color="#2563EB" />
              <Text style={styles.newButtonText}>New Invoice</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/patients/${item.patient_id}` as never)}
              activeOpacity={0.7}
            >
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
                {(item.status === "unpaid" || item.status === "partially_paid") && (
                  <Text style={styles.tapHint}>Tap to open patient profile & confirm payment</Text>
                )}
              </Card>
            </TouchableOpacity>
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

      <NewInvoiceModal
        visible={showNewInvoice}
        onClose={() => setShowNewInvoice(false)}
        onCreated={() => {
          setShowNewInvoice(false);
          fetchData();
        }}
      />
    </View>
  );
}

function NewInvoiceModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; first_name: string; last_name: string; phone: string; patient_code: string; gender: string | null }>>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; first_name: string; last_name: string; phone: string; patient_code: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [subtotal, setSubtotal] = useState("");
  const [discount, setDiscount] = useState("0");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPhoneSearch("");
      setSearchResults([]);
      setSelectedPatient(null);
      setSubtotal("");
      setDiscount("0");
    }
  }, [visible]);

  useEffect(() => {
    if (phoneSearch.length < 3) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("patients")
        .select("id, first_name, last_name, phone, patient_code, gender")
        .ilike("phone", `%${phoneSearch}%`)
        .eq("status", "active")
        .limit(5);
      setSearchResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [phoneSearch]);

  async function handleCreate() {
    if (!selectedPatient) {
      Alert.alert("Required", "Please search and select a patient.");
      return;
    }
    const amount = parseFloat(subtotal);
    if (!amount || amount <= 0) {
      Alert.alert("Required", "Please enter a valid amount.");
      return;
    }
    const disc = parseFloat(discount) || 0;
    const total = amount - disc;
    if (total <= 0) {
      Alert.alert("Error", "Total after discount must be greater than zero.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("invoices").insert({
      patient_id: selectedPatient.id,
      subtotal: amount,
      discount: disc,
      total,
      status: "unpaid",
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Invoice Created", "Go to patient profile to confirm payment when received.");
      onCreated();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={invoiceModalStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={invoiceModalStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={invoiceModalStyles.title}>New Invoice</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#2563EB" /> : <Text style={invoiceModalStyles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView style={invoiceModalStyles.body} keyboardShouldPersistTaps="handled">
        <Text style={invoiceModalStyles.label}>Patient (search by phone)</Text>
        {selectedPatient ? (
          <View style={invoiceModalStyles.selectedPatient}>
            <View style={{ flex: 1 }}>
              <Text style={invoiceModalStyles.selectedName}>{selectedPatient.first_name} {selectedPatient.last_name}</Text>
              <Text style={invoiceModalStyles.selectedPhone}>{selectedPatient.phone} · {selectedPatient.patient_code}</Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedPatient(null); setPhoneSearch(""); }}>
              <Ionicons name="close-circle" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ position: "relative" }}>
              <TextInput
                style={invoiceModalStyles.input}
                value={phoneSearch}
                onChangeText={setPhoneSearch}
                placeholder="Enter phone number..."
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
              {searching && <ActivityIndicator size="small" color="#2563EB" style={{ position: "absolute", right: 12, top: 14 }} />}
            </View>
            {searchResults.length > 0 && (
              <View style={invoiceModalStyles.searchResults}>
                {searchResults.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={invoiceModalStyles.searchItem}
                    onPress={() => { setSelectedPatient(p); setSearchResults([]); }}
                  >
                    <Text style={invoiceModalStyles.searchName}>{p.first_name} {p.last_name}</Text>
                    <Text style={invoiceModalStyles.searchPhone}>{p.phone} · {p.patient_code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {phoneSearch.length >= 3 && !searching && searchResults.length === 0 && (
              <Text style={invoiceModalStyles.noResults}>No patient found with this number.</Text>
            )}
          </>
        )}

        <Text style={invoiceModalStyles.label}>Subtotal (PKR)</Text>
        <TextInput
          style={invoiceModalStyles.input}
          value={subtotal}
          onChangeText={setSubtotal}
          placeholder="Amount"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={invoiceModalStyles.label}>Discount (PKR)</Text>
        <TextInput
          style={invoiceModalStyles.input}
          value={discount}
          onChangeText={setDiscount}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <View style={invoiceModalStyles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color="#92400E" />
          <Text style={invoiceModalStyles.noteText}>Invoice is created as unpaid. Confirm payment from the patient profile once received.</Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

const invoiceModalStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 17, fontWeight: "600", color: "#111827" },
  cancelText: { fontSize: 16, color: "#6B7280" },
  saveText: { fontSize: 16, fontWeight: "600", color: "#2563EB" },
  body: { padding: 16 },
  label: { fontSize: 14, fontWeight: "500", color: "#374151", marginTop: 14, marginBottom: 8 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  selectedPatient: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 12,
  },
  selectedName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  selectedPhone: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  searchResults: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden",
  },
  searchItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  searchName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  searchPhone: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  noResults: { fontSize: 13, color: "#9CA3AF", marginTop: 8 },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 12,
  },
  noteText: { fontSize: 13, color: "#92400E", flex: 1 },
});

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
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#1D4ED8",
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  newButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
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
  tapHint: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 6,
    fontStyle: "italic",
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
