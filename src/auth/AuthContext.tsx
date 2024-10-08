import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseApp";
import { ReactNode, useEffect, useState } from "react";
import { AuthUser, FirebaseAuthContext, LoginState } from "./FirebaseAuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginState, setLoginState] = useState<LoginState>(LoginState.uninitialized);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // sets user when sign-in or null when sign-out
      function isProfileComplete(authUser: AuthUser) {
        const hasName = !!(authUser.displayName)
        const hasPhone = !!(authUser.phoneNumber)
        const hasEmail = !!(authUser.email)
        return hasName && hasPhone && hasEmail
      }

      setUser(user)

      if (!user) {
        setLoginState(LoginState.loggedOut)
        return
      }

      if (!isProfileComplete(user)) {
        setLoginState(LoginState.authenticatedWithIncompleteProfile)
        return
      }

      setLoginState(LoginState.signedIn)
    });

    // clean up subscription on unmount
    return unsubscribe;
  }, []);

  return (
    <FirebaseAuthContext.Provider value={{ loginState, user }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};
