import { View, Text, ScrollView } from "react-native";
import { useAuth } from "@/src/providers/auth-provider";

export default function HomeScreen() {
  const { backendUser } = useAuth();

  const displayName = backendUser?.full_name || backendUser?.email || "User";
  const email = backendUser?.email || "";
  const phone = backendUser?.phone_number || "";
  const emailVerified = backendUser?.email_verified ?? false;
  const phoneVerified = backendUser?.phone_verified ?? false;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-2xl font-bold text-gray-900">
          Welcome, {displayName}
        </Text>
      </View>
      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Your Information
          </Text>
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Email</Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-900">{email}</Text>
                <Text className="text-sm ml-2">
                  {emailVerified ? "✓" : "—"}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Phone</Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-900">{phone}</Text>
                <Text className="text-sm ml-2">
                  {phoneVerified ? "✓" : "—"}
                </Text>
              </View>
            </View>
            {backendUser?.full_name ? (
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Name</Text>
                <Text className="text-sm text-gray-900">
                  {backendUser.full_name}
                </Text>
              </View>
            ) : null}
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Status</Text>
              <Text className="text-sm text-gray-900">
                {backendUser?.status || "—"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}