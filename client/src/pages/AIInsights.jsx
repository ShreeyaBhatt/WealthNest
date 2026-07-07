import { Bot, Send, Sparkles, TrendingUp, PieChart, Layers, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { aiApi, api, pct, rupee } from "../api/client";
import { useToast } from "../components/Toast";

async function familyId() {
  let id = localStorage.getItem("wealthnest_family");
  if (id) return id;
  const { data } = await api.get("/family");
  id = data.data?.[0]?._id;
  if (id) localStorage.setItem("wealthnest_family", id);
  return id;
}

function renderLite(text) {
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {line.split(/(\*\*.*?\*\*)/g).map((part, j) => part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part)}
      <br />
    </span>
  ));
}

// --- presentational helpers (no business logic) ---------------------------

function scoreColor(score) {
  if (score >= 8) return "#059669"; // emerald-600
  if (score >= 6) return "#d97706"; // amber-600
  return "#e11d48"; // rose-600
}

function ScoreRing({ score, color }) {
  const clamped = Math.max(0, Math.min(10, score || 0));
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 10);
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" className="text-slate-100" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 700ms ease" }}
      />
    </svg>
  );
}

export default function AIInsights() {
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [insight, setInsight] = useState(null);
  const [sips, setSips] = useState([]);
  const [waiting, setWaiting] = useState({});
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState([{ role: "assistant", content: "Ask me about allocation, SIP goal gaps, or the Patel Family demo flow." }]);
  const [message, setMessage] = useState("");
  const toast = useToast();

  async function load() {
    const id = await familyId();
    if (!id) return;
    const [dash, inv, memberRes, saved, sipRes] = await Promise.all([
      api.get(`/analytics/dashboard?familyId=${id}`),
      api.get(`/investments?familyId=${id}`),
      api.get(`/family/${id}/members`),
      api.get(`/insights/saved?familyId=${id}`),
      api.get(`/insights/sip-forecasts?familyId=${id}`)
    ]);
    const dashData = dash.data.data;
    const summaryData = {
      totalValue: dashData.totalValue,
      allocationPercentages: dashData.allocation,
      topHoldings: inv.data.data.slice().sort((a, b) => b.currentValue - a.currentValue).slice(0, 5).map((i) => ({ name: i.name, type: i.type, currentValue: i.currentValue })),
      members: memberRes.data.data.map((m) => ({ name: m.name, age: Math.max(0, new Date().getFullYear() - new Date(m.dob).getFullYear()) }))
    };
    setSummary(summaryData);
    setMembers(memberRes.data.data);
    setInsight(saved.data.data?.insight || null);
    setSips(sipRes.data.data || []);
  }

  useEffect(() => { load().catch(() => toast.show("Could not load insights", "error")); }, []);

  useEffect(() => {
    async function loadWaiting() {
      const next = {};
      for (const sip of sips) {
        if (!sip.forecast) continue;
        try {
          const { data } = await aiApi.post("/ml/sip-forecast", {
            category: sip.category,
            monthly_sip: sip.monthlySip,
            duration_months: 96,
            goal_amount: sip.goalAmount || 0
          });
          next[sip.investmentId] = data;
        } catch {
          next[sip.investmentId] = null;
        }
      }
      setWaiting(next);
    }
    if (sips.length) loadWaiting();
  }, [sips]);

  async function generate() {
    if (!summary) return;
    setLoading(true);
    try {
      const { data } = await aiApi.post("/generate-insights", summary);
      setInsight(data);
      await api.post("/insights/save", { familyId: await familyId(), insight: data });
      toast.show("Insights generated");
    } catch {
      toast.show("AI service unavailable", "error");
    } finally {
      setLoading(false);
    }
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!message.trim()) return;
    const nextHistory = [...chat, { role: "user", content: message }];
    setChat(nextHistory);
    setMessage("");
    try {
      const { data } = await aiApi.post("/chat", {
        familyId: await familyId(),
        message,
        history: nextHistory,
        portfolioSummary: summary,
        latestInsights: insight,
        sipForecasts: sips
      });
      setChat([...nextHistory, { role: "assistant", content: data.reply }]);
    } catch {
      setChat([...nextHistory, { role: "assistant", content: "I could not reach the AI service right now." }]);
    }
  }

  const healthTone = insight?.healthScore >= 8 ? "bg-emerald-50 text-emerald-700" : insight?.healthScore >= 6 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-sm shadow-brand-600/30">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Insights</h1>
            <p className="text-sm text-slate-500">Gemini portfolio health plus ML SIP goal forecasts.</p>
          </div>
        </div>
        <button className="btn-primary group" onClick={generate} disabled={loading}>
          <Sparkles size={16} className={loading ? "animate-spin" : "transition-transform duration-300 group-hover:rotate-12"} />
          {loading ? "Generating..." : "Generate AI Insights"}
        </button>
      </div>

      {insight && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="card flex flex-col items-center p-6 text-center">
            <div className="relative flex h-[120px] w-[120px] items-center justify-center">
              <ScoreRing score={insight.healthScore} color={scoreColor(insight.healthScore)} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{insight.healthScore}</span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">out of 10</span>
              </div>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">{insight.healthLabel}</h2>
            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${healthTone}`}>
              <ShieldAlert size={14} />
              {insight.riskLevel}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{insight.riskExplanation}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <InsightList title="Allocation feedback" items={insight.allocationFeedback} icon={PieChart} />
            <InsightList title="Diversification suggestions" items={insight.diversificationSuggestions} icon={Layers} />
          </div>
          <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
            {insight.memberRecommendations?.map((m) => (
              <div key={m.name} className="card p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="font-bold text-slate-900">{m.name}</div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{m.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">ML SIP Goal Planner</h2>
        </div>
        {sips.map((sip) => <SipCard key={sip.investmentId} sip={sip} wait={waiting[sip.investmentId]} />)}
        {!sips.length && (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-slate-500">
            <TrendingUp size={22} className="text-slate-300" />
            <span>No active SIP investments detected yet.</span>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 p-5">
          <Bot size={18} className="text-brand-600" />
          <span className="font-bold text-slate-900">Chat Assistant</span>
        </div>
        <div className="flex max-h-96 flex-col gap-4 overflow-y-auto p-5">
          {chat.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                {m.role === "user" ? <span className="text-[11px] font-bold">You</span> : <Bot size={14} />}
              </div>
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-700"}`}>
                {renderLite(m.content)}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={sendChat} className="flex gap-3 border-t border-slate-200 p-4">
          <input className="input flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask about the Patel Family portfolio..." />
          <button className="btn-primary" disabled={!message.trim()} aria-label="Send message">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function InsightList({ title, items = [], icon: Icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-brand-600" />}
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SipCard({ sip, wait }) {
  if (!sip.forecast) {
    return (
      <div className="card flex items-start gap-3 p-5">
        <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-rose-500" />
        <div>
          <div className="font-bold text-slate-900">{sip.investmentName}</div>
          <p className="text-sm text-rose-600">{sip.error}</p>
        </div>
      </div>
    );
  }
  const rows = [
    ["Conservative (25th %ile)", sip.forecast.conservative],
    ["Expected (median)", sip.forecast.expected],
    ["Optimistic (75th %ile)", sip.forecast.optimistic]
  ];
  const goalRows = rows.map(([label, projection]) => {
    const required = sip.goalAmount ? (sip.goalAmount / projection) * sip.monthlySip : 0;
    return { label, required, shortfall: Math.max(0, required - sip.monthlySip) };
  });
  const waitDiff = wait ? sip.forecast.expected - wait.expected : 0;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">{sip.investmentName}</h3>
          <p className="text-sm text-slate-500">{sip.memberName} · {sip.category} · Current SIP {rupee(sip.monthlySip)}</p>
        </div>
        {sip.goalAmount > 0 && (
          <div className="rounded-md bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">Goal {rupee(sip.goalAmount)}</div>
        )}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-sm lg:col-span-1">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <th className="p-3 text-left font-semibold">Scenario</th>
              <th className="p-3 text-right font-semibold">Projected value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-slate-100">
                <td className="p-3 text-slate-500">{label}</td>
                <td className="p-3 text-right font-bold text-slate-900">{rupee(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sip.goalAmount > 0 && (
          <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-sm lg:col-span-1">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <th className="p-3 text-left font-semibold">Scenario</th>
                <th className="p-3 text-right font-semibold">SIP required</th>
              </tr>
            </thead>
            <tbody>
              {goalRows.map((r) => (
                <tr key={r.label} className="border-t border-slate-100">
                  <td className="p-3 text-slate-500">{r.label}</td>
                  <td className={`p-3 text-right font-bold ${r.shortfall > 0 && r.label.startsWith("Optimistic") ? "text-rose-600" : "text-slate-900"}`}>{rupee(r.required)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Clock size={14} className="text-slate-400" />
            Cost of waiting 2 years
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-500">Start now</div>
              <div className="font-bold text-slate-900">{rupee(sip.forecast.expected)}</div>
            </div>
            <div>
              <div className="text-slate-500">Start later</div>
              <div className="font-bold text-slate-900">{wait ? rupee(wait.expected) : "..."}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 rounded-md bg-amber-50 p-3 text-sm font-bold text-amber-700">
            <ArrowRight size={14} className="flex-shrink-0" />
            {rupee(waitDiff)} expected value difference
          </div>
        </div>
      </div>
    </div>
  );
}