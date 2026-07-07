import { useEffect, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, BarChart3, PieChart as PieIcon, Receipt, TrendingUp, Users } from "lucide-react";
import { api, pct, rupee } from "../api/client";
import StatCard from "../components/StatCard";
import { useToast } from "../components/Toast";

const colors = ["#0d9488", "#2563eb", "#f59e0b", "#64748b", "#dc2626"];

async function ensureFamily() {
  let familyId = localStorage.getItem("wealthnest_family");
  if (familyId) return familyId;
  const { data } = await api.get("/family");
  if (data.data?.[0]) {
    familyId = data.data[0]._id;
    localStorage.setItem("wealthnest_family", familyId);
  }
  return familyId;
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [trends, setTrends] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const toast = useToast();

  async function load() {
    const familyId = await ensureFamily();
    if (!familyId) return;
    const [dash, trend, tx] = await Promise.all([
      api.get(`/analytics/dashboard?familyId=${familyId}`),
      api.get(`/analytics/trends?familyId=${familyId}`),
      api.get("/transactions")
    ]);
    setDashboard(dash.data.data);
    setTrends(trend.data.data);
    setTransactions(tx.data.data.slice(0, 8));
  }

  useEffect(() => { load().catch(() => toast.show("Could not load dashboard", "error")); }, []);

  if (!dashboard) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600" />
        Loading portfolio...
      </div>
    );
  }

  const txIcon = (type) => {
    if (type === "BUY") return <ArrowUpRight size={14} />;
    if (type === "SELL") return <ArrowDownRight size={14} />;
    return <Receipt size={14} />;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">Patel Family demo</div>
            <h1 className="page-title mt-2">Portfolio Dashboard</h1>
            <p className="page-subtitle">Stage 1 overview with allocation, performance and member ownership.</p>
          </div>
          <div className="rounded-lg bg-slate-950 px-5 py-4 text-right text-white shadow-lg shadow-slate-900/20">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current portfolio</div>
            <div className="mt-1 text-2xl font-bold">{rupee(dashboard.totalValue)}</div>
            <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${dashboard.gainLoss >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
              {dashboard.gainLoss >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {pct(dashboard.gainLossPercent)}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Value" value={rupee(dashboard.totalValue)} />
        <StatCard label="Total Invested" value={rupee(dashboard.totalInvested)} />
        <StatCard label="Gain/Loss" value={rupee(dashboard.gainLoss)} hint={pct(dashboard.gainLossPercent)} tone={dashboard.gainLoss >= 0 ? "good" : "bad"} />
        <StatCard label="Active Investments" value={dashboard.activeInvestments} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2"><PieIcon size={16} className="text-brand-600" />Asset allocation</h2>
            <span className="status-pill bg-brand-50 text-brand-700">{dashboard.allocation.length} classes</span>
          </div>
          <div className="relative mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dashboard.allocation} dataKey="percentage" nameKey="type" innerRadius={70} outerRadius={105} paddingAngle={3}>
                  {dashboard.allocation.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [pct(v), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</span>
              <span className="text-lg font-bold text-slate-900">{rupee(dashboard.totalValue)}</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {dashboard.allocation.map((a, i) => (
              <div key={a.type} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm transition-colors hover:bg-slate-100">
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: colors[i % colors.length] }} />{a.type}</span>
                <span className="font-semibold">{pct(a.percentage)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2"><BarChart3 size={16} className="text-brand-600" />Per-investment gain/loss</h2>
            <span className="status-pill bg-slate-100 text-slate-600">Return %</span>
          </div>
          <div className="mt-4 h-80">
            <ResponsiveContainer>
              <BarChart data={dashboard.investmentReturns} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => pct(v)} />
                <Bar dataKey="gainLossPercent" radius={[0, 6, 6, 0]}>
                  {dashboard.investmentReturns.map((row, i) => <Cell key={row.id} fill={row.gainLossPercent >= 0 ? "#0d9488" : "#dc2626"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2"><TrendingUp size={16} className="text-brand-600" />Portfolio trend</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <LineChart data={trends}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => rupee(v)} />
                <Area type="monotone" dataKey="totalValue" stroke="none" fill="url(#trendFill)" />
                <Line type="monotone" dataKey="totalValue" stroke="#0d9488" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="section-title flex items-center gap-2"><Receipt size={16} className="text-brand-600" />Recent transactions</h2>
          <div className="mt-4 space-y-3">
            {transactions.map((t) => (
              <div key={t._id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${t.type === "BUY" ? "bg-emerald-50 text-emerald-600" : t.type === "SELL" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                    {txIcon(t.type)}
                  </div>
                  <div>
                    <span className={`status-pill ${t.type === "BUY" ? "bg-emerald-50 text-emerald-700" : t.type === "SELL" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{t.type}</span>
                    <div className="mt-1 text-sm font-semibold">{t.investmentId?.name}</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{rupee(t.amount)}</div>
                  <div className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString("en-IN")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-5 section-title flex items-center gap-2"><Users size={16} className="text-brand-600" />Member breakdown</div>
        <table className="w-full text-sm">
          <thead className="table-head">
            <tr><th className="p-3">Member</th><th className="p-3">Value</th><th className="p-3">Share</th></tr>
          </thead>
          <tbody>
            {dashboard.memberBreakdown.map((m) => (
              <tr key={m.memberId} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                <td className="p-3 font-semibold">{m.name}</td>
                <td className="p-3">{rupee(m.value)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-10 flex-shrink-0 font-medium">{pct(m.percentage)}</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, m.percentage)}%` }} />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}