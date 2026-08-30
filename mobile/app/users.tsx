import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

interface ClinicUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("clinic_users")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers((data as ClinicUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, [fetchUsers]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={users}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.date}>Joined {format(new Date(item.created_at), "MMM d, yyyy")}</Text>
            </View>
            <View style={styles.badges}>
              <View style={[styles.badge, item.role === "admin" ? styles.badgeAdmin : styles.badgeStaff]}>
                <Text style={[styles.badgeText, item.role === "admin" ? styles.badgeTextAdmin : styles.badgeTextStaff]}>
                  {item.role}
                </Text>
              </View>
              <View style={[styles.badge, item.status === "active" ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, item.status === "active" ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  listContent: { padding: 16, paddingBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#2563EB" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#111827" },
  email: { fontSize: 13, color: "#6B7280", marginTop: 1 },
  date: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  badges: { alignItems: "flex-end", gap: 4 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  badgeAdmin: { backgroundColor: "#EFF6FF" },
  badgeTextAdmin: { color: "#2563EB" },
  badgeStaff: { backgroundColor: "#F3F4F6" },
  badgeTextStaff: { color: "#6B7280" },
  badgeActive: { backgroundColor: "#F0FDF4" },
  badgeTextActive: { color: "#15803D" },
  badgeInactive: { backgroundColor: "#F3F4F6" },
  badgeTextInactive: { color: "#6B7280" },
  emptyContainer: { alignItems: "center", paddingTop: 64 },
  emptyText: { fontSize: 15, color: "#9CA3AF", marginTop: 12 },
});
