import * as React from "react";
import type { User as FirebaseUser } from "firebase/auth";

export type AuthUser = FirebaseUser;

type ContextState = { user: FirebaseUser | null };
export const FirebaseAuthContext = React.createContext<ContextState>({ user: null });

/**
 * Usage:
 *  const { user } = useAuth();
 *
 * user is either a FirebaseUser object when signed-in or null when signed-out
 */
export const useAuth = () => {
  const context = React.useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const isProfileComplete = (authUser: FirebaseUser) => {
  const hasName = !!(authUser.displayName)
  const hasPhone = !!(authUser.phoneNumber)
  const hasEmail = !!(authUser.email)
  return hasName && hasPhone && hasEmail
}