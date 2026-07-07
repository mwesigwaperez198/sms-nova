import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#166534" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "700" }
      }}
    />
  );
}
