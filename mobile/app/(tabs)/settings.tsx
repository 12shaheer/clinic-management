import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name.charAt(0).toUpperCase() ?? "U"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "User"}</Text>
        <Text style={styles.role}>{user?.role ?? "admin"}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
      </View>

      {user?.role === "admin" && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/reports" as any)}>
            <View style={[styles.menuIcon, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="bar-chart-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.menuLabel}>Reports</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push("/users" as any)}>
            <View style={[styles.menuIcon, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="people-outline" size={20} color="#15803D" />
            </View>
            <Text style={styles.menuLabel}>Users</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <MenuItem icon="person-outline" label="Account" />
        <MenuItem icon="notifications-outline" label="Notifications" />
        <MenuItem icon="shield-outline" label="Privacy" />
        <MenuItem icon="help-circle-outline" label="Help & Support" />
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={[styles.menuIcon, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          </View>
          <Text style={[styles.menuLabel, { color: "#DC2626" }]}>Sign Out</Text>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Clinic Mobile v1.0.0</Text>
    </View>
  );
}

function MenuItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color="#6B7280" />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  profile: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  role: {
    fontSize: 14,
    color: "#6B7280",
    textTransform: "capitalize",
    marginTop: 2,
  },
  email: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 24,
  },
});
