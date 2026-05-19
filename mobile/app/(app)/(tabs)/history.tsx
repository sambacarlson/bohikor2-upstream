import { View, Text, ScrollView } from "react-native";

export default function HistoryScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-2xl font-bold text-gray-900">
          Request History
        </Text>
        <Text className="text-base text-gray-500 mt-1">
          Track your advance requests
        </Text>
      </View>

      <View className="px-6">
        <View className="bg-white rounded-xl p-6 shadow-sm items-center">
          <Text className="text-4xl mb-3">📭</Text>
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            No requests yet
          </Text>
          <Text className="text-base text-gray-500 text-center">
            Your advance requests will appear here
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}