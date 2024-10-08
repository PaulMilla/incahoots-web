import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebaseApp";
import { ReactNode, useEffect, useState } from "react";
import { AuthUser, FirebaseAuthContext } from "./FirebaseAuthContext";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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
