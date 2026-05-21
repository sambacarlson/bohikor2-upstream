import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useCheckInvitation, useSendEmailOTP } from "@/src/hooks/use-auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const checkInvitation = useCheckInvitation();
  const sendEmailOTP = useSendEmailOTP();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleContinue = async () => {
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const result = await checkInvitation.mutateAsync(email.trim());
      if (!result.has_invitation) {
        setError("No invitation found for this email. Contact your manager.");
        return;
      }

      await sendEmailOTP.mutateAsync(email.trim());
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim() },
      });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response
      ) {
        const data = (err.response as { data?: { error?: string } }).data;
        setError(data?.error || "Failed to check invitation. Please try again.");
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-900">Bohikor2</Text>
          <Text className="text-gray-500 mt-2 text-center">
            Enter your email to get started
          </Text>
        </View>

        <View className="w-full">
          <Text className="text-gray-700 mb-2 font-medium">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
          />

          {error ? (
            <Text className="text-red-500 mt-2 text-sm">{error}</Text>
          ) : null}

          <TouchableOpacity
            className={`mt-6 rounded-lg py-4 items-center ${
              checkInvitation.isPending || sendEmailOTP.isPending
                ? "bg-blue-300"
                : "bg-blue-600"
            }`}
            onPress={handleContinue}
            disabled={checkInvitation.isPending || sendEmailOTP.isPending}
          >
            {checkInvitation.isPending || sendEmailOTP.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
