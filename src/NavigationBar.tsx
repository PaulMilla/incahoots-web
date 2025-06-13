import { useEffect } from "react";
import { LoginState, useAuth } from "./auth/FirebaseAuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "./lib/firebaseApp";
import { signOut } from "firebase/auth";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "./components/ui/navigation-menu";
import { Button, buttonVariants } from "./components/ui/button";
import { VariantProps } from "class-variance-authority";

type NavButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
type NavLinkProps = { href: string } & NavButtonProps

/** Recommended way to use client-side navigation in Radix UI NavigationMenu:
 * https://www.radix-ui.com/primitives/docs/components/navigate = useNavigate();
 */
function NavLink({ href, variant="ghost", ...props } : NavLinkProps) {
  const navigate = useNavigate();
	const pathname = useLocation().pathname;
	const isActive = href === pathname;

	return (
		<NavigationMenuLink asChild active={isActive}>
			<Button onClick={() => navigate(href)} variant={variant} className="NavigationMenuLink" {...props} />
		</NavigationMenuLink>
	);
};

function NavButton({ ...props }: NavButtonProps) {
  return (
    <NavigationMenuLink asChild>
      <Button className="NavigationMenuLink" {...props} />
    </NavigationMenuLink>
  )
}

export default function NavigationBar() {
  const navigate = useNavigate();
  const { user, loginState } = useAuth();

  useEffect(() => {
    switch (loginState) {
      case LoginState.uninitialized:
        return;
      case LoginState.loggedOut:
        console.log(`User logged out`);
        return;
      case LoginState.authenticatedWithIncompleteProfile:
        console.log(`User profile not complete. Redirecting..`);
        navigate(`/signIn?redirectUrl=${window.location.pathname}`)
        return;
      case LoginState.signedIn:
        console.log(`User successfully signedIn`)
        return;
    }
  })

  const logOut = async () => {
    await signOut(auth);
    navigate(`/`);
  }

  return (
    <NavigationMenu delayDuration={600} viewport={false} className="max-w-(--breakpoint-xl) flex flex-wrap items-center justify-between mx-auto p-4">
      {/* Left side of nav bar */}
      <NavigationMenuList className="flex items-center justify-between w-full md:w-auto space-x-3 rtl:space-x-reverse">
        <NavigationMenuItem className="flex items-center space-x-3 rtl:space-x-reverse">
          <NavLink href="/" className="flex items-center">
            <span className="self-center text-2xl font-semibold whitespace-nowrap">
              InCahoots
            </span>
          </NavLink>
        </NavigationMenuItem>
      </NavigationMenuList>

      {/* Right side of nav bar */}
      <NavigationMenuList className="flex items-center justify-between w-full md:w-auto space-x-3 rtl:space-x-reverse">
        <NavigationMenuItem className="md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          {user ? (
            <>
              <NavigationMenuTrigger>
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
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div id="profileHeader" className="px-4 py-3">
                  <span className="block text-sm text-gray-900">
                    {user.displayName}
                  </span>
                  {(user.email || user.phoneNumber) && (
                    <span className="block text-sm  text-gray-500 truncate ">
                      {user.email || user.phoneNumber}
                    </span>
                  )}
                </div>
                {/* TODO: WHY CAN'T THESE BE LEFT-ALIGNED?? */}
                <ul className="py-2" aria-labelledby="user-menu-button">
                  <li>
                    <NavLink
                      href="/events"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 "
                    >
                      Events
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      href="#"
                      onClick={() => alert("TODO: Settings")}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 "
                    >
                      Settings
                    </NavLink>
                  </li>
                  <li>
                    <NavButton
                      onClick={logOut}
                      variant="link"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 "
                    >
                      Log out
                    </NavButton>
                  </li>
                </ul>
              </NavigationMenuContent>
            </>
          ) : (
            <NavLink href="/signIn" variant="link" className="text-sm hover:underline">
              Login
            </NavLink>
          )}
        </NavigationMenuItem>

      </NavigationMenuList>
    </NavigationMenu>
  )
}