import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { type FirebaseAuthTypes } from "@react-native-firebase/auth";
import { auth } from "@/src/lib/firebase";

export default function LoginScreen() {
  const router = useRouter();

  const [loginPhone, setLoginPhone] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [loginOtp, setLoginOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [loginError, setLoginError] = useState("");

  const isValidPhone = (phone: string) => /^\+[1-9]\d{6,14}$/.test(phone);

  const handleLoginSendCode = async () => {
    setLoginError("");
    if (!loginPhone.trim()) {
      setLoginError("Phone number is required");
      return;
    }
    if (!isValidPhone(loginPhone.trim())) {
      setLoginError("Enter phone number with country code (e.g., +2376XXXXXXXX)");
      return;
    }
    try {
      const result = await auth.signInWithPhoneNumber(loginPhone.trim());
      setConfirmationResult(result);
      setLoginStep("otp");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "auth/invalid-phone-number"
      ) {
        setLoginError("Invalid phone number. Please check and try again.");
      } else {
        setLoginError("Failed to send verification code. Please try again.");
      }
    }
  };

  const handleLoginVerify = async () => {
    setLoginError("");
    if (loginOtp.length !== 6) {
      setLoginError("Please enter the full 6-digit code");
      return;
    }
    if (!confirmationResult) {
      setLoginError("No verification session found. Please try again.");
      return;
    }
    try {
      await confirmationResult.confirm(loginOtp);
      router.replace("/(app)/(tabs)/home");
    } catch {
      setLoginError("Invalid code. Please try again.");
      setLoginOtp("");
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
            Salary Advance
          </Text>
        </View>

        <View className="w-full mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Log In
          </Text>

          {loginStep === "phone" ? (
            <>
              <Text className="text-gray-700 mb-2 font-medium">Phone Number</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="+2376XXXXXXXX"
                keyboardType="phone-pad"
                value={loginPhone}
                onChangeText={(text) => {
                  setLoginPhone(text);
                  setLoginError("");
                }}
              />
              {loginError ? (
                <Text className="text-red-500 mt-2 text-sm">{loginError}</Text>
              ) : null}
              <TouchableOpacity
                className={`mt-4 rounded-lg py-4 items-center ${
                  loginPhone.trim() ? "bg-blue-600" : "bg-blue-300"
                }`}
                onPress={handleLoginSendCode}
                disabled={!loginPhone.trim()}
              >
                <Text className="text-white font-semibold text-base">
                  Continue
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-gray-700 mb-2 font-medium">
                Verification Code
              </Text>
              <Text className="text-gray-500 text-sm mb-2">
                We sent a 6-digit code to {loginPhone}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-center tracking-widest"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={loginOtp}
                onChangeText={(text) => {
                  setLoginOtp(text.replace(/[^0-9]/g, ""));
                  setLoginError("");
                }}
                autoFocus
              />
              {loginError ? (
                <Text className="text-red-500 mt-2 text-sm">{loginError}</Text>
              ) : null}
              <TouchableOpacity
                className={`mt-4 rounded-lg py-4 items-center ${
                  loginOtp.length === 6 ? "bg-blue-600" : "bg-blue-300"
                }`}
                onPress={handleLoginVerify}
                disabled={loginOtp.length !== 6}
              >
                <Text className="text-white font-semibold text-base">
                  Verify
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="mt-3 py-2 items-center"
                onPress={() => {
                  setLoginStep("phone");
                  setLoginOtp("");
                  setLoginError("");
                }}
              >
                <Text className="text-blue-600 font-medium">
                  Change phone number
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-4 text-gray-500 font-medium">or</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        <View className="w-full">
          <TouchableOpacity
            className="rounded-lg py-4 items-center bg-gray-100 border border-gray-300"
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text className="text-gray-900 font-semibold text-base">
              Start Fresh
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              Sign up with an invited email
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
