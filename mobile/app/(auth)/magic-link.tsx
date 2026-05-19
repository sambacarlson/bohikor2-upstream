import { View, Text, ActivityIndicator } from "react-native";

export default function MagicLinkScreen() {
  // TODO: Handle deep link / universal link from Firebase magic link
  // This screen is a placeholder until deep linking is implemented

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <ActivityIndicator size="large" className="mb-4" />
      <Text className="text-xl font-semibold text-gray-900 mb-2">
        Processing Magic Link
      </Text>
      <Text className="text-base text-gray-500 text-center">
        Verifying your sign-in link. Please wait...
      </Text>
    </View>
  );
}