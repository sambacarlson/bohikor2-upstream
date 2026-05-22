import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/src/providers/auth-provider";

export default function AppLayout() {
  const { firebaseUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!firebaseUser) {
      router.replace("/(auth)/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  return <Stack screenOptions={{ headerShown: false }} />;
}