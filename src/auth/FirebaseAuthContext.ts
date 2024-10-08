import * as React from "react";
import type { User as FirebaseUser } from "firebase/auth";

export type AuthUser = FirebaseUser;
export enum LoginState {
  uninitialized,
  authenticatedWithIncompleteProfile,
  signedIn,
  loggedOut
}

type ContextState = { user: FirebaseUser | null | undefined, loginState: LoginState };
export const FirebaseAuthContext = React.createContext<ContextState>({ user: undefined, loginState: LoginState.uninitialized });

/**
 * Usage:
 *  const { user, loginState } = useAuth();
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