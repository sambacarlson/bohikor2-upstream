import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSendOtp = async () => {
    // TODO: Implement Firebase Email OTP
    console.log("Send OTP to:", email);
    router.push("/(auth)/verify-otp");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Bohikor2
        </Text>
        <Text className="text-lg text-gray-500 mb-8">
          Enter your work email to get started
        </Text>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Email Address
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-4 items-center"
          onPress={handleSendOtp}
          disabled={!email}
        >
          <Text className="text-white text-base font-semibold">
            Send Verification Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 py-3 items-center"
          onPress={() => router.push("/(auth)/magic-link")}
        >
          <Text className="text-blue-600 text-sm">
            Prefer a magic link?
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}