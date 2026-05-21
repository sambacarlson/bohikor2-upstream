import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "@/src/providers/auth-provider";

export default function ProfileScreen() {
  const { firebaseUser, backendUser, signOut } = useAuth();

  const displayName = backendUser?.full_name || firebaseUser?.email || "Not signed in";
  const email = backendUser?.email || firebaseUser?.email || "";
  const phone = backendUser?.phone_number || "Not verified";

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-3">
              <Text className="text-2xl font-bold text-blue-600">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-lg font-semibold text-gray-900">
              {displayName}
            </Text>
            {email ? (
              <Text className="text-sm text-gray-500 mt-1">{email}</Text>
            ) : null}
          </View>

          <View className="mt-4 pt-4 border-t border-gray-100">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Phone</Text>
              <Text className="text-sm text-gray-900">{phone}</Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-gray-500">Email verified</Text>
              <Text className="text-sm text-gray-900">
                {backendUser?.email_verified ? "Yes" : "No"}
              </Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-sm text-gray-500">Phone verified</Text>
              <Text className="text-sm text-gray-900">
                {backendUser?.phone_verified ? "Yes" : "No"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-6 mb-6">
        <TouchableOpacity
          className="bg-white rounded-xl p-4 shadow-sm items-center"
          onPress={signOut}
        >
          <Text className="text-red-600 text-base font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}