import { View, Text, StyleSheet } from "react-native";

const statusColors: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "#DBEAFE", text: "#1D4ED8" },
  confirmed: { bg: "#E0E7FF", text: "#4338CA" },
  checked_in: { bg: "#FEF3C7", text: "#D97706" },
  in_session: { bg: "#F3E8FF", text: "#7C3AED" },
  completed: { bg: "#DCFCE7", text: "#15803D" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
  no_show: { bg: "#F3F4F6", text: "#4B5563" },
  active: { bg: "#DCFCE7", text: "#15803D" },
  inactive: { bg: "#F3F4F6", text: "#4B5563" },
  discharged: { bg: "#FEF3C7", text: "#D97706" },
  waiting: { bg: "#FEF3C7", text: "#D97706" },
  in_progress: { bg: "#F3E8FF", text: "#7C3AED" },
  unpaid: { bg: "#FEE2E2", text: "#DC2626" },
  partially_paid: { bg: "#FEF3C7", text: "#D97706" },
  paid: { bg: "#DCFCE7", text: "#15803D" },
  pending: { bg: "#FEF3C7", text: "#D97706" },
};

export function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] ?? { bg: "#F3F4F6", text: "#4B5563" };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
