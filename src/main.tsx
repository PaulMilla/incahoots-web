import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./AuthContext.tsx";
import LandingPage from "./LandingPage.tsx";
import EventPage from "./EventPage.tsx";
import SignInPage from "./SignIn/SignInPage.tsx";
import EventsPage from "./EventsPage.tsx";
import NewEventPage from "./NewEventPage.tsx";

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
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
