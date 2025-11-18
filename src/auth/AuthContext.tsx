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
      setUser(user);

      if (!user) {
        console.debug('User logged out');
        setLoginState(LoginState.loggedOut);
        return;
      }

      const missingFields = ["displayName", "phoneNumber", "email"].filter(
        (field) => !user[field as keyof AuthUser]
      );

      if (missingFields.length > 0) {
        console.debug(`User profile incomplete, missing fields: ${missingFields.join(', ')}`);
        setLoginState(LoginState.authenticatedWithIncompleteProfile);
        return;
      }

      console.debug('User successfully signedIn');
      setLoginState(LoginState.signedIn);
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
