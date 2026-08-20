import { Stack } from "expo-router";

export default function PatientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 17,
          color: "#111827",
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Patient" }} />
      <Stack.Screen name="new" options={{ title: "New Patient", presentation: "modal" }} />
    </Stack>
  );
}
