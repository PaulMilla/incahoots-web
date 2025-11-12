import { initializeApp } from "firebase/app";
import { Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import { Observable } from 'rxjs';

// @ts-expect-error - Unfortunately types seem to be messed up
// there are types at `/node_modules/rxfire/auth/index.d.ts'`
import { authState } from "rxfire/auth";
import { getAnalytics } from "firebase/analytics";
import { isLocalhost } from "../utils/isLocalHost";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// These are unique, but non-secret IDs for firebase projects
// https://firebase.google.com/docs/web/learn-more#config-object
const firebaseConfig = {
    apiKey: "AIzaSyBtcO6gH7QsNIayV1F4GgfoHQ1CnMHeQfc",
    // https://firebase.google.com/docs/auth/web/redirect-best-practices?hl=en&authuser=0#update-authdomain
    authDomain: "in-cahoots-52c24.firebaseapp.com",
    // authDomain: "incahoots.rsvp",
    projectId: "in-cahoots-52c24",
    storageBucket: 'in-cahoots-52c24.firebasestorage.app',
    messagingSenderId: "618787522440",
    appId: "1:618787522440:web:790c7c46c845beb8289c3d",
    measurementId: "G-ZTF5EEPK8R"
};

// Only connect to emulator if AUTH_URL is defined and using localhost
const authUrlString = import.meta.env.VITE_AUTH_URL;
const isDevelopment = authUrlString && isLocalhost(authUrlString);

export const app = initializeApp(firebaseConfig);

// Only initialize analytics in production to avoid CORS errors in development
export const analytics = isDevelopment ? null : getAnalytics(app)
export const appCheck = isDevelopment ? null : initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6Lc6twksAAAAAE_dQTxcY_1zYfz8GOA3zk6t-LzD'),
  isTokenAutoRefreshEnabled: true
});

export const auth = getAuth(app)
if (isDevelopment) {
    connectAuthEmulator(auth, authUrlString);
}
export const authPublisher: Observable<Auth> = authState(auth)
