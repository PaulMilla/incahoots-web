import { useEffect, useState } from "react";
import { AuthUser, useAuth } from "./AuthContext.tsx";
import { useNavigate } from "react-router-dom";
import { useFloating } from "@floating-ui/react";
import { shift } from "@floating-ui/dom";
import { auth } from "./lib/firebaseApp";
import { signOut } from "firebase/auth";

export default function NavigationBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { refs, floatingStyles } = useFloating({
    middleware: [
      shift({
        padding: 15,
      }),
    ],
  });

  const routeToSignIn = () => {
    // TODO save pre-sign in URL in session storage to redirect to after sign in
    navigate(`/signIn`);
  };

  async function logOut() {
    await signOut(auth);
    navigate(`/`);
  }

  function handleUserMenuToggle() {
    setIsUserMenuOpen((prev) => !prev);
  }

  useEffect(() => {
    function isProfileComplete(authUser: AuthUser) {
      const hasName = !!(authUser.displayName)
      const hasPhone = !!(authUser.phoneNumber)
      const hasEmail = !!(authUser.email)
      return hasName && hasPhone && hasEmail
    }
  
    if (user == null) {
      console.log(`user not signed in`);
    } else if (!isProfileComplete(user)) {
      console.log(`user signed in but profile not complete`);
      navigate(`/signIn?redirectUrl=${window.location.pathname}`)
    } else {
      console.log(`user signed in`)
    }
  })

  return (
    <nav className="bg-white border-gray-200 text-gray-700">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a
          href={`${window.location.origin}`}
          className="flex items-center space-x-3 rtl:space-x-reverse"
        >
          <span className="self-center text-2xl font-semibold whitespace-nowrap">
            InCahoots
          </span>
        </a>

        {user ? (
          <div className="md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
            <button
              ref={refs.setReference}
              type="button"
              className="flex text-sm bg-gray-800 rounded-full md:me-0 focus:ring-2"
              aria-expanded={isUserMenuOpen}
              onClick={handleUserMenuToggle}
            >
              <span className="sr-only">Open user menu</span>
              {user.photoURL ? (
                <img
                  className="w-8 h-8 rounded-full"
                  src={user.photoURL}
                  alt="user photo"
                />
              ) : ( // todo: default when no photoURL is set yet
                <img
                  className="w-8 h-8 rounded-full"
                  alt="user photo"
                />
              )}
            </button>
            {isUserMenuOpen && (
              <div
                ref={refs.setFloating}
                className="my-4 text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow"
                style={floatingStyles}
              >
                <div className="px-4 py-3">
                  <span className="block text-sm text-gray-900">
                    {user.displayName}
                  </span>
                  {user.email ||
                    (user.phoneNumber && (
                      <span className="block text-sm  text-gray-500 truncate ">
                        {user.email || user.phoneNumber}
                      </span>
                    ))}
                </div>
                <ul className="py-2" aria-labelledby="user-menu-button">
                  <li>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 "
                    >
                      Dashboard
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 "
                    >
                      Settings
                    </a>
                  </li>
                  <li>
                    <button
                      onClick={logOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 "
                    >
                      Log out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <button onClick={routeToSignIn} className="text-sm  hover:underline">
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
