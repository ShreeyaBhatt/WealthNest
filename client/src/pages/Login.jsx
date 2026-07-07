import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  Mail,
  Lock,
  LogIn,
  ArrowRight,
} from "lucide-react";

import { api, setSession } from "../api/client";
import { useToast } from "../components/Toast";

export default function Login() {
  const [form, setForm] = useState({
    email: "amit.patel@wealthnest.demo",
    password: "PatelDemo@123",
  });

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);

      setSession(data.data.token, data.data.user);

      toast.show("Welcome back");

      navigate("/");
    } catch (err) {
      toast.show(
        err.response?.data?.message || "Login failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 p-6">

      <form
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50"
      >

        {/* Header */}

        <div className="border-b border-slate-100 bg-slate-50/70 px-8 py-7">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100">

            <Wallet className="h-8 w-8 text-indigo-600" />

          </div>

          <h1 className="mt-5 text-center text-3xl font-extrabold text-slate-900">
            Welcome Back
          </h1>

          <p className="mt-2 text-center text-sm text-slate-500">
            Sign in to continue managing your family's investment portfolio.
          </p>

        </div>

        {/* Form */}

        <div className="space-y-5 p-8">
          {/* Email */}

<div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Email Address
  </label>

  <div className="relative">
    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
      type="email"
      value={form.email}
      onChange={(e) =>
        setForm({
          ...form,
          email: e.target.value,
        })
      }
      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      placeholder="Enter your email"
    />
  </div>
</div>

{/* Password */}

<div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Password
  </label>

  <div className="relative">
    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
      type="password"
      value={form.password}
      onChange={(e) =>
        setForm({
          ...form,
          password: e.target.value,
        })
      }
      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      placeholder="Enter your password"
    />
  </div>
</div>

{/* Sign In Button */}

<button
  type="submit"
  disabled={loading}
  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
>
  <LogIn className="h-4 w-4" />

  {loading ? "Signing in..." : "Sign In"}
</button>

{/* Register */}

<p className="pt-2 text-center text-sm text-slate-500">
  New to WealthNest?

  <Link
    to="/register"
    className="ml-1 inline-flex items-center gap-1 font-semibold text-indigo-600 transition hover:text-indigo-700"
  >
    Create Account

    <ArrowRight className="h-4 w-4" />
  </Link>
</p>
        </div>
      </form>
    </div>
  );
}