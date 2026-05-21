import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type FirebaseAuthTypes } from "@react-native-firebase/auth";
import { auth } from "@/src/lib/firebase";
import { api } from "@/src/lib/api";
import type { User } from "@/src/types";

interface AuthContextType {
  firebaseUser: FirebaseAuthTypes.User | null;
  backendUser: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  backendUser: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [backendUser, setBackendUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: FirebaseAuthTypes.User | null) => {
      setFirebaseUser(user);

      if (user) {
        try {
          const { data } = await api.get<{ data: User }>("/api/users/me");
          setBackendUser(data.data);
        } catch {
          setBackendUser(null);
        }
      } else {
        setBackendUser(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setBackendUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, backendUser, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
