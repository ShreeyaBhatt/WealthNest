export default function StatCard({
  label,
  value,
  hint,
  tone = "default",
}) {
  const badgeStyle =
    tone === "good"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "bad"
      ? "bg-rose-100 text-rose-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h2>
        </div>

        {hint && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}