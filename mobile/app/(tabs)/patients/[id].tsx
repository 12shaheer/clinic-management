import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import type { Patient, Appointment, Invoice } from "@/types/database";

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSumPayment, setShowSumPayment] = useState(false);
  const [sumAmount, setSumAmount] = useState("");

  const fetchData = useCallback(async () => {
    const [{ data: p }, { data: apts }, { data: inv }, { data: credits }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase
        .from("appointments")
        .select("*, physiotherapists(first_name, last_name)")
        .eq("patient_id", id)
        .order("appointment_date", { ascending: false })
        .limit(10),
      supabase
        .from("invoices")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("credit_transactions")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setPatient(p as Patient);
    setAppointments((apts as Appointment[]) ?? []);
    setInvoices((inv as Invoice[]) ?? []);
    setCreditTransactions((credits as CreditTransaction[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const unpaidInvoices = invoices.filter(inv => inv.status === "unpaid" || inv.status === "partially_paid");
  const paidInvoices = invoices.filter(inv => inv.status === "paid");
  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const creditBalance = Number(patient?.credit_balance ?? 0);
  const currentBalance = totalUnpaid - creditBalance;

  function handleConfirmPayment(invoiceId: string) {
    Alert.alert(
      "Confirm Payment",
      "Where was payment received?",
      [
        { text: "At Reception", onPress: () => doConfirm(invoiceId, "reception") },
        { text: "By Doctor", onPress: () => doConfirm(invoiceId, "doctor") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  async function doConfirm(invoiceId: string, collectedBy: string) {
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        payment_confirmed_at: new Date().toISOString(),
        confirmed_by: user?.id || null,
        collected_by: collectedBy,
      })
      .eq("id", invoiceId)
      .in("status", ["unpaid", "partially_paid"]);

    if (error) Alert.alert("Error", error.message);
    else fetchData();
  }

  function handleApplyCredit(invoiceId: string, invoiceTotal: number) {
    const amountToUse = Math.min(creditBalance, invoiceTotal);
    Alert.alert(
      "Use Credit",
      `Apply PKR ${amountToUse.toLocaleString()} from credit balance to this invoice?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          onPress: async () => {
            const newBalance = creditBalance - amountToUse;

            await supabase
              .from("invoices")
              .update({
                status: "paid",
                payment_confirmed_at: new Date().toISOString(),
                confirmed_by: user?.id || null,
                collected_by: "credit",
              })
              .eq("id", invoiceId);

            await supabase
              .from("patients")
              .update({ credit_balance: newBalance })
              .eq("id", id);

            await supabase
              .from("credit_transactions")
              .insert({
                patient_id: id,
                amount: -amountToUse,
                type: "credit_used",
                description: `Credit of PKR ${amountToUse.toLocaleString()} applied to invoice`,
                invoice_id: invoiceId,
                created_by: user?.id || null,
              });

            fetchData();
          },
        },
      ]
    );
  }

  function handleSumPayment() {
    const amount = parseFloat(sumAmount);
    if (!amount || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }

    const excess = amount > totalUnpaid ? amount - totalUnpaid : 0;
    let message = `Apply PKR ${amount.toLocaleString()} to unpaid invoices.`;
    if (excess > 0) {
      message += `\n\nPKR ${excess.toLocaleString()} will be stored as advance credit.`;
    }
    message += "\n\nWhere was payment received?";

    Alert.alert("Collect Payment", message, [
      { text: "At Reception", onPress: () => doSumPayment(amount, "reception") },
      { text: "By Doctor", onPress: () => doSumPayment(amount, "doctor") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function doSumPayment(amount: number, collectedBy: string) {
    let remaining = amount;
    const invoiceIds: string[] = [];

    const sorted = [...unpaidInvoices].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const inv of sorted) {
      if (remaining <= 0) break;
      invoiceIds.push(inv.id);
      remaining -= Number(inv.total);
    }

    if (invoiceIds.length > 0) {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_confirmed_at: new Date().toISOString(),
          confirmed_by: user?.id || null,
          collected_by: collectedBy,
        })
        .in("id", invoiceIds);

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
    }

    // Handle advance payment
    const advanceAmount = amount > totalUnpaid ? amount - totalUnpaid : 0;
    if (advanceAmount > 0) {
      const newBalance = creditBalance + advanceAmount;

      await supabase
        .from("patients")
        .update({ credit_balance: newBalance })
        .eq("id", id);

      await supabase
        .from("credit_transactions")
        .insert({
          patient_id: id,
          amount: advanceAmount,
          type: "advance_payment",
          description: `Advance payment of PKR ${advanceAmount.toLocaleString()} (paid PKR ${amount.toLocaleString()}, dues were PKR ${totalUnpaid.toLocaleString()})`,
          created_by: user?.id || null,
        });
    }

    Alert.alert(
      "Success",
      `Payment applied to ${invoiceIds.length} invoice(s).${advanceAmount > 0 ? `\nPKR ${advanceAmount.toLocaleString()} added as advance credit.` : ""}`
    );
    setShowSumPayment(false);
    setSumAmount("");
    fetchData();
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Patient not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Patient Details" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        <View style={styles.profileHeader}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>
              {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
            </Text>
          </View>
          <Text style={styles.name}>
            {patient.first_name} {patient.last_name}
          </Text>
          <Text style={styles.code}>{patient.patient_code}</Text>
          <StatusBadge status={patient.status} />
        </View>

        {/* Current Balance */}
        <View style={[styles.balanceCard, {
          backgroundColor: currentBalance > 0 ? "#FEF2F2" : currentBalance < 0 ? "#EFF6FF" : "#F0FDF4",
          borderColor: currentBalance > 0 ? "#FECACA" : currentBalance < 0 ? "#BFDBFE" : "#BBF7D0",
        }]}>
          <Text style={[styles.balanceLabel, {
            color: currentBalance > 0 ? "#DC2626" : currentBalance < 0 ? "#1D4ED8" : "#15803D",
          }]}>Current Balance</Text>
          <Text style={[styles.balanceAmount, {
            color: currentBalance > 0 ? "#991B1B" : currentBalance < 0 ? "#1E40AF" : "#166534",
          }]}>
            {currentBalance > 0
              ? `PKR ${currentBalance.toLocaleString()} due`
              : currentBalance < 0
              ? `PKR ${Math.abs(currentBalance).toLocaleString()} credit`
              : "Clear"}
          </Text>
        </View>
        {creditBalance > 0 && (
          <View style={styles.advanceCreditCard}>
            <Text style={styles.advanceCreditLabel}>Advance Credit</Text>
            <Text style={styles.advanceCreditAmount}>PKR {creditBalance.toLocaleString()}</Text>
          </View>
        )}

        {/* Collect Payment - always visible */}
        <TouchableOpacity
          style={styles.sumPayButton}
          onPress={() => setShowSumPayment(!showSumPayment)}
        >
          <Ionicons name="cash-outline" size={16} color="#2563EB" />
          <Text style={styles.sumPayButtonText}>Collect Payment</Text>
        </TouchableOpacity>

        {/* Unpaid Invoices */}
        {showSumPayment && (
          <Card style={styles.sumPayCard}>
            <Text style={styles.sumPayInfo}>
              {totalUnpaid > 0
                ? `Total unpaid: PKR ${totalUnpaid.toLocaleString()}. Any excess becomes advance credit.`
                : "No unpaid invoices. Payment will be stored as advance credit."}
            </Text>
            <TextInput
              style={styles.sumPayInput}
              value={sumAmount}
              onChangeText={setSumAmount}
              placeholder={totalUnpaid > 0 ? totalUnpaid.toString() : "Enter amount"}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            {totalUnpaid > 0 && parseFloat(sumAmount) > totalUnpaid && (
              <Text style={styles.advanceHint}>
                PKR {(parseFloat(sumAmount) - totalUnpaid).toLocaleString()} will be stored as advance credit
              </Text>
            )}
            {totalUnpaid === 0 && parseFloat(sumAmount) > 0 && (
              <Text style={styles.advanceHint}>
                PKR {parseFloat(sumAmount).toLocaleString()} will be stored as advance credit
              </Text>
            )}
            <View style={styles.sumPayActions}>
              <TouchableOpacity style={styles.sumPayConfirm} onPress={handleSumPayment}>
                <Text style={styles.sumPayConfirmText}>Apply Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowSumPayment(false); setSumAmount(""); }}>
                <Text style={styles.sumPayCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {unpaidInvoices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Unpaid Sessions</Text>

            {unpaidInvoices.map((inv) => (
              <Card key={inv.id} style={styles.unpaidCard}>
                <View style={styles.invoiceTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceCode}>{inv.invoice_code}</Text>
                    <Text style={styles.invoiceDate}>{format(new Date(inv.issued_at), "MMM d, yyyy")}</Text>
                    <Text style={styles.invoiceAmount}>PKR {Number(inv.total).toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.invoiceActions}>
                  {creditBalance > 0 && (
                    <TouchableOpacity
                      style={styles.creditBtn}
                      onPress={() => handleApplyCredit(inv.id, Number(inv.total))}
                    >
                      <Ionicons name="wallet" size={14} color="#1D4ED8" />
                      <Text style={styles.creditBtnText}>Use Credit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => handleConfirmPayment(inv.id)}
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                    <Text style={styles.confirmBtnText}>Confirm Paid</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Credit History */}
        {creditTransactions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Credit History</Text>
            {creditTransactions.map((tx) => (
              <Card key={tx.id} style={[styles.aptCard, Number(tx.amount) > 0 ? styles.creditTxCard : null]}>
                <View style={styles.invoiceTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txType}>
                      {tx.type === "advance_payment" ? "Advance Payment" :
                       tx.type === "credit_used" ? "Credit Used" : "Refund"}
                    </Text>
                    {tx.description && <Text style={styles.txDesc}>{tx.description}</Text>}
                    <Text style={styles.invoiceDate}>{format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: Number(tx.amount) > 0 ? "#1D4ED8" : "#DC2626" }]}>
                    {Number(tx.amount) > 0 ? "+" : ""}PKR {Math.abs(Number(tx.amount)).toLocaleString()}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Linking.openURL(`tel:${patient.phone}`)}
          >
            <Ionicons name="call" size={20} color="#2563EB" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          {patient.email && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Linking.openURL(`mailto:${patient.email}`)}
            >
              <Ionicons name="mail" size={20} color="#2563EB" />
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>
          )}
        </View>

        <Card style={styles.detailsCard}>
          <DetailRow label="Phone" value={patient.phone} />
          {patient.email && <DetailRow label="Email" value={patient.email} />}
          {patient.date_of_birth && (
            <DetailRow label="DOB" value={format(new Date(patient.date_of_birth), "MMM d, yyyy")} />
          )}
          {patient.gender && <DetailRow label="Gender" value={patient.gender} />}
          {patient.address && <DetailRow label="Address" value={patient.address} />}
          {patient.emergency_contact_name && (
            <DetailRow
              label="Emergency Contact"
              value={`${patient.emergency_contact_name} (${patient.emergency_contact_phone})`}
            />
          )}
          {patient.notes && <DetailRow label="Notes" value={patient.notes} />}
        </Card>

        {/* Paid History */}
        {paidInvoices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {paidInvoices.map((inv) => (
              <Card key={inv.id} style={styles.aptCard}>
                <View style={styles.invoiceTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceCode}>{inv.invoice_code}</Text>
                    <Text style={styles.invoiceDate}>{format(new Date(inv.issued_at), "MMM d, yyyy")}</Text>
                  </View>
                  <Text style={styles.paidAmount}>PKR {Number(inv.total).toLocaleString()}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Appointment History</Text>
        {appointments.length > 0 ? (
          appointments.map((apt) => (
            <Card key={apt.id} style={styles.aptCard}>
              <View style={styles.aptRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aptDate}>
                    {format(new Date(apt.appointment_date), "MMM d, yyyy")}
                  </Text>
                  <Text style={styles.aptTime}>
                    {apt.start_time}{apt.end_time ? ` - ${apt.end_time}` : ""}
                    {apt.physiotherapists ? ` · Dr. ${apt.physiotherapists.first_name}` : ""}
                  </Text>
                </View>
                <StatusBadge status={apt.status} />
              </View>
            </Card>
          ))
        ) : (
          <Text style={styles.emptyText}>No appointments yet</Text>
        )}
      </ScrollView>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },
  errorText: { fontSize: 16, color: "#6B7280" },
  profileHeader: { alignItems: "center", paddingVertical: 16 },
  bigAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  bigAvatarText: { fontSize: 22, fontWeight: "700", color: "#2563EB" },
  name: { fontSize: 20, fontWeight: "700", color: "#111827" },
  code: { fontSize: 14, color: "#6B7280", marginTop: 2, marginBottom: 6, fontFamily: "monospace" },
  balanceCard: { borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1 },
  balanceLabel: { fontSize: 12, fontWeight: "600" },
  balanceAmount: { fontSize: 22, fontWeight: "700", marginTop: 4 },
  advanceCreditCard: { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, padding: 14, marginBottom: 16 },
  advanceCreditLabel: { fontSize: 12, fontWeight: "600", color: "#1D4ED8" },
  advanceCreditAmount: { fontSize: 17, fontWeight: "700", color: "#1E40AF", marginTop: 2 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#111827", marginBottom: 12 },
  sumPayButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  sumPayButtonText: { fontSize: 13, fontWeight: "600", color: "#2563EB" },
  sumPayCard: { marginBottom: 12, borderWidth: 1, borderColor: "#BFDBFE" },
  sumPayInfo: { fontSize: 13, color: "#6B7280", marginBottom: 10 },
  sumPayInput: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: "#111827", marginBottom: 10 },
  advanceHint: { fontSize: 12, color: "#1D4ED8", marginBottom: 8 },
  sumPayActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  sumPayConfirm: { backgroundColor: "#2563EB", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  sumPayConfirmText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  sumPayCancelText: { fontSize: 14, color: "#6B7280" },
  unpaidCard: { marginBottom: 8, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  invoiceTop: { flexDirection: "row", alignItems: "center" },
  invoiceActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  invoiceCode: { fontSize: 13, fontFamily: "monospace", color: "#374151" },
  invoiceDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  invoiceAmount: { fontSize: 15, fontWeight: "700", color: "#111827", marginTop: 4 },
  confirmBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  confirmBtnText: { fontSize: 13, fontWeight: "600", color: "#15803D" },
  creditBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  creditBtnText: { fontSize: 13, fontWeight: "600", color: "#1D4ED8" },
  paidAmount: { fontSize: 15, fontWeight: "600", color: "#15803D" },
  txType: { fontSize: 14, fontWeight: "600", color: "#111827" },
  txDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: "700" },
  creditTxCard: { borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#F0F9FF" },
  actions: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 20 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  actionText: { fontSize: 14, fontWeight: "600", color: "#2563EB" },
  detailsCard: { marginBottom: 20 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  detailLabel: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  detailValue: { fontSize: 14, color: "#111827", fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  aptCard: { marginBottom: 8 },
  aptRow: { flexDirection: "row", alignItems: "center" },
  aptDate: { fontSize: 14, fontWeight: "600", color: "#111827" },
  aptTime: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", paddingVertical: 24 },
});
