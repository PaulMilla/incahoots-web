import { auth } from "../lib/firebaseApp";

import "firebaseui/dist/firebaseui.css";
import { useEffect, useState } from "react";

import 'react-phone-number-input/style.css'
import { useNavigate, useSearchParams } from "react-router-dom";
import { isProfileComplete, useAuth } from "../auth/FirebaseAuthContext";
import { GoogleAuthProvider, isSignInWithEmailLink, signInWithPopup } from "firebase/auth";
import { EmailSignInFlow } from "./EmailSignInFlow";
import { PhoneSignInFlow } from "./PhoneSignInFlow";
import { CompleteRegistration } from "./CompleteRegistration";
// import firebase from "firebase/compat/app";
// import * as firebaseui from "firebaseui";

/* TODO: Implement these providers ourselves and remove this dependency
 * Phone Auth doesn't work
 * Not updated to latest Firebase version that allows for tree shaking
 * Generally feels unmaintained
*/
/*
function FirebaseWebUI() {
  // initialize FirebaseUI singleton
  const ui =
    firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

  // FirebaseUI config.
  // Example: https://github.com/firebase/firebaseui-web/blob/master/demo/public/app.js#L22
  // Live Demo: https://fir-ui-demo-84a6c.firebaseapp.com/
  const uiConfig = {
    signInSuccessUrl: "/",
    // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
    signInFlow: "popup",
    signInOptions: [
      // Leave the lines as is for the providers you want to offer your users.
      // firebase.auth.PhoneAuthProvider.PROVIDER_ID,
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      {
        provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
        requireDisplayName: true,
        signInMethod: "emailLink",
      },
      // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
      // firebase.auth.TwitterAuthProvider.PROVIDER_ID,
      // firebase.auth.GithubAuthProvider.PROVIDER_ID,
      {
        provider: firebase.auth.PhoneAuthProvider.PROVIDER_ID,
        // Invisible reCAPTCHA with image challenge and bottom left badge.
        recaptchaParameters: {
          type: "image",
          size: "invisible",
          badge: "bottomleft",
        },
      },
    ],
    // Terms of service url/callback.
    tosUrl: "<your-tos-url>",
    // Privacy policy url/callback.
    privacyPolicyUrl: function () {
      window.location.assign("<your-privacy-policy-url>");
    },
  };

  useEffect(() => {
    ui.start("#firebaseui-auth-container", uiConfig);
  });

  return (
    <div>
      <div id="firebaseui-auth-container" />
    </div>
  )
}
*/

enum SignInOptions {
  phone,
  emailLink,
  google,
}

export default function SignInPage() {
  const { user } = useAuth()
  const navigate = useNavigate();

  const [signInOption, setSignInOption] = useState<SignInOptions>();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirectUrl') ?? "/";
  console.log(`RedirectUrl set to ${redirectUrl}`)

  async function googleSignIn() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);

    // const userCredential = await signInWithPopup(auth, new GoogleAuthProvider())
    // GoogleAuthProvider.credentialFromResult(userCredential)
    GoogleAuthProvider.credentialFromResult(result)
  }

  function goHome() {
    navigate('/')
  }

  // If we navigate to the /signIn page when fully logged in should we redirect back home,
  // or signOut so that the user can signIn again?
  useEffect(() => {
    if (user == null) {
        console.log(`❗ User is null: ${user}`)
        return;
    }
    const isUserProfileComplete = isProfileComplete(user)
    console.log(`isUserProfileComplete: ${isUserProfileComplete}`)

    if (user != null && isUserProfileComplete) {
      console.log('SignIn complete. Redirecting back home...')
      navigate('/')
    }
  })

  const isEmailLink = isSignInWithEmailLink(auth, window.location.href)
  return user != null ? (
    <CompleteRegistration />
  ) : (
    <section>
      {
        SignInOptions.phone == signInOption ? ( <PhoneSignInFlow />) :
        SignInOptions.emailLink == signInOption || isEmailLink ? ( <EmailSignInFlow /> ) :
        (
          <div>
            <button onClick={() => {setSignInOption(SignInOptions.phone)}}
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
                    type="button"
            >Phone SignIn</button>

            <button onClick={() => {setSignInOption(SignInOptions.emailLink)}}
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
                    type="button"
            >Email SignIn</button>

            <button onClick={googleSignIn}
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
                    type="button"
            >Google SignIn</button>
            <button onClick={goHome}
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
                    type="button"
            >Home</button>
          </div>
        )
      }
      {/* <FirebaseWebUI /> */}
    </section>
  );
}
