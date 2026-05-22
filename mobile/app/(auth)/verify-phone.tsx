import { useState } from "react";
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
import { type FirebaseAuthTypes } from "@react-native-firebase/auth";
import { auth } from "@/src/lib/firebase";
import { useVerifyPhoneOTP } from "@/src/hooks/use-auth";

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [countryCode, setCountryCode] = useState("+237");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [sendingFirebase, setSendingFirebase] = useState(false);
  const [verifyingFirebase, setVerifyingFirebase] = useState(false);

  const verifyPhoneOTP = useVerifyPhoneOTP();

  const fullPhone = `${countryCode}${phoneNumber}`;
  const isValidPhone = (phone: string) => {
    return /^\+[1-9]\d{6,14}$/.test(phone);
  };

  const handleSendCode = async () => {
    setError("");

    if (!phoneNumber.trim()) {
      setError("Phone number is required");
      return;
    }

    if (!isValidPhone(fullPhone)) {
      setError("Enter a valid phone number with country code (e.g., +237 6XXXXXXXX)");
      return;
    }

    setSendingFirebase(true);
    try {
      const result = await auth.signInWithPhoneNumber(fullPhone);
      setConfirmationResult(result);
      setStep("otp");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "auth/invalid-phone-number"
      ) {
        setError("Invalid phone number. Please check and try again.");
      } else {
        setError("Failed to send verification code. Please try again.");
      }
    } finally {
      setSendingFirebase(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError("");

    if (otpCode.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }

    if (!confirmationResult) {
      setError("No verification session found. Please try again.");
      return;
    }

    setVerifyingFirebase(true);
    try {
      await confirmationResult.confirm(otpCode);
    } catch {
      setError("Invalid code. Please try again.");
      setOtpCode("");
      setVerifyingFirebase(false);
      return;
    }
    setVerifyingFirebase(false);

    try {
      await verifyPhoneOTP.mutateAsync({ email, phoneNumber: fullPhone });
      router.replace("/(app)/(tabs)/home");
    } catch (err: unknown) {
      console.log("err2=====: ", err);
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response
      ) {
        const data = (err.response as { data?: { error?: string } }).data;
        setError(data?.error || "Failed to complete signup. Please try again.");
      } else {
        setError("Network error. Please try again.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6">
        {step === "phone" ? (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-gray-900">
                Verify your phone
              </Text>
              <Text className="text-gray-500 mt-2 text-center">
                Enter your phone number to receive a verification code via SMS
              </Text>
            </View>

            <View className="w-full">
              <Text className="text-gray-700 mb-2 font-medium">
                Phone number
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base w-20 text-center"
                  value={countryCode}
                  onChangeText={(text) => {
                    setCountryCode(text.startsWith("+") ? text : `+${text}`);
                    setError("");
                  }}
                  keyboardType="phone-pad"
                />
                <TextInput
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="6XXXXXXXX"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    setError("");
                  }}
                  autoFocus
                />
              </View>

              {error ? (
                <Text className="text-red-500 mt-2 text-sm">{error}</Text>
              ) : null}

              <TouchableOpacity
                className={`mt-6 rounded-lg py-4 items-center flex-row justify-center ${verifyPhoneOTP.isPending || sendingFirebase ? "bg-blue-300" : "bg-blue-600"
                  }`}
                onPress={handleSendCode}
                disabled={verifyPhoneOTP.isPending || sendingFirebase}
              >
                {verifyPhoneOTP.isPending || sendingFirebase ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Send Code
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View className="items-center mb-8">
              <Text className="text-2xl font-bold text-gray-900">
                Enter SMS code
              </Text>
              <Text className="text-gray-500 mt-2 text-center">
                We sent a 6-digit code to{"\n"}
                <Text className="font-medium text-gray-700">
                  {fullPhone}
                </Text>
              </Text>
            </View>

            <View className="w-full">
              <Text className="text-gray-700 mb-2 font-medium">
                Verification code
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-center tracking-widest"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={(text) => {
                  setOtpCode(text.replace(/[^0-9]/g, ""));
                  setError("");
                }}
                autoFocus
              />

              {error ? (
                <Text className="text-red-500 mt-2 text-sm">{error}</Text>
              ) : null}

              <TouchableOpacity
                className={`mt-6 rounded-lg py-4 items-center flex-row justify-center ${verifyPhoneOTP.isPending || verifyingFirebase ? "bg-blue-300" : "bg-blue-600"
                  }`}
                onPress={handleVerifyOTP}
                disabled={verifyPhoneOTP.isPending || verifyingFirebase || otpCode.length !== 6}
              >
                {verifyPhoneOTP.isPending || verifyingFirebase ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    Verify & Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-4 py-3 items-center"
                onPress={() => {
                  setStep("phone");
                  setOtpCode("");
                  setError("");
                }}
              >
                <Text className="text-blue-600 font-medium">
                  Change phone number
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
