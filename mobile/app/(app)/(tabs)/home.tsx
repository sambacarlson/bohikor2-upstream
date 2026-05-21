import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/providers/auth-provider";
import { useCreateAdvanceRequest } from "@/src/hooks/use-advance";

export default function HomeScreen() {
  const { backendUser } = useAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const createRequest = useCreateAdvanceRequest();

  const displayName = backendUser?.full_name || backendUser?.email || "User";
  const email = backendUser?.email || "";
  const phone = backendUser?.phone_number || "";
  const emailVerified = backendUser?.email_verified ?? false;
  const phoneVerified = backendUser?.phone_verified ?? false;
  const termsAccepted = backendUser?.is_terms_accepted ?? false;

  const handleRequestAdvance = () => {
    if (!termsAccepted) {
      router.push("/(app)/terms" as any);
      return;
    }
    setModalVisible(true);
  };

  const handleConfirmRequest = async () => {
    try {
      await createRequest.mutateAsync({ phoneNumber: phone });
      setModalVisible(false);
      router.push("/(app)/(tabs)/history" as any);
    } catch {
      // Error is shown via mutation state
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6">
        <Text className="text-2xl font-bold text-gray-900">
          Welcome, {displayName}
        </Text>
      </View>

      {!termsAccepted && (
        <View className="px-6 mb-4">
          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <Text className="text-sm text-yellow-800 font-medium mb-1">
              Terms not accepted
            </Text>
            <Text className="text-xs text-yellow-700">
              You must accept the terms before requesting an advance.
            </Text>
            <TouchableOpacity
              className="mt-3 bg-yellow-600 rounded-lg py-2 px-4 self-start"
              onPress={() => router.push("/(app)/terms" as any)}
              testID="accept-terms-link"
            >
              <Text className="text-white text-sm font-semibold">Accept Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="px-6 mb-4">
        <TouchableOpacity
          className="bg-blue-600 rounded-xl p-6 shadow-sm items-center"
          onPress={handleRequestAdvance}
          testID="request-advance-button"
        >
          <Text className="text-white text-lg font-bold">Request Advance</Text>
          <Text className="text-blue-100 text-sm mt-1">10,000 XAF</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-xl p-6 shadow-sm">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Your Information
          </Text>
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Email</Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-900">{email}</Text>
                <Text className="text-sm ml-2">
                  {emailVerified ? "✓" : "—"}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Phone</Text>
              <View className="flex-row items-center">
                <Text className="text-sm text-gray-900">{phone}</Text>
                <Text className="text-sm ml-2">
                  {phoneVerified ? "✓" : "—"}
                </Text>
              </View>
            </View>
            {backendUser?.full_name ? (
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">Name</Text>
                <Text className="text-sm text-gray-900">
                  {backendUser.full_name}
                </Text>
              </View>
            ) : null}
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Status</Text>
              <Text className="text-sm text-gray-900">
                {backendUser?.status || "—"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Terms</Text>
              <Text className="text-sm text-gray-900">
                {termsAccepted ? "Accepted" : "Not accepted"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-xl p-6 w-full max-w-sm">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Confirm Advance Request
            </Text>
            <Text className="text-sm text-gray-600 mb-4">
              You are about to request a salary advance of{" "}
              <Text className="font-semibold text-gray-900">10,000 XAF</Text>.
              This amount plus any applicable charges will be deducted from your
              upcoming salary.
            </Text>

            {createRequest.isError && (
              <Text className="text-red-500 text-sm mb-4">
                {(createRequest.error as any)?.response?.data?.error ||
                  "Failed to create request. Please try again."}
              </Text>
            )}

            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity
                className="px-4 py-2 rounded-lg"
                onPress={() => setModalVisible(false)}
                disabled={createRequest.isPending}
                testID="cancel-request-button"
              >
                <Text className="text-gray-600 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-600 px-4 py-2 rounded-lg flex-row items-center"
                onPress={handleConfirmRequest}
                disabled={createRequest.isPending}
                testID="confirm-request-button"
              >
                {createRequest.isPending && (
                  <ActivityIndicator color="white" size="small" className="mr-2" />
                )}
                <Text className="text-white font-semibold">
                  {createRequest.isPending ? "Requesting..." : "Confirm"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
