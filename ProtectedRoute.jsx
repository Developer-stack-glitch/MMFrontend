import { Navigate, useLocation } from "react-router-dom";
import { safeGetLocalStorage } from "./Api/action";

export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem("AccessToken");
    const user = safeGetLocalStorage("loginDetails", {});
    const location = useLocation();

    if (!token || !user || !user.id) {
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
