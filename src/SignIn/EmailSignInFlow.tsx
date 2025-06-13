import { auth } from "../lib/firebaseApp";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from "firebase/auth";
import { isProfileComplete } from "../auth/FirebaseAuthContext";
import { CompleteRegistration } from "./CompleteRegistration";
import { registrationComplete } from "../lib/inCahootsApi";
import { Button } from "@/components/ui/button";

enum SignInStep {
  enterEmail,
  emailSent,
  completeRegistration
}

export function EmailSignInFlow({onCancel: onCancel}: {onCancel?: () => void}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>();
  const [signInStep, setSignInStep] = useState<SignInStep>();

  const CancelButton = () => {
    const onCancelClicked = () => {
      if (onCancel) {
        onCancel();
      }
    }
    return (
      <Button onClick={onCancelClicked}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
        type="button"
        id="cancel-phone-sign-in"
      >Cancel</Button>
    )
  }

  async function onEmailSubmit() {
    const currentLocation = window.location.href;
    const actionCodeSettings = {
      // URL you want to redirect back to. The domain (www.example.com) for this
      // URL must be in the authorized domains list in the Firebase Console.
      url: currentLocation,
      handleCodeInApp: true, // This must be true.
      /*
      iOS: {
        bundleId: 'com.example.ios'
      },
      android: {
        packageName: 'com.example.android',
        installApp: true,
        minimumVersion: '12'
      },
      */
      // dynamicLinkDomain: 'example.page.link'
    };

    try {
      if (email == null) {
        console.log('email is null');
        return;
      }

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email ?? "");
      setSignInStep(SignInStep.emailSent)
    } catch (error) {
      console.error(error);
    }
  }

  async function emailLinkSignIn(link: string, redirectUrl: string = "/") {
    // Additional state parameters can also be passed via URL.
    // This can be used to continue the user's intended action before triggering
    // the sign-in operation.
    // Get the email if available. This should be available if the user completes
    // the flow on the same device where they started it.
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      // User opened the link on a different device. To prevent session fixation
      // attacks, ask the user to provide the associated email again. For example:
      email = window.prompt('Please provide your email for confirmation');
    }
    if (!email) {
      console.log(`Email provided via link is invalid`)
      return
    }

    try {
      // The client SDK will parse the code from the link for you.
      const userCredentials = await signInWithEmailLink(auth, email, link);
      // Clear email from storage.
      window.localStorage.removeItem('emailForSignIn');
      console.log(userCredentials);
      const authUser = userCredentials.user
      if (isProfileComplete(authUser)) {
        console.log('Login complete. Redirecting...')

        const phone = authUser.phoneNumber;
        const email = authUser.email
        if (!phone || !email) {
          console.error(`phone (${phone ?? ""}) or email (${email ?? ""}) are null`)
          return
        }
        await registrationComplete(authUser)
        navigate(redirectUrl);
      } else {
        console.log('Login successful, but profile incomplete. Showing Complete Registration View...')
        setSignInStep(SignInStep.completeRegistration)
      }
      // You can access the new user via result.user
      // Additional user info profile not available via:
      // result.additionalUserInfo.profile == null
      // You can check if the user is new or existing:
      // result.additionalUserInfo.isNewUser
    } catch (error) {
      // Some error occurred, you can inspect the code: error.code
      // Common errors could be invalid email and invalid or expired OTPs.
      console.error(error);
    }
  }

  const isEmailLink = isSignInWithEmailLink(auth, window.location.href);
  useEffect(() => {
    // Confirm the link is a sign-in with email link.
    if (isEmailLink) {
      emailLinkSignIn(window.location.href);
    } else {
      console.log("not email link?");
    }
  });

  return SignInStep.emailSent == signInStep ? (
    <p>Email sent! Check your inbox to finish logging in</p>
  ) : SignInStep.completeRegistration == signInStep ? (
    <CompleteRegistration />
  ) : isEmailLink ? (
    <p>Validating email link..</p>
  ) : (
    <form>
      <label>Enter email: </label>
      <input
        value={email}
        onChange={x => setEmail(x.target.value)}
        className="outline outline-offset-2 outline-1" />
      <br /> <br />
      <Button onClick={onEmailSubmit}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
        type="button"
      >Send email link</Button>
      <CancelButton />
    </form>
  );
}
