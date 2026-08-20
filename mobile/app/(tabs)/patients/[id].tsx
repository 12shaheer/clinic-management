import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import type { Patient, Appointment } from "@/types/database";

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [{ data: p }, { data: apts }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).single(),
        supabase
          .from("appointments")
          .select("*, physiotherapists(first_name, last_name)")
          .eq("patient_id", id)
          .order("appointment_date", { ascending: false })
          .limit(10),
      ]);

      setPatient(p as Patient);
      setAppointments((apts as Appointment[]) ?? []);
      setLoading(false);
    }
    fetch();
  }, [id]);

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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  bigAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  code: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 8,
    fontFamily: "monospace",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  detailsCard: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    maxWidth: "60%",
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  aptCard: {
    marginBottom: 8,
  },
  aptRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aptDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  aptTime: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 24,
  },
});
