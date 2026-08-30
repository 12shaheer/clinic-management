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
                <Ionicons
                  name={iconName}
                  size={24}
                  color={isFocused ? "#111827" : "#9CA3AF"}
                />
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
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
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
