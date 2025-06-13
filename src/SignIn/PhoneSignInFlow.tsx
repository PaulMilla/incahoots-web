import { auth } from "../lib/firebaseApp";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useState } from "react";
import PhoneInput from 'react-phone-number-input';
import { E164Number } from 'libphonenumber-js/core';
import { useNavigate } from "react-router-dom";
import { isProfileComplete } from "../auth/FirebaseAuthContext";
import { CompleteRegistration } from "./CompleteRegistration";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

enum SignInStep {
  phoneSignIn,
  phoneConfirmation,
  completeRegistration
}

export function PhoneSignInFlow({onCancel: onCancel}: {onCancel?: () => void}) {
  const redirectUrl = "/"

  const [signInStep, setSignInStep] = useState<SignInStep>(SignInStep.phoneSignIn);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult>();

  const onCancelClicked = () => {
    if (onCancel) {
      onCancel();
    }
  }
  const CancelButton = () => {
    return (
      <Button onClick={onCancelClicked}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
        type="button"
        id="cancel-phone-sign-in"
      >Cancel</Button>
    )
  }

  function RequestPhoneNumberView() {
    // `value` will be the parsed phone number in E.164 format.
    // Example: "+12133734253".
    const [phoneNumber, setPhoneNumber] = useState<E164Number>();

    async function onSubmitPhone() {
      if (phoneNumber === undefined) {
        console.log(`Phone number is undefined!`);
        return;
      }

      const verifier = new RecaptchaVerifier(auth, 'submit-phone', {
        'size': 'invisible', // normal or invisible
        'callback': (response: unknown) => {
          console.log(`reCAPTCHA solved, allow signInWithPhoneNumber.`);
          console.log(response);
        }
      });

      try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        setConfirmationResult(confirmationResult);
        setSignInStep(SignInStep.phoneConfirmation);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        toast.error(`Error: ${error.message}`)
        console.log(`Error: SMS not sent`);
        console.log(error);
      }
    }

    // Leverage react-phone-number-input
    // https://gitlab.com/catamphetamine/react-phone-number-input#readme
    // Demo: https://catamphetamine.gitlab.io/react-phone-number-input/
    return (
      <div>
        <PhoneInput
          international
          countryCallingCodeEditable={false}
          placeholder="Enter phone number"
          defaultCountry="US"
          value={phoneNumber}
          onChange={setPhoneNumber} />

        <br />

        <Button onClick={onSubmitPhone}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center"
          type="button"
          id="submit-phone"
        >Send Text</Button>

        <CancelButton />
      </div>
    );
  }

  function VerifyCodeView() {
    const navigate = useNavigate();
    const [verifyCode, setVerifyCode] = useState<string>("");

    async function onSubmitCode() {
      // SMS sent. Prompt user to type the code from the message, then sign the
      // user in with confirmationResult.confirm(code).
      if (confirmationResult === undefined) {
        console.log(`confirmationResult is undefined!`);
        return;
      }

      try {
        const result = await confirmationResult.confirm(verifyCode);
        const user = result.user;
        console.log(`User signed in successfully: ${user.displayName}`);
        console.log(user);

        if (isProfileComplete(user)) {
          console.log(`User Profile complete! Navigating to redirectUrl: ${redirectUrl}`)
          navigate(redirectUrl)
        } else {
          const hasName = !!(user.displayName)
          const hasPhone = !!(user.phoneNumber)
          const hasEmail = !!(user.email)
          console.log(`User profile missing ${hasName ? "displayName" : ""} ${hasPhone ? "phoneNumber" : ""} ${hasEmail ? "email" : ""}`)
        }
        setSignInStep(SignInStep.completeRegistration)
      } catch (error) {
        console.log(`User couldn't sign in (bad verification code?)`);
        console.log(error);
      }
    }

    return (
      <div>
        <Input
          value={verifyCode}
          onChange={x => setVerifyCode(x.target.value)}
        />

        <br />

        <Button onClick={onSubmitCode}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
          type="button"
          id="submit-phone-code"
        >Verify Code</Button>

        <CancelButton />
      </div>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Phone SignIn
        </CardTitle>
        <CardDescription>
          Enter your phone details below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {SignInStep.phoneSignIn == signInStep ? (
          <RequestPhoneNumberView />
        ) : SignInStep.phoneConfirmation == signInStep ? (
          <VerifyCodeView />
        ) : SignInStep.completeRegistration == signInStep ? (
          <CompleteRegistration />
        ) : (
          <div>Something, somewhere is wrong</div>
        )}
      </CardContent>
    </Card>
  );
}
