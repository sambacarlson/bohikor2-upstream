import { useState, useRef, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useVerifyEmailOTP, useSendEmailOTP } from "@/src/hooks/use-auth";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const verifyEmailOTP = useVerifyEmailOTP();
  const sendEmailOTP = useSendEmailOTP();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    setError("");

    if (code.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }

    try {
      await verifyEmailOTP.mutateAsync({ email, code });
      router.push({
        pathname: "/(auth)/verify-phone",
        params: { email },
      });
    } catch {
      setError("Invalid or expired code. Please try again.");
      setCode("");
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");

    try {
      await sendEmailOTP.mutateAsync(email);
      setResendCooldown(60);
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-gray-900">
            Check your email
          </Text>
          <Text className="text-gray-500 mt-2 text-center">
            We sent a 6-digit code to{"\n"}
            <Text className="font-medium text-gray-700">{email}</Text>
          </Text>
        </View>

        <View className="w-full">
          <Text className="text-gray-700 mb-2 font-medium">
            Verification code
          </Text>
          <TextInput
            ref={inputRef}
            className="border border-gray-300 rounded-lg px-4 py-3 text-center tracking-widest"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/[^0-9]/g, ""));
              setError("");
            }}
            autoFocus
          />

          {error ? (
            <Text className="text-red-500 mt-2 text-sm">{error}</Text>
          ) : null}

          <TouchableOpacity
            className={`mt-6 rounded-lg py-4 items-center ${verifyEmailOTP.isPending
                ? "bg-blue-300"
                : "bg-blue-600"
              }`}
            onPress={handleVerify}
            disabled={verifyEmailOTP.isPending || code.length !== 6}
          >
            {verifyEmailOTP.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4 py-3 items-center"
            onPress={handleResend}
            disabled={resendCooldown > 0 || sendEmailOTP.isPending}
          >
            {sendEmailOTP.isPending ? (
              <ActivityIndicator />
            ) : (
              <Text
                className={
                  resendCooldown > 0
                    ? "text-gray-400"
                    : "text-blue-600 font-medium"
                }
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
