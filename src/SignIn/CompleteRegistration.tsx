import { auth } from "../lib/firebaseApp";
import { PhoneAuthProvider, RecaptchaVerifier, signOut, updatePhoneNumber, updateProfile, verifyBeforeUpdateEmail } from "firebase/auth";
import { useState } from "react";
import PhoneInput from 'react-phone-number-input';
import { E164Number } from 'libphonenumber-js/core';
import { useNavigate } from "react-router-dom";
import { AuthUser, useAuth } from "../AuthContext";
import { registrationComplete } from "../lib/inCahootsApi";

export function CompleteRegistration() {
  const redirectUrl = "/"; // TODO: Hook up redirectUrl to go back to where the user was before
  const navigate = useNavigate();
  const { user } = useAuth();
  const submitId = 'submit-profile-change';

  // TODO: This split could be parsed better
  const splitName = user?.displayName?.split(" ") ?? ["", ""];
  const initFirstName = splitName[0];
  const initLastName = splitName[1];
  // @ts-expect-error - This seems to be the recommended way of creating an E164Number
  const initPhone: E164Number = user?.phoneNumber;
  const initEmail = user?.email;

  const [firstName, setFirstName] = useState<string>(initFirstName ?? "");
  const [lastName, setLastName] = useState<string>(initLastName ?? "");
  const [phone, setPhone] = useState<E164Number | undefined>(initPhone ?? "");
  const [email, setEmail] = useState<string>(initEmail ?? "");
  const [code, setCode] = useState<string>("");
  const [verificationId, setVerificationId] = useState<string>();

  const hasPhoneNumber = user?.phoneNumber != null;
  const hasEmail = user?.email != null;

  async function updateNewEmail(user: AuthUser, newEmail: string) {
    try {
      /* Send redirect to continue where user left off
      const actionCodeSettings = {
          url: 'https://incahoots.rsvp/'+redirectUrl,
          // handleCodeInApp: true
      };
      await verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings)
      */
      await verifyBeforeUpdateEmail(user, newEmail);

      if (phone == null) {
        console.error(`phone number is null?`)
        return
      }

      // TODO: Ideally this would be done after the email is linked to the auth profile
      await registrationComplete(user)

      // TODO: Maybe navigate to a "check your email to finish registering?" page
      navigate(redirectUrl);
    } catch (error) {
      // @ts-expect-error - How to do type checking?
      // https://stackoverflow.com/q/75447800 
      // https://stackoverflow.com/q/72322523
      const errorCode = error.code;
      console.error(`ErrorCode: ${errorCode}`);
      if (errorCode === "auth/requires-recent-login") {
        console.error(error);
        // TODO: use reauthenticateWithCredential() or reauthenticateWithPhoneNumber() and try again
        // https://firebase.google.com/docs/reference/js/auth.md#reauthenticatewithcredential_60f8043
        signOut(auth);
      } else if (errorCode === "auth/account-exists-with-different-credential") {
        // TODO: See how they recommend doing this with flutter
        // https://firebase.google.com/docs/auth/flutter/errors
      } else {
        console.error(error);
      }
    }
  }

  async function updateNewPhone(newPhoneNumber: E164Number) {
    try {
      const verifier = new RecaptchaVerifier(auth, submitId, {
        'size': 'invisible', // normal or invisible
        'callback': (response: unknown) => {
          console.log(`reCAPTCHA solved, allow signInWithPhoneNumber.`);
          console.log(response);
        }
      });

      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(newPhoneNumber, verifier);
      setVerificationId(verificationId)
    } catch (error) {
      // @ts-expect-error - How to do type checking?
      // https://stackoverflow.com/q/75447800 
      // https://stackoverflow.com/q/72322523
      const errorCode = error.code;
      console.error(`ErrorCode: ${errorCode}`);
      if (errorCode === "auth/requires-recent-login") {
        console.error(error);
        // TODO: use reauthenticateWithCredential() or reauthenticateWithPhoneNumber() and try again
        // https://firebase.google.com/docs/reference/js/auth.md#reauthenticatewithcredential_60f8043
        signOut(auth);
      } else if (errorCode === "auth/argument-error") {
        console.log("argument error?");
        console.error(error);
      } else if (errorCode === "auth/account-exists-with-different-credential") {
        // TODO: See how they recommend doing this with flutter
        // https://firebase.google.com/docs/auth/flutter/errors
      } else if (errorCode === "auth/invalid-app-credential") {
        console.error("Invalid App Credential");
        console.error(error);
      } else {
        console.error(error);
      }
    }
  }

  async function onFormSubmit() {
    try {
      if (user == null) {
        console.error(`user is null?`);
        return;
      }

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      if (!hasEmail) {
        await updateNewEmail(user, email);
        navigate(redirectUrl);
      } else {
        if (phone != null) {
          await updateNewPhone(phone);
        } else {
          console.error("TODO: Ask user to fix phone number")
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function onCodeSubmit() {
    try {
      if (user == null) {
        console.error("user is null?")
        return
      }

      if (verificationId == null) {
        console.warn("no verificationId found.")
        return
      }

      // Obtain the verificationCode from the user.
      const phoneCredential = PhoneAuthProvider.credential(verificationId, code);
      await updatePhoneNumber(user, phoneCredential);

      if (phone == null) {
        console.error(`phone number is null?`)
        return
      }

      await registrationComplete(user)
      navigate(redirectUrl);
    } catch (error) {
      console.error(error)
    }
  }

  function onQuit() {
    signOut(auth)
  }

  return verificationId !== undefined ? (
    <div>
      <form>
        <label>enter verification code: </label>
        <input
            value={code}
            onChange={x => setCode(x.target.value)}
            className="outline outline-offset-2 outline-1" />
        <br /> <br />
        <button onClick={onCodeSubmit}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
          type="button"
          id={submitId}
        >Complete Profile</button>
        <button onClick={onQuit}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
          type="button"
          id={submitId}
        >Quit</button>
      </form>
    </div>
  ) : (
    <div>
      <form>
        <label>firstName: </label>
        <input
          value={firstName}
          onChange={x => setFirstName(x.target.value)}
          className="outline outline-offset-2 outline-1" />
        <br /> <br />
        <label>lastName: </label>
        <input
          value={lastName}
          onChange={x => setLastName(x.target.value)}
          className="outline outline-offset-2 outline-1" />
        <br /> <br />
        <label>phoneNumber: </label>
        <PhoneInput
          international
          countryCallingCodeEditable={false}
          placeholder="Enter phone number"
          defaultCountry="US"
          value={phone}
          disabled={hasPhoneNumber ? true : false}
          onChange={setPhone} />
        <br /> <br />
        <label>email: </label>
        <input
          value={email}
          onChange={x => setEmail(x.target.value)}
          disabled={hasEmail ? true : false}
          className="outline outline-offset-2 outline-1" />
        <br /> <br />
        <button onClick={onFormSubmit}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
          type="button"
          id={submitId}
        >Complete Profile</button>
        <button onClick={onQuit}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
          type="button"
          id={submitId}
        >Quit</button>
      </form>
    </div>
  );
}
