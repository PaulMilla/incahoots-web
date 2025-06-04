import { initializeApp } from "firebase/app";
import { Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import { Observable } from 'rxjs';

// @ts-expect-error - Unfortunately types seem to be messed up
// there are types at `/node_modules/rxfire/auth/index.d.ts'`
import { authState } from "rxfire/auth";
import { getAnalytics } from "firebase/analytics";
import { isLocalhost } from "../utils/isLocalHost";

// These are unique, but non-secret IDs for firebase projects
// https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyBtcO6gH7QsNIayV1F4GgfoHQ1CnMHeQfc",
    // https://firebase.google.com/docs/auth/web/redirect-best-practices?hl=en&authuser=0#update-authdomain
    authDomain: "in-cahoots-52c24.firebaseapp.com",
    // authDomain: "incahoots.rsvp",
    projectId: "in-cahoots-52c24",
    storageBucket: "in-cahoots-52c24.appspot.com",
    messagingSenderId: "618787522440",
    appId: "1:618787522440:web:790c7c46c845beb8289c3d",
    measurementId: "G-ZTF5EEPK8R"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

export const auth = getAuth(app)

export const authPublisher: Observable<Auth> = authState(auth)

// Only connect to emulator if AUTH_URL is defined and using localhost
const authUrlString = import.meta.env.VITE_AUTH_URL
if (authUrlString && isLocalhost(authUrlString)) {
    connectAuthEmulator(auth, authUrlString);
}
