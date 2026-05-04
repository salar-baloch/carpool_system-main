import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import signinImage from "../assets/signin.jpeg"
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { isEmail, validateRequired, passwordIssues } from "../utils/validation";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [breachStatus, setBreachStatus] = useState("idle");

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        setErrors((prev) => ({ ...prev, email: value && !isEmail(value) ? "Enter a valid email" : "" }));
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        setErrors((prev) => ({ ...prev, password: value && !validateRequired(value) ? "Password is required" : "" }));
    };

    useEffect(() => {
        if (!password || passwordIssues(password).length > 0) {
            setBreachStatus("idle");
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            setBreachStatus("checking");
            try {
                const response = await fetch(`${API_BASE}/auth/password-breach-check`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password }),
                    signal: controller.signal,
                });
                const data = await response.json();
                if (response.ok && data.breached !== null) {
                    setBreachStatus(data.breached ? "breached" : "safe");
                } else {
                    setBreachStatus("error");
                }
            } catch (error) {
                if (error.name !== "AbortError") {
                    setBreachStatus("error");
                }
            }
        }, 700);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [password]);

    const validateForm = () => {
        const nextErrors = {};
        if (!validateRequired(email)) {
            nextErrors.email = "Email is required";
        } else if (!isEmail(email)) {
            nextErrors.email = "Enter a valid email";
        }
        if (!validateRequired(password)) {
            nextErrors.password = "Password is required";
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            toast.error("Please fix the highlighted fields.");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
    
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                toast.success("Login successful!");
                window.location.href = "/share"; // Redirect to the share page
            } else {
                toast.error(data.message || "Login failed!");
            }
        } catch (error) {
            console.error("Login failed:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };    

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
            <div className="max-w-5xl w-full grid md:grid-cols-2 bg-white shadow-2xl rounded-3xl overflow-hidden">
                <div
                    className="hidden md:block bg-cover bg-center"
                    style={{ backgroundImage: `url(${signinImage})` }}
                />

                <div className="p-10 md:p-12">
                    <ToastContainer />
                    <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
                    <p className="text-slate-500 mt-2">Sign in to continue your journey.</p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
                                Email
                            </label>
                            <Input
                                type="email"
                                id="email"
                                name="email"
                                value={email}
                                onChange={handleEmailChange}
                                className={`mt-2 ${errors.email ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                placeholder="you@example.com"
                                required
                            />
                            {errors.email && (
                                <p className="mt-2 text-sm text-rose-600">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
                                Password
                            </label>
                            <Input
                                type="password"
                                id="password"
                                name="password"
                                value={password}
                                onChange={handlePasswordChange}
                                className={`mt-2 ${errors.password ? "border-rose-300 focus:ring-rose-500" : ""}`}
                                placeholder="••••••••"
                                required
                            />
                            {errors.password && (
                                <p className="mt-2 text-sm text-rose-600">{errors.password}</p>
                            )}
                            {breachStatus === "checking" && (
                                <p className="mt-2 text-sm text-slate-500">Checking breach status...</p>
                            )}
                            {breachStatus === "breached" && (
                                <p className="mt-2 text-sm text-rose-600">This password appears in known breaches.</p>
                            )}
                            {breachStatus === "safe" && (
                                <p className="mt-2 text-sm text-emerald-600">Password not found in breaches.</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;