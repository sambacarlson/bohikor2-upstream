import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function RequestAdvanceScreen() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <TouchableOpacity className="mb-4" onPress={() => router.back()}>
          <Text className="text-blue-600 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Request Advance
        </Text>
        <Text className="text-base text-gray-500">
          Review and confirm your request
        </Text>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-sm text-gray-500 mb-1">Amount</Text>
          <Text className="text-4xl font-bold text-gray-900 mb-6">
            10,000 XAF
          </Text>

          <View className="border-t border-gray-100 pt-4 mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Important Details
            </Text>
            <Text className="text-sm text-gray-500">
              • This advance will be deducted from your next salary
            </Text>
            <Text className="text-sm text-gray-500">
              • Payout is processed instantly via mobile money
            </Text>
            <Text className="text-sm text-gray-500">
              • One successful advance allowed per calendar month
            </Text>
          </View>

          <TouchableOpacity
            className={`rounded-lg py-4 items-center mb-3 ${
              confirmed ? "bg-blue-600" : "bg-gray-200"
            }`}
            onPress={() => setConfirmed(!confirmed)}
          >
            <Text
              className={`text-base font-semibold ${
                confirmed ? "text-white" : "text-gray-500"
              }`}
            >
              {confirmed ? "✓ Confirmed" : "Tap to confirm"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-lg py-4 items-center ${
              !confirmed ? "bg-gray-200" : "bg-green-600"
            }`}
            disabled={!confirmed}
          >
            <Text
              className={`text-base font-semibold ${
                !confirmed ? "text-gray-400" : "text-white"
              }`}
            >
              Submit Request
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}