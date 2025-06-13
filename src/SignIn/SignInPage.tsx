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
import firebase from "firebase/compat/app";
import * as firebaseui from "firebaseui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import NavigationBar from "@/NavigationBar";

/* TODO: Implement these providers ourselves and remove this dependency
 * Phone Auth doesn't work
 * Not updated to latest Firebase version that allows for tree shaking
 * Generally feels unmaintained
*/
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
  let redirectUrl = searchParams.get('redirectUrl') ?? "/";
  redirectUrl = redirectUrl !== "/signIn" ? redirectUrl : "/";
  console.log(`RedirectUrl set to ${redirectUrl}`)

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

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);

    // const userCredential = await signInWithPopup(auth, new GoogleAuthProvider())
    // GoogleAuthProvider.credentialFromResult(userCredential)
    GoogleAuthProvider.credentialFromResult(result)
  }

  const LoginCard = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </a>
                </div>
                <Input id="password" type="password" required />
              </div>
              {/* <div className="flex items-center justify-between">
                <Label className="cursor-pointer">
                  <Input type="checkbox" />
                  Remember me
                </Label>
                <a href="#" className="text-sm underline-offset-4 hover:underline">
                  Need help?
                </a>
              </div> */}
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </div>

              {/* Or continue with */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>

              {/* Alternative login options */}
              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={() => { setSignInOption(SignInOptions.phone) }}>
                  Phone SignIn
                </Button>
                <Button className="w-full" onClick={() => { setSignInOption(SignInOptions.emailLink) }}>
                  Email Link SignIn
                </Button>
                <Button className="w-full" onClick={googleSignIn}>
                  Google SignIn
                </Button>
              </div>
            </div>

            <p className="mt-4 text-center text-sm">
              Don&apos;t have an account?
              <br />
              <span className="text-xs">You can sign up with one of the options above!</span>
            </p>
          </form>
        </CardContent>
      </Card>
    )
  }

  const onResetFlows = () => {
    setSignInOption(undefined);
  }

  const isEmailLink = isSignInWithEmailLink(auth, window.location.href);

  return (
    <>
      <NavigationBar />
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col gap-6">
            {user != null ? (<CompleteRegistration />)
              : SignInOptions.phone == signInOption ? (<PhoneSignInFlow onCancel={onResetFlows} />)
                : SignInOptions.emailLink == signInOption || isEmailLink ? (<EmailSignInFlow onCancel={onResetFlows} />)
                  : (<LoginCard />)
            }
          </div>
          <br />
          <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
            By continuing, you are indicating that you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </div>
        </div>
        <FirebaseWebUI />
      </div>
    </>
  )
}
