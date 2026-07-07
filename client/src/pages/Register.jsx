import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet,
  User,
  Mail,
  Phone,
  Lock,
  UserPlus,
  ArrowRight,
} from "lucide-react";

import { api, setSession } from "../api/client";
import { useToast } from "../components/Toast";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const strength = useMemo(() => {
    let score = 0;

    if (form.password.length >= 8) score += 1;
    if (/[A-Z]/.test(form.password)) score += 1;
    if (/\d/.test(form.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(form.password)) score += 1;

    return score;
  }, [form.password]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", form);

      setSession(data.data.token, data.data.user);

      toast.show("Account created");

      navigate("/family");
    } catch (err) {
      toast.show(
        err.response?.data?.message || "Registration failed",
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
            Create Account
          </h1>

          <p className="mt-2 text-center text-sm text-slate-500">
            Join WealthNest and start managing your family's investments.
          </p>

        </div>

        {/* Form */}

        <div className="space-y-5 p-8">
          {/* Full Name */}

<div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Full Name
  </label>

  <div className="relative">
    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
      type="text"
      placeholder="Enter your full name"
      value={form.name}
      onChange={(e) =>
        setForm({
          ...form,
          name: e.target.value,
        })
      }
      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
    />
  </div>
</div>

{/* Email */}

<div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Email Address
  </label>

  <div className="relative">
    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
      type="email"
      placeholder="Enter your email"
      value={form.email}
      onChange={(e) =>
        setForm({
          ...form,
          email: e.target.value,
        })
      }
      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
    />
  </div>
</div>

{/* Mobile */}

<div>
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Mobile Number
  </label>

  <div className="relative">
    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

    <input
      type="tel"
      placeholder="Enter your mobile number"
      value={form.mobile}
      onChange={(e) =>
        setForm({
          ...form,
          mobile: e.target.value,
        })
      }
      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
      placeholder="Create a strong password"
      value={form.password}
      onChange={(e) =>
        setForm({
          ...form,
          password: e.target.value,
        })
      }
      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
    />
  </div>

  {/* Password Strength */}

  <div className="mt-4">

    <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
      <span>Password Strength</span>

      <span>
        {["Very Weak", "Weak", "Medium", "Strong", "Excellent"][strength]}
      </span>
    </div>

    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          strength <= 1
            ? "bg-red-500"
            : strength === 2
            ? "bg-amber-500"
            : strength === 3
            ? "bg-blue-500"
            : "bg-emerald-500"
        }`}
        style={{ width: `${strength * 25}%` }}
      />
    </div>

  </div>
</div>

{/* Create Account Button */}

<button
  type="submit"
  disabled={loading}
  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
>
  <UserPlus className="h-4 w-4" />

  {loading ? "Creating Account..." : "Create Account"}
</button>

{/* Login Link */}

<p className="pt-2 text-center text-sm text-slate-500">
  Already have an account?

  <Link
    to="/login"
    className="ml-1 inline-flex items-center gap-1 font-semibold text-indigo-600 transition hover:text-indigo-700"
  >
    Sign In

    <ArrowRight className="h-4 w-4" />
  </Link>
</p>
        </div>
      </form>
    </div>
  );
}