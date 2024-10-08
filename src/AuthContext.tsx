import * as React from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "./lib/firebaseApp";
import { ReactNode, useContext, useEffect, useState } from "react";

/**
 * Usage:
 *  const { user } = useAuth();
 *
 * user is either a FirebaseUser object when signed-in or null when signed-out
 */

export type AuthUser = FirebaseUser;
type ContextState = { user: AuthUser | null };

const FirebaseAuthContext = React.createContext<ContextState>({ user: null });

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // sets user when sign-in or null when sign-out
      setUser(user);
    });

    // clean up subscription on unmount
    return unsubscribe;
  }, []);

  return (
    <FirebaseAuthContext.Provider value={{ user }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const isProfileComplete = (authUser: AuthUser) => {
  const hasName = !!(authUser.displayName)
  const hasPhone = !!(authUser.phoneNumber)
  const hasEmail = !!(authUser.email)
  return hasName && hasPhone && hasEmail
}

export { AuthProvider, useAuth, isProfileComplete };
