import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";

export default function VerifyOtpScreen() {
  const [otp, setOtp] = useState("");

  const handleVerify = async () => {
    // TODO: Implement Firebase OTP verification
    console.log("Verify OTP:", otp);
  };

  const handleResend = async () => {
    // TODO: Resend OTP
    console.log("Resend OTP");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          Verify Your Email
        </Text>
        <Text className="text-lg text-gray-500 mb-8">
          Enter the 6-digit code sent to your email
        </Text>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            Verification Code
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3 text-base text-center tracking-widest"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
        </View>

        <TouchableOpacity
          className="bg-blue-600 rounded-lg py-4 items-center"
          onPress={handleVerify}
          disabled={otp.length !== 6}
        >
          <Text className="text-white text-base font-semibold">Verify</Text>
        </TouchableOpacity>

        <TouchableOpacity className="mt-4 py-3 items-center" onPress={handleResend}>
          <Text className="text-blue-600 text-sm">Resend code</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}