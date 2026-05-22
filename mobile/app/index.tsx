import { Redirect } from "expo-router";
import { useAuth } from "@/src/providers/auth-provider";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { firebaseUser, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (firebaseUser) {
    return <Redirect href="/(app)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}