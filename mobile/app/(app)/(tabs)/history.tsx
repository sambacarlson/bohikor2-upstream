import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAdvanceRequests } from "@/src/hooks/use-advance";
import type { AdvanceRequest } from "@/src/types";

const STATUS_COLORS: Record<string, string> = {
  initiated: "bg-yellow-100 text-yellow-800",
  pending: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  const [bg, text] = colorClass.split(" ");

  return (
    <View className={`rounded-full px-3 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{status}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RequestCard({ request }: { request: AdvanceRequest }) {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm font-semibold text-gray-900">
          {request.amount_xaf} XAF
        </Text>
        <StatusBadge status={request.status} />
      </View>
      <Text className="text-xs text-gray-500 mb-1">
        {formatDate(request.created_at)}
      </Text>
      {request.campay_payout_ref && (
        <Text className="text-xs text-gray-400">
          Ref: {request.campay_payout_ref}
        </Text>
      )}
      {request.failure_reason && (
        <Text className="text-xs text-red-500 mt-1">{request.failure_reason}</Text>
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { data: requests, isLoading, isError, refetch } = useAdvanceRequests();

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" testID="history-loading" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-red-500 text-base mb-4">Failed to load history</Text>
        <TouchableOpacity
          className="bg-blue-600 rounded-xl px-6 py-3"
          onPress={() => refetch()}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 pt-12 pb-6 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-900">Transaction History</Text>
        <TouchableOpacity onPress={() => refetch()} className="bg-blue-600 rounded-lg px-4 py-2">
          <Text className="text-white font-semibold text-sm">Refresh</Text>
        </TouchableOpacity>
      </View>

      <View className="px-6 mb-6">
        {requests && requests.length > 0 ? (
          requests.map((req) => <RequestCard key={req.id} request={req} />)
        ) : (
          <View className="bg-white rounded-xl p-8 shadow-sm items-center">
            <Text className="text-gray-500 text-base text-center">
              No advance requests yet.
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-1">
              Your transaction history will appear here after you make a request.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
