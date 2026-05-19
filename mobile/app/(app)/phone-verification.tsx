import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function PhoneVerificationScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionCode, setTransactionCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <TouchableOpacity className="mb-4" onPress={() => router.back()}>
          <Text className="text-blue-600 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          Phone Verification
        </Text>
        <Text className="text-base text-gray-500">
          Verify your mobile money wallet
        </Text>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          {step === "phone" ? (
            <>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Mobile Money Phone Number
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base mb-4"
                placeholder="+237 6XX XXX XXX"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />

              <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <Text className="text-sm text-yellow-800">
                  A non-refundable fee of{" "}
                  <Text className="font-semibold">5 XAF</Text> will be charged
                  to verify your wallet.
                </Text>
              </View>

              <TouchableOpacity
                className="bg-blue-600 rounded-lg py-4 items-center"
                onPress={() => setStep("code")}
                disabled={!phoneNumber}
              >
                <Text className="text-white text-base font-semibold">
                  Verify & Pay 5 XAF
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Transaction Code
              </Text>
              <Text className="text-sm text-gray-500 mb-4">
                Enter the last 6 digits of the transaction ID from your mobile
                money prompt
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base text-center tracking-widest mb-4"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={transactionCode}
                onChangeText={setTransactionCode}
              />

              <TouchableOpacity
                className="bg-blue-600 rounded-lg py-4 items-center"
                disabled={transactionCode.length !== 6}
              >
                <Text className="text-white text-base font-semibold">
                  Verify Code
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}