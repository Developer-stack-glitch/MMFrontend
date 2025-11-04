import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login/Login.jsx";
import SideBarLayout from "./SideBar/Sidebar.jsx";

import "./index.css";
import { ToastContainer } from "react-toastify";
import ProtectedRoute from "../ProtectedRoute.jsx";

createRoot(document.getElementById("root")).render(
  <>
    <ToastContainer autoClose={1500} theme="colored" />

    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={

            <Login />

          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SideBarLayout />
            </ProtectedRoute>
          }
        />
        {/* ✅ Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />

      </Routes>
    </BrowserRouter>
  </>

);
