import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/providers/auth-provider";

export default function AppLayout() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/(auth)/login");
    }
  }, [firebaseUser, loading]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-primary-50">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="history" />
        <Stack.Screen name="terms" />
      </Stack>
    </SafeAreaView>
  );
}
