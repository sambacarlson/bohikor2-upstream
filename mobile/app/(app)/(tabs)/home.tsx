import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-2xl font-bold text-gray-900 mb-1">Bohikor2</Text>
        <Text className="text-base text-gray-500">Salary Advance</Text>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-sm text-gray-500 mb-1">Available Advance</Text>
          <Text className="text-4xl font-bold text-gray-900 mb-4">
            10,000 XAF
          </Text>
          <TouchableOpacity
            className="bg-blue-600 rounded-lg py-4 items-center"
            onPress={() => router.push("/(app)/request-advance")}
          >
            <Text className="text-white text-base font-semibold">
              Request Advance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 mb-6">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Quick Actions
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-white rounded-xl p-4 shadow-sm items-center"
            onPress={() => router.push("/(app)/phone-verification")}
          >
            <Text className="text-2xl mb-2">📱</Text>
            <Text className="text-sm font-medium text-gray-700">
              Verify Phone
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-white rounded-xl p-4 shadow-sm items-center"
            onPress={() => router.push("/(app)/terms")}
          >
            <Text className="text-2xl mb-2">📋</Text>
            <Text className="text-sm font-medium text-gray-700">Terms</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-6 mb-6">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Request Status
        </Text>
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-base text-gray-500 text-center">
            No active requests
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}