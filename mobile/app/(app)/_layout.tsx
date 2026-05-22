import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/src/providers/auth-provider";

export default function AppLayout() {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace("/(auth)/login");
    }
  }, [firebaseUser, loading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}