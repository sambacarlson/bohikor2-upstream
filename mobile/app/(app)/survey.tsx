import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function SurveyScreen() {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-4xl mb-4">🎉</Text>
        <Text className="text-2xl font-bold text-gray-900 mb-2">Thank You!</Text>
        <Text className="text-base text-gray-500 text-center mb-6">
          Your feedback helps us improve the service.
        </Text>
        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-4 px-8 items-center"
          onPress={() => router.replace("/(app)/(tabs)/home")}
        >
          <Text className="text-white text-base font-semibold">
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          How was your experience?
        </Text>
        <Text className="text-base text-gray-500">
          Rate your advance request
        </Text>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm items-center">
          <Text className="text-lg font-semibold text-gray-900 mb-6">
            How satisfied are you?
          </Text>

          <View className="flex-row gap-3 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                className={`w-14 h-14 rounded-full items-center justify-center ${
                  score === s ? "bg-blue-600" : "bg-gray-100"
                }`}
                onPress={() => setScore(s)}
              >
                <Text
                  className={`text-xl font-bold ${
                    score === s ? "text-white" : "text-gray-600"
                  }`}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm text-gray-500 mb-6 text-center">
            1 = Very dissatisfied, 5 = Very satisfied
          </Text>

          <TouchableOpacity
            className={`w-full rounded-lg py-4 items-center ${
              score ? "bg-blue-600" : "bg-gray-200"
            }`}
            onPress={() => setSubmitted(true)}
            disabled={!score}
          >
            <Text
              className={`text-base font-semibold ${
                score ? "text-white" : "text-gray-400"
              }`}
            >
              Submit Feedback
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}