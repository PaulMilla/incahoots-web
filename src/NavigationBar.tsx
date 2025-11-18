import { useEffect } from "react";
import { LoginState, useAuth } from "./auth/FirebaseAuthContext";
import { Link, LinkProps, useLocation, useNavigate } from "react-router-dom";
import { auth } from "./lib/firebaseApp";
import { signOut } from "firebase/auth";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "./components/ui/navigation-menu";
import { Button, buttonVariants } from "./components/ui/button";
import { VariantProps } from "class-variance-authority";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";

type NavButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;
type NavLinkProps = React.PropsWithChildren<LinkProps> & React.RefAttributes<HTMLAnchorElement>;

/** Recommended way to use client-side navigation in Radix UI NavigationMenu:
 * https://www.radix-ui.com/primitives/docs/components/navigate
 */
function NavLink({ to, children, ...props }: NavLinkProps) {
  const isActive = (to === useLocation().pathname);

  return (
    <NavigationMenuLink asChild active={isActive}>
      <Link to={to} {...props}>
        {children}
      </Link>
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
    if (loginState === LoginState.authenticatedWithIncompleteProfile) {
      console.debug('Redirecting to complete profile');
      navigate(`/signIn?redirectUrl=${window.location.pathname}`)
    }
  }, [loginState, navigate]);

  const logOut = async () => {
    await signOut(auth);
    navigate(`/`);
  };

  return (
    <NavigationMenu delayDuration={600} viewport={false} className="max-w-(--breakpoint-xl) flex flex-wrap items-center justify-between mx-auto p-4">
      {/* Left side of nav bar */}
      <NavigationMenuList className="flex items-center justify-between w-full md:w-auto space-x-3 rtl:space-x-reverse">
        <NavigationMenuItem className="flex items-center space-x-3 rtl:space-x-reverse">
          <NavLink to="/" className="flex items-center">
            <span className="self-center text-2xl font-semibold whitespace-nowrap">
              InCahoots
            </span>
          </NavLink>
        </NavigationMenuItem>
      </NavigationMenuList>

      {/* Right side of nav bar */}
      <NavigationMenuList className="flex items-center justify-between w-full md:w-auto space-x-3 rtl:space-x-reverse">
        <NavigationMenuItem className="md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          {user && (
            <NavLink to="/newEvent">
              + New Event
            </NavLink>
          )}
        </NavigationMenuItem>
        <NavigationMenuItem className="md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
          {user ? (
            <>
              <NavigationMenuTrigger>
                <Avatar>
                  <AvatarImage src={user.photoURL ?? undefined} />
                  <AvatarFallback>{user.displayName?.split(' ').slice(0, 2).map(x => x[0]) ?? "??"}</AvatarFallback>
                </Avatar>
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
                      to="/events"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 "
                    >
                      Events
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="#"
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
            <NavLink to="/signIn" className="text-sm hover:underline">
              Login
            </NavLink>
          )}
        </NavigationMenuItem>

      </NavigationMenuList>
    </NavigationMenu>
  )
}