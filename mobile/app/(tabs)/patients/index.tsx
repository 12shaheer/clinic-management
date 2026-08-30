import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import { getCached, setCache, isFresh } from "@/lib/data-cache";
import type { Patient } from "@/types/database";

export default function PatientsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const cacheKey = isAdmin ? "patients-admin" : "patients";
  const cached = getCached<Patient[]>(cacheKey);
  const [patients, setPatients] = useState<Patient[]>(cached ?? []);
  const [filtered, setFiltered] = useState<Patient[]>(cached ?? []);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatients = useCallback(async () => {
    let query = supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("created_at", today);
    }

    const { data } = await query;

    const list = (data as Patient[]) ?? [];
    setCache(cacheKey, list);
    setPatients(list);
    setFiltered(list);
    setLoading(false);
  }, [isAdmin, cacheKey]);

  useEffect(() => {
    if (isFresh(cacheKey)) return;
    fetchPatients();
  }, [fetchPatients, cacheKey]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(patients);
    } else {
      const q = search.toLowerCase();
      if (!isAdmin && search.length >= 3) {
        supabase
          .from("patients")
          .select("*")
          .or(
            `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,patient_code.ilike.%${search}%`
          )
          .limit(20)
          .then(({ data }) => {
            setFiltered((data as Patient[]) ?? []);
          });
      } else {
        setFiltered(
          patients.filter(
            (p) =>
              p.first_name.toLowerCase().includes(q) ||
              p.last_name.toLowerCase().includes(q) ||
              p.patient_code.toLowerCase().includes(q) ||
              p.phone.includes(q)
          )
        );
      }
    }
  }, [search, patients, isAdmin]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  }, [fetchPatients]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/(tabs)/patients/new" as never)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={isAdmin ? "Search patients..." : "Search by name, phone, or code..."}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {!isAdmin && !search && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
          <Text style={styles.infoBannerText}>Showing today&apos;s patients. Search to find others.</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.patientCard}
            onPress={() => router.push(`/(tabs)/patients/${item.id}` as never)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.first_name.charAt(0)}{item.last_name.charAt(0)}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>
                {item.first_name} {item.last_name}
              </Text>
              <Text style={styles.patientMeta}>
                {item.patient_code} · {item.phone}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {search ? "No patients found" : "No patients registered today"}
            </Text>
          </View>
        }
      />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoBannerText: {
    fontSize: 12,
    color: "#1D4ED8",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  patientMeta: {
    fontSize: 13,
    color: "#6B7280",
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
