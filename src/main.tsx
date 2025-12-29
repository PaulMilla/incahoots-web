import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import 'react-toastify/dist/ReactToastify.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import LandingPage from "./LandingPage";
import EventPage from "./Events/EventPage";
import SignInPage from "./SignIn/SignInPage";
import EventsPage from "./Events/EventsPage";
import NewEventPage from "./Events/NewEventPage";
import { ToastContainer, toast } from "react-toastify";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Intercept console.error in development to show toast notifications
if (import.meta.env.DEV) {
  const originalError = console.error;
  let lastErrorMessage = '';
  let lastErrorTime = 0;

  const formatErrorMessage = (args: any[]): string => {
    // Convert all arguments to strings and join with spaces
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    // Truncate if longer than 150 characters
    return message.length > 150
      ? message.substring(0, 150) + '...'
      : message;
  };

  console.error = (...args: any[]) => {
    // Always call original console.error first
    originalError(...args);

    // Format message
    const message = formatErrorMessage(args);
    const now = Date.now();

    // Only show toast if different message or >1 second since last
    if (message !== lastErrorMessage || now - lastErrorTime > 1000) {
      toast.error(message, {
        autoClose: 5000, // 5 seconds
        position: 'bottom-right'
      });
      lastErrorMessage = message;
      lastErrorTime = now;
    }
  };
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/signIn",
    element: <SignInPage />,
  },
  {
    path: "/events",
    element: <EventsPage />,
  },
  {
    path: "/events/:eventId",
    element: <EventPage />,
  },
  {
    path: "/newEvent",
    element: <NewEventPage />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastContainer />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
