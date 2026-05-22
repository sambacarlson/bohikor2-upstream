import { render, screen, fireEvent } from "@testing-library/react-native";
import ProfileScreen from "@/app/(app)/(tabs)/profile";

const mockSignOut = jest.fn();
const mockBackendUser: {
  id: string;
  email: string;
  email_verified: boolean;
  firebase_uid: string;
  full_name: string | null;
  phone_number: string;
  phone_verified: boolean;
  status: string;
  is_terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;
  user_ip_at_consent: null;
  created_at: string;
  updated_at: string;
} = {
  id: "user-1",
  email: "test@example.com",
  email_verified: true,
  firebase_uid: "fb-1",
  full_name: "Test User",
  phone_number: "237600000000",
  phone_verified: true,
  status: "active",
  is_terms_accepted: true,
  terms_accepted_at: "2024-01-01T00:00:00Z",
  terms_version: "v1",
  user_ip_at_consent: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("@/src/providers/auth-provider", () => ({
  useAuth: () => ({
    backendUser: mockBackendUser,
    firebaseUser: null,
    loading: false,
    signOut: mockSignOut,
    refreshBackendUser: jest.fn(),
  }),
}));

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders profile title", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Profile")).toBeTruthy();
  });

  it("shows user email and phone", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("test@example.com")).toBeTruthy();
    expect(screen.getByText("237600000000")).toBeTruthy();
  });

  it("shows user name when available", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Test User")).toBeTruthy();
  });

  it("shows terms accepted status", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Accepted")).toBeTruthy();
  });

  it("shows account status", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("active")).toBeTruthy();
  });

  it("shows email and phone verification", () => {
    render(<ProfileScreen />);
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Sign Out button", () => {
    render(<ProfileScreen />);
    expect(screen.getByText("Sign Out")).toBeTruthy();
  });

  it("calls signOut when Sign Out is pressed", () => {
    render(<ProfileScreen />);
    const button = screen.getByText("Sign Out");
    fireEvent.press(button);
    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe("ProfileScreen - partial data", () => {
  it("shows fallbacks when user has no name", () => {
    mockBackendUser.full_name = null;

    render(<ProfileScreen />);
    expect(screen.getByText("Your Information")).toBeTruthy();
    expect(screen.getByText("test@example.com")).toBeTruthy();

    mockBackendUser.full_name = "Test User";
  });

  it("shows 'Not accepted' when terms not accepted", () => {
    mockBackendUser.is_terms_accepted = false;

    render(<ProfileScreen />);
    expect(screen.getByText("Not accepted")).toBeTruthy();

    mockBackendUser.is_terms_accepted = true;
  });
});
