import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function TermsScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <TouchableOpacity className="mb-4" onPress={() => router.back()}>
          <Text className="text-blue-600 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Terms & Conditions
        </Text>
        <Text className="text-base text-gray-500">Please review and accept</Text>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Salary Advance Terms
          </Text>

          <View className="mb-6">
            <Text className="text-base text-gray-700 mb-2">
              1. The advance amount is fixed at 10,000 XAF.
            </Text>
            <Text className="text-base text-gray-700 mb-2">
              2. Advances can only be requested between the 15th and the last
              day of every month.
            </Text>
            <Text className="text-base text-gray-700 mb-2">
              3. Only one successful advance is allowed per calendar month.
            </Text>
            <Text className="text-base text-gray-700 mb-2">
              4. Maximum one request attempt per day.
            </Text>
            <Text className="text-base text-gray-700 mb-2">
              5. The advance will be deducted from your next salary payment.
            </Text>
            <Text className="text-base text-gray-700 mb-2">
              6. Payouts are processed automatically via mobile money (Campay).
            </Text>
          </View>

          <TouchableOpacity
            className={`rounded-lg py-4 items-center mb-3 ${
              accepted ? "bg-blue-600" : "bg-gray-200"
            }`}
            onPress={() => setAccepted(!accepted)}
          >
            <Text
              className={`text-base font-semibold ${
                accepted ? "text-white" : "text-gray-500"
              }`}
            >
              {accepted ? "✓ Accepted" : "Tap to accept terms"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`rounded-lg py-4 items-center ${
              !accepted ? "bg-gray-200" : "bg-green-600"
            }`}
            disabled={!accepted}
            onPress={() => router.back()}
          >
            <Text
              className={`text-base font-semibold ${
                !accepted ? "text-gray-400" : "text-white"
              }`}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}