import { render, screen } from "@testing-library/react-native";
import HistoryScreen from "@/app/(app)/(tabs)/history";

const mockRefetch = jest.fn();

let mockData: any = null;
let mockLoading = false;
let mockError = false;

jest.mock("@/src/hooks/use-advance", () => ({
  useAcceptTerms: () => ({}),
  useCreateAdvanceRequest: () => ({}),
  useAdvanceRequests: () => ({
    data: mockData,
    isLoading: mockLoading,
    isError: mockError,
    isSuccess: !mockLoading && !mockError,
    refetch: mockRefetch,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

describe("HistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockData = null;
    mockLoading = false;
    mockError = false;
  });

  it("shows empty state when no requests", () => {
    render(<HistoryScreen />);
    expect(screen.getByText("Transaction History")).toBeTruthy();
    expect(screen.getByText("No advance requests yet.")).toBeTruthy();
  });

  it("shows loading indicator when loading", () => {
    mockLoading = true;
    render(<HistoryScreen />);
    expect(screen.getByTestId("history-loading")).toBeTruthy();
  });

  it("shows error and retry button when error", () => {
    mockError = true;
    render(<HistoryScreen />);
    expect(screen.getByText("Failed to load history")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("renders requests list when data available", () => {
    mockData = [
      {
        id: "req-1",
        user_id: "user-1",
        amount_xaf: "10000.00",
        status: "success",
        campay_payout_ref: "campay-ref-1",
        failure_reason: null,
        payout_duration_seconds: 30,
        created_at: "2024-06-01T12:00:00Z",
        updated_at: "2024-06-01T12:00:30Z",
      },
    ];
    render(<HistoryScreen />);
    expect(screen.getByText("10000.00 XAF")).toBeTruthy();
    expect(screen.getByText("success")).toBeTruthy();
  });

  it("renders multiple requests", () => {
    mockData = [
      {
        id: "req-1",
        user_id: "user-1",
        amount_xaf: "10000.00",
        status: "success",
        campay_payout_ref: null,
        failure_reason: null,
        payout_duration_seconds: null,
        created_at: "2024-06-01T12:00:00Z",
        updated_at: "2024-06-01T12:00:00Z",
      },
      {
        id: "req-2",
        user_id: "user-1",
        amount_xaf: "10000.00",
        status: "failed",
        campay_payout_ref: null,
        failure_reason: "Insufficient balance",
        payout_duration_seconds: null,
        created_at: "2024-06-02T10:00:00Z",
        updated_at: "2024-06-02T10:00:05Z",
      },
    ];
    render(<HistoryScreen />);
    expect(screen.getByText("success")).toBeTruthy();
    expect(screen.getByText("failed")).toBeTruthy();
    expect(screen.getByText("Insufficient balance")).toBeTruthy();
  });
});
