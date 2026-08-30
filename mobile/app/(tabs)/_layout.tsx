import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "grid-outline",
  patients: "people-outline",
  appointments: "calendar-outline",
  billing: "receipt-outline",
  settings: "ellipsis-horizontal",
};

function GlassTabBar(props: any) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);

  return (
    <View style={[tabStyles.wrapper, { paddingBottom: bottomInset }]}>
      <BlurView intensity={80} tint="light" style={tabStyles.blur}>
        <View style={tabStyles.inner}>
          {props.state.routes.map((route: any, index: number) => {
            const isFocused = props.state.index === index;
            const iconName = TAB_ICONS[route.name] || "ellipse-outline";

            return (
              <TouchableOpacity
                key={route.key}
                style={tabStyles.tab}
                activeOpacity={0.6}
                onPress={() => {
                  if (!isFocused) {
                    props.navigation.navigate(route.name);
                  }
                }}
              >
                <View style={[tabStyles.iconWrap, isFocused && tabStyles.iconWrapActive]}>
                  <Ionicons
                    name={isFocused ? (iconName.replace("-outline", "") as keyof typeof Ionicons.glyphMap) : iconName}
                    size={22}
                    color={isFocused ? "#FFFFFF" : "#9CA3AF"}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 12,
  },
  blur: {
    width: "100%",
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#2563EB",
    borderRadius: 21,
    overflow: "hidden",
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
          borderBottomColor: "#E5E7EB",
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 17,
          color: "#111827",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard" }}
      />
      <Tabs.Screen
        name="patients"
        options={{ title: "Patients", headerShown: false }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ title: "Appointments" }}
      />
      <Tabs.Screen
        name="billing"
        options={{ title: "Billing" }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "More" }}
      />
    </Tabs>
  );
}
