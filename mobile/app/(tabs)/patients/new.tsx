import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function NewPatientScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.first_name || !form.last_name || !form.phone) {
      Alert.alert("Required", "First name, last name, and phone are required.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("patients").insert({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      email: form.email || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      address: form.address || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      notes: form.notes || null,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23505" && error.message.includes("phone")) {
        Alert.alert("Duplicate Phone", "A patient with this phone number already exists.");
      } else {
        Alert.alert("Error", "Failed to create patient. " + error.message);
      }
    } else {
      Alert.alert("Success", "Patient created successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FormField label="First Name *" value={form.first_name} onChangeText={(v) => update("first_name", v)} />
      <FormField label="Last Name *" value={form.last_name} onChangeText={(v) => update("last_name", v)} />
      <FormField label="Phone *" value={form.phone} onChangeText={(v) => update("phone", v)} keyboardType="phone-pad" />
      <FormField label="Email" value={form.email} onChangeText={(v) => update("email", v)} keyboardType="email-address" />
      <FormField label="Date of Birth" value={form.date_of_birth} onChangeText={(v) => update("date_of_birth", v)} placeholder="YYYY-MM-DD" />
      <FormField label="Gender" value={form.gender} onChangeText={(v) => update("gender", v)} placeholder="Male / Female / Other" />
      <FormField label="Address" value={form.address} onChangeText={(v) => update("address", v)} multiline />
      <FormField label="Emergency Contact Name" value={form.emergency_contact_name} onChangeText={(v) => update("emergency_contact_name", v)} />
      <FormField label="Emergency Contact Phone" value={form.emergency_contact_phone} onChangeText={(v) => update("emergency_contact_phone", v)} keyboardType="phone-pad" />
      <FormField label="Notes" value={form.notes} onChangeText={(v) => update("notes", v)} multiline />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>Create Patient</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label.replace(" *", "")}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
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
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
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
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
