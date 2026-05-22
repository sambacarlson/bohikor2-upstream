import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import HomeScreen from "@/app/(app)/(tabs)/home";

const mockRouter = { push: jest.fn(), back: jest.fn() };
const mockBackendUser = {
  id: "user-1",
  email: "test@example.com",
  email_verified: true,
  firebase_uid: "fb-1",
  full_name: "Test User",
  phone_number: "237600000000",
  phone_verified: true,
  status: "active" as const,
  is_terms_accepted: true,
  terms_accepted_at: "2024-01-01T00:00:00Z",
  terms_version: "v1",
  user_ip_at_consent: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockCreateRequest = {
  mutateAsync: jest.fn().mockResolvedValue({ id: "req-1" }),
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null,
};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@/src/providers/auth-provider", () => ({
  useAuth: () => ({
    backendUser: mockBackendUser,
    firebaseUser: null,
    loading: false,
    signOut: jest.fn(),
  }),
}));

jest.mock("@/src/hooks/use-advance", () => ({
  useAcceptTerms: () => ({}),
  useCreateAdvanceRequest: () => mockCreateRequest,
  useAdvanceRequests: () => ({}),
}));

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBackendUser.is_terms_accepted = true;
  });

  it("renders welcome message", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Welcome, Test User")).toBeTruthy();
  });

  it("shows Request Advance button", () => {
    render(<HomeScreen />);
    expect(screen.getByTestId("request-advance-button")).toBeTruthy();
    expect(screen.getByText("Request Advance")).toBeTruthy();
    expect(screen.getByText("10,000 XAF")).toBeTruthy();
  });

  it("opens confirmation modal when Request Advance is tapped", () => {
    render(<HomeScreen />);
    const button = screen.getByTestId("request-advance-button");
    fireEvent.press(button);
    expect(screen.getByText("Confirm Advance Request")).toBeTruthy();
    // "10,000 XAF" appears both in button and modal
    const amountElements = screen.getAllByText("10,000 XAF");
    expect(amountElements.length).toBeGreaterThanOrEqual(2);
  });

  it("closes modal on cancel", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("request-advance-button"));
    fireEvent.press(screen.getByTestId("cancel-request-button"));
    expect(screen.queryByText("Confirm Advance Request")).toBeNull();
  });

  it("calls create request and navigates on confirm", async () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("request-advance-button"));
    fireEvent.press(screen.getByTestId("confirm-request-button"));
    await waitFor(() => {
      expect(mockCreateRequest.mutateAsync).toHaveBeenCalledWith({
        phoneNumber: "237600000000",
      });
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });
});

describe("HomeScreen - terms not accepted", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBackendUser.is_terms_accepted = false;
  });

  it("shows terms warning banner when terms not accepted", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Terms not accepted")).toBeTruthy();
  });

  it("navigates to terms when accept terms link is tapped", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("accept-terms-link"));
    expect(mockRouter.push).toHaveBeenCalled();
  });

  it("navigates to terms when Request Advance tapped without terms", () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId("request-advance-button"));
    expect(mockRouter.push).toHaveBeenCalled();
  });
});
