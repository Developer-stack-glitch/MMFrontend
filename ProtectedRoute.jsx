import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem("AccessToken");
    const user = JSON.parse(localStorage.getItem("loginDetails") || "{}");
    const location = useLocation();
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    if (user?.role === "user") {
        const blockedRoutes = ["/approvals", "/wallet"];

        if (blockedRoutes.includes(location.pathname)) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
}
