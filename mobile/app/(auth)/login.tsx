import { useEffect, useState } from "react";
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
import { type FirebaseAuthTypes } from "@react-native-firebase/auth";
import { auth } from "@/src/lib/firebase";
import { useAuth } from "@/src/providers/auth-provider";

export default function LoginScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (firebaseUser) {
      router.replace("/(app)/home");
    }
  }, [firebaseUser]);

  const [countryCode, setCountryCode] = useState("+237");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [loginOtp, setLoginOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [loginError, setLoginError] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const fullPhone = `${countryCode}${loginPhone}`;
  const isValidPhone = (phone: string) => /^\+[1-9]\d{6,14}$/.test(phone);

  const handleLoginSendCode = async () => {
    setLoginError("");
    if (!loginPhone.trim()) {
      setLoginError("Phone number is required");
      return;
    }
    if (!isValidPhone(fullPhone)) {
      setLoginError("Enter a valid phone number with country code (e.g., +237 6XXXXXXXX)");
      return;
    }
    setSendingCode(true);
    try {
      const result = await auth.signInWithPhoneNumber(fullPhone);
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
    } finally {
      setSendingCode(false);
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
    setVerifyingCode(true);
    try {
      await confirmationResult.confirm(loginOtp);
      router.replace("/(app)/home");
    } catch {
      setLoginError("Invalid code. Please try again.");
      setLoginOtp("");
    } finally {
      setVerifyingCode(false);
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
          <Text className="text-gray-500 mt-2 text-center text-lg">
            Salary Advance
          </Text>
        </View>

        <View className="w-full mb-6">
          <Text className="text-xl font-bold text-gray-900 mb-5">
            Log In
          </Text>

          {loginStep === "phone" ? (
            <>
              <Text className="text-gray-700 mb-2 font-medium text-base">Phone Number</Text>
              <View className="flex-row gap-3">
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-4 text-lg w-20 text-center"
                  value={countryCode}
                  onChangeText={(text) => {
                    setCountryCode(text.startsWith("+") ? text : `+${text}`);
                    setLoginError("");
                  }}
                  keyboardType="phone-pad"
                />
                <TextInput
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-4 text-lg"
                  placeholder="6XXXXXXXX"
                  keyboardType="phone-pad"
                  value={loginPhone}
                  onChangeText={(text) => {
                    setLoginPhone(text);
                    setLoginError("");
                  }}
                />
              </View>
              {loginError ? (
                <Text className="text-red-500 mt-2 text-base">{loginError}</Text>
              ) : null}
              <TouchableOpacity
                className={`mt-6 rounded-xl py-4 items-center flex-row justify-center ${
                  loginPhone.trim() ? "bg-primary-600" : "bg-primary-300"
                }`}
                onPress={handleLoginSendCode}
                disabled={!loginPhone.trim() || sendingCode}
              >
                {sendingCode ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Continue
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-gray-700 mb-2 font-medium text-base">
                Verification Code
              </Text>
              <Text className="text-gray-500 text-base mb-3">
                We sent a 6-digit code to {fullPhone}
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-4 text-lg text-center tracking-widest"
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
                <Text className="text-red-500 mt-2 text-base">{loginError}</Text>
              ) : null}
              <TouchableOpacity
                className={`mt-6 rounded-xl py-4 items-center flex-row justify-center ${
                  loginOtp.length === 6 ? "bg-primary-600" : "bg-primary-300"
                }`}
                onPress={handleLoginVerify}
                disabled={loginOtp.length !== 6 || verifyingCode}
              >
                {verifyingCode ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Verify
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="mt-4 py-3 items-center"
                onPress={() => {
                  setLoginStep("phone");
                  setLoginOtp("");
                  setLoginError("");
                }}
              >
                <Text className="text-primary-600 font-medium text-lg">
                  Change phone number
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-4 text-gray-500 font-medium text-base">or</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        <View className="w-full">
          <TouchableOpacity
            className="rounded-lg py-4 items-center bg-gray-100 border border-gray-300"
            onPress={() => router.push("/(auth)/signup")}
          >
            <Text className="text-gray-900 font-bold text-lg">
              Start Fresh
            </Text>
            <Text className="text-gray-500 text-base mt-1">
              Sign up with an invited email
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
