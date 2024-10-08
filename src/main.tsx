import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import 'react-toastify/dist/ReactToastify.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import LandingPage from "./LandingPage";
import EventPage from "./EventPage";
import SignInPage from "./SignIn/SignInPage";
import EventsPage from "./EventsPage";
import NewEventPage from "./NewEventPage";

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
