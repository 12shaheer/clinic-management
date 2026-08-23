import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import type { Appointment } from "@/types/database";

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const fetchAppointments = useCallback(async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*, patients(first_name, last_name, patient_code), physiotherapists(first_name, last_name)")
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: true })
      .limit(50);

    setAppointments((data as Appointment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, [fetchAppointments]);

  async function handleStatusUpdate(id: string, status: string) {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Failed to update status.");
    } else {
      fetchAppointments();
    }
  }

  function showActions(apt: Appointment) {
    const actions: Array<{ text: string; onPress?: () => void; style?: "cancel" | "destructive" }> = [];

    if (apt.status === "scheduled") {
      actions.push({ text: "Confirm", onPress: () => handleStatusUpdate(apt.id, "confirmed") });
      actions.push({ text: "Cancel", style: "destructive", onPress: () => handleStatusUpdate(apt.id, "cancelled") });
    } else if (apt.status === "confirmed") {
      actions.push({ text: "Check In", onPress: () => handleStatusUpdate(apt.id, "checked_in") });
      actions.push({ text: "Cancel", style: "destructive", onPress: () => handleStatusUpdate(apt.id, "cancelled") });
    } else if (apt.status === "checked_in") {
      actions.push({ text: "Complete", onPress: () => handleStatusUpdate(apt.id, "completed") });
    }

    actions.push({ text: "Dismiss", style: "cancel" });
    Alert.alert(
      `${apt.patients?.first_name} ${apt.patients?.last_name}`,
      `${apt.appointment_date} at ${apt.start_time}`,
      actions
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const sections = [
    {
      title: "Today",
      data: appointments.filter((a) => a.appointment_date === today),
    },
    {
      title: "Upcoming",
      data: appointments.filter((a) => a.appointment_date > today),
    },
    {
      title: "Past",
      data: appointments.filter((a) => a.appointment_date < today),
    },
  ].filter((s) => s.data.length > 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => showActions(item)} activeOpacity={0.7}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>
                  {item.patients?.first_name} {item.patients?.last_name}
                </Text>
                <Text style={styles.meta}>
                  {format(new Date(item.appointment_date), "MMM d")} · {item.start_time}
                  {item.end_time ? ` - ${item.end_time}` : ""}
                </Text>
                {item.physiotherapists && (
                  <Text style={styles.physio}>
                    Dr. {item.physiotherapists.first_name} {item.physiotherapists.last_name}
                  </Text>
                )}
              </View>
              <StatusBadge status={item.status} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No appointments</Text>
          </View>
        }
        ListHeaderComponent={
          <TouchableOpacity style={styles.newButton} onPress={() => setShowNewModal(true)}>
            <Ionicons name="add-circle" size={20} color="#2563EB" />
            <Text style={styles.newButtonText}>New Appointment</Text>
          </TouchableOpacity>
        }
      />

      <NewAppointmentModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={() => {
          setShowNewModal(false);
          fetchAppointments();
        }}
      />
    </View>
  );
}

function NewAppointmentModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patients, setPatients] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [physios, setPhysios] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [form, setForm] = useState({
    patient_id: "",
    physiotherapist_id: "",
    appointment_date: format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    end_time: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      supabase.from("patients").select("id, first_name, last_name").eq("status", "active")
        .then(({ data }) => setPatients(data ?? []));
      supabase.from("physiotherapists").select("id, first_name, last_name").eq("status", "active")
        .then(({ data }) => setPhysios(data ?? []));
    }
  }, [visible]);

  async function handleCreate() {
    if (!form.patient_id || !form.physiotherapist_id || !form.appointment_date || !form.start_time) {
      Alert.alert("Required", "Please fill patient, physiotherapist, date, and start time.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: form.patient_id,
      physiotherapist_id: form.physiotherapist_id,
      appointment_date: form.appointment_date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      notes: form.notes || null,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setForm({ patient_id: "", physiotherapist_id: "", appointment_date: format(new Date(), "yyyy-MM-dd"), start_time: "", end_time: "", notes: "" });
      onCreated();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={modalStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={modalStyles.title}>New Appointment</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#2563EB" /> : <Text style={modalStyles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView style={modalStyles.body}>
        <Text style={modalStyles.label}>Patient</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.chipRow}>
          {patients.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[modalStyles.chip, form.patient_id === p.id && modalStyles.chipActive]}
              onPress={() => setForm((f) => ({ ...f, patient_id: p.id }))}
            >
              <Text style={[modalStyles.chipText, form.patient_id === p.id && modalStyles.chipTextActive]}>
                {p.first_name} {p.last_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={modalStyles.label}>Physiotherapist</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.chipRow}>
          {physios.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[modalStyles.chip, form.physiotherapist_id === p.id && modalStyles.chipActive]}
              onPress={() => setForm((f) => ({ ...f, physiotherapist_id: p.id }))}
            >
              <Text style={[modalStyles.chipText, form.physiotherapist_id === p.id && modalStyles.chipTextActive]}>
                Dr. {p.first_name} {p.last_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={modalStyles.label}>Date</Text>
        <TextInput
          style={modalStyles.input}
          value={form.appointment_date}
          onChangeText={(v) => setForm((f) => ({ ...f, appointment_date: v }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={modalStyles.label}>Start Time</Text>
        <TextInput
          style={modalStyles.input}
          value={form.start_time}
          onChangeText={(v) => setForm((f) => ({ ...f, start_time: v }))}
          placeholder="HH:MM (e.g., 09:00)"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={modalStyles.label}>End Time (optional)</Text>
        <TextInput
          style={modalStyles.input}
          value={form.end_time}
          onChangeText={(v) => setForm((f) => ({ ...f, end_time: v }))}
          placeholder="HH:MM (e.g., 09:30)"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={modalStyles.label}>Notes (optional)</Text>
        <TextInput
          style={[modalStyles.input, { minHeight: 80, textAlignVertical: "top" }]}
          value={form.notes}
          onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
          placeholder="Additional notes..."
          placeholderTextColor="#9CA3AF"
          multiline
        />
      </ScrollView>
    </Modal>
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  meta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  physio: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
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

const modalStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  cancelText: {
    fontSize: 16,
    color: "#6B7280",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginTop: 14,
    marginBottom: 8,
  },
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
  chipRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#2563EB",
  },
  chipText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});
