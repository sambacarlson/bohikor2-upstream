import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

export default function PhoneVerificationScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center px-6">
      <Text className="text-xl font-bold text-gray-900 mb-2">
        Phone verification moved
      </Text>
      <Text className="text-base text-gray-500 text-center mb-6">
        Phone verification is now part of the signup flow. Please go back and
        start from the signup screen.
      </Text>
      <TouchableOpacity
        className="bg-blue-600 rounded-lg py-4 px-8"
        onPress={() => router.replace("/(auth)/signup")}
      >
        <Text className="text-white text-base font-semibold">Go to Signup</Text>
      </TouchableOpacity>
    </View>
  );
}
