import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "@/src/providers/auth-provider";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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
                {user?.email?.charAt(0).toUpperCase() ?? "U"}
              </Text>
            </View>
            <Text className="text-lg font-semibold text-gray-900">
              {user?.email ?? "Not signed in"}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 mb-6">
        <Text className="text-sm font-medium text-gray-500 mb-2">Account</Text>
        <View className="bg-white rounded-xl shadow-sm overflow-hidden">
          <TouchableOpacity className="px-4 py-4 border-b border-gray-100">
            <Text className="text-base text-gray-700">Phone Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-4 border-b border-gray-100">
            <Text className="text-base text-gray-700">Terms & Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-4">
            <Text className="text-base text-gray-700">Privacy Policy</Text>
          </TouchableOpacity>
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