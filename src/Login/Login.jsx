import React, { useState } from "react";
import "../css/Login.css";
import { apiLogin } from "../../Api/action";
import { CommonToaster } from "../../Common/CommonToaster";
import { useNavigate } from "react-router-dom";
import { EyeClosedIcon, EyeIcon } from "lucide-react";

export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();

        const email = e.target.elements[0].value;
        const password = e.target.elements[1].value;

        try {
            setLoading(true);
            const res = await apiLogin({ email, password });

            // ✅ Correct token key
            localStorage.setItem("AccessToken", res.token);

            setTimeout(() => {
                setLoading(false);
                navigate("/dashboard");
                CommonToaster("Login Successfully!", "success");
            }, 1000);

        } catch (err) {
            setLoading(false);
            CommonToaster("Login failed invalid credentials!", "error");
        }
    }

    return (
        <div className="login-bg">
            <div className="card-welcome">

                <h3 className="welcome-title">Welcome back, Mika</h3>

                <img
                    src="https://i.pravatar.cc/160?img=67"
                    className="welcome-avatar"
                    alt="user"
                />

                <button className="google-btn">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" />
                    Continue with Google
                </button>

                <div className="divider">or</div>

                <form className="login-form"
                    onSubmit={onSubmit}
                >

                    <label>Email</label>
                    <input type="email" placeholder="Enter your email" />

                    <label>Password</label>

                    {/* ✅ PASSWORD WITH SHOW/HIDE */}
                    <div className="password-wrapper">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                        />
                        <span
                            className="eye-icon"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeIcon size={17} /> : <EyeClosedIcon size={18} />}
                        </span>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? <div className="spinner"></div> : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}
