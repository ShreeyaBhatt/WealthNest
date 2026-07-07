import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  WalletCards,
  FileUp,
  Bot,
  LogOut,
  BarChart3,
  UserCircle,
} from "lucide-react";

import { clearSession, getUser } from "../api/client";

const portfolioNav = [
  {
    to: "/",
    label: "Dashboard",
    icon: Home,
  },
  {
    to: "/family",
    label: "Family",
    icon: Users,
  },
  {
    to: "/investments",
    label: "Investments",
    icon: WalletCards,
  },
];

const toolsNav = [
  {
    to: "/upload",
    label: "Upload Documents",
    icon: FileUp,
  },
  {
    to: "/insights",
    label: "AI Insights",
    icon: Bot,
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();

 const renderNav = (items) =>
  items.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm transition-all ${
          isActive
            ? "border-brand-600 bg-brand-50 font-semibold text-brand-700"
            : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-[260px] border-r bg-white md:flex md:flex-col">

        {/* Logo */}

        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-600 p-3 text-white">
              <BarChart3 size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold">WealthNest</h1>
              <p className="text-xs text-slate-500">
                Smart Family Wealth
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}

        <div className="flex-1 overflow-y-auto px-4 py-6">

          <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Portfolio
          </p>

          <div className="space-y-1">
            {renderNav(portfolioNav)}
          </div>

          <p className="mb-3 mt-8 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tools
          </p>

          <div className="space-y-1">
            {renderNav(toolsNav)}
          </div>
        </div>

        {/* User */}

        <div className="border-t p-5">

          <div className="mb-4 flex items-center gap-3">

            <UserCircle
              size={42}
              className="text-slate-400"
            />

            <div>
              <p className="font-medium">
                {user?.name || "Guest"}
              </p>

              <p className="text-xs text-slate-500">
                Family Portfolio
              </p>
            </div>
          </div>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={() => {
              clearSession();
              navigate("/login");
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="md:ml-[260px]">

        {/* Mobile Header */}

        <header className="sticky top-0 z-20 border-b bg-white px-5 py-4 md:hidden">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-brand-600" />
            <div>
              <h1 className="font-semibold">WealthNest</h1>
              <p className="text-xs text-slate-500">
                Family Wealth Dashboard
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-5 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}