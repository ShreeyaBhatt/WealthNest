import { useEffect, useState } from "react";
import {
  Wallet,
  Upload,
  CheckCircle2,
  Pencil,
  FileUp,
  Sparkles,
} from "lucide-react";

import { aiApi, api, rupee } from "../api/client";
import { useToast } from "../components/Toast";

async function getFamilyId() {
  let id = localStorage.getItem("wealthnest_family");
  if (id) return id;
  const { data } = await api.get("/family");
  id = data.data?.[0]?._id;
  if (id) localStorage.setItem("wealthnest_family", id);
  return id;
}

function confidenceClass(score) {
  if (score >= 0.9) return "bg-emerald-50 text-emerald-700";
  if (score >= 0.7) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function normaliseDate(date) {
  if (!date) return new Date().toISOString();
  if (date.includes("/")) {
    const [d, m, y] = date.split("/");
    return `${y.length === 2 ? `20${y}` : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (date.includes("-") && date.split("-")[0].length <= 2) {
    const [d, m, y] = date.split("-");
    return `${y.length === 2 ? `20${y}` : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return date;
}

export default function UploadStatement() {
  const [members, setMembers] = useState([]);
  const [memberId, setMemberId] = useState("");
  const [statementType, setStatementType] = useState("CAMS CAS");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [expanded, setExpanded] = useState({});
  const toast = useToast();

  useEffect(() => {
    async function load() {
      const id = await getFamilyId();
      const { data } = await api.get(`/family/${id}/members`);
      setMembers(data.data);
      if (data.data[0]) setMemberId(data.data[0]._id);
    }
    load().catch(() => toast.show("Could not load members", "error"));
  }, []);

  async function parse(e) {
    e.preventDefault();
    if (!file) return toast.show("Choose a PDF first", "error");
    const body = new FormData();
    body.append("file", file);
    setLoading(true);
    try {
      const { data } = await aiApi.post("/parse-statement", body, { headers: { "Content-Type": "multipart/form-data" } });
      setParsed(data);
      toast.show("Statement analysed");
    } catch {
      toast.show("Parser service unavailable", "error");
    } finally {
      setLoading(false);
    }
  }

  function editRow(index, key, value) {
    const rows = [...parsed.transactions];
    rows[index] = {
      ...rows[index],
      [key]: value,
      confidence: { ...rows[index].confidence, [key]: 0.99 },
      flags: rows[index].flags?.filter((f) => f !== key) || []
    };
    setParsed({ ...parsed, transactions: rows });
  }

  async function importAll() {
    const familyId = await getFamilyId();
    const rows = parsed.transactions.map((row) => ({
      ...row,
      date: normaliseDate(row.date),
      amount: Number(row.amount || 0),
      units: Number(row.units || 0),
      nav: Number(row.nav || 0)
    }));
    await api.post("/statements/import", { familyId, memberId, parsedRows: rows, filePath: file?.name });
    toast.show("Statement imported");
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-8 bg-slate-50 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">

  <div>

    <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900">

      <Wallet className="h-8 w-8 text-indigo-600" />

      Upload Statement

    </h1>

    <p className="mt-2 text-sm text-slate-500">
      Upload CAMS or KFintech statements and let AI extract your investment transactions.
    </p>

  </div>

  <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">

    <div className="flex items-center gap-2">

      <Sparkles className="h-5 w-5 text-indigo-600" />

      <span className="text-sm font-semibold text-indigo-700">
        AI Powered Parsing
      </span>

    </div>

  </div>

</div>
<form
  onSubmit={parse}
  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
>

  {/* Card Header */}

  <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">

    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">

      <FileUp className="h-5 w-5 text-indigo-600" />

      Upload Investment Statement

    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Select a family member, choose the statement type, and upload your PDF.
    </p>

  </div>

  {/* Card Body */}

  <div className="p-6">

    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

      {/* Member */}

      <div>

        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Family Member
        </label>

        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          {members.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
            </option>
          ))}
        </select>

      </div>

      {/* Statement Type */}

      <div>

        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Statement Type
        </label>

        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          value={statementType}
          onChange={(e) => setStatementType(e.target.value)}
        >
          <option>CAMS CAS</option>
          <option>KFintech CAS</option>
        </select>

      </div>

      {/* PDF Upload */}

      <div className="lg:col-span-2">

        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Statement PDF
        </label>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-indigo-400 hover:bg-indigo-50">

          <div>

            <div className="font-medium text-slate-700">
              {file ? file.name : "Choose PDF File"}
            </div>

            <div className="text-xs text-slate-500">
              Only PDF statements are supported.
            </div>

          </div>

          <Upload className="h-5 w-5 text-indigo-600" />

          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0])}
          />

        </label>

      </div>

    </div>

    {/* Loading Indicator (keep your existing loading block below this) */}

    {loading && (
      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-indigo-700">
          AI is analyzing your statement...
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-600" />
        </div>
      </div>
    )}

    {/* Upload Button */}

    <div className="mt-8 flex justify-end">

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Upload className="h-4 w-4" />

        {loading ? "Analyzing..." : "Upload & Analyze"}

      </button>

    </div>

  </div>

</form>
{parsed && (
  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

    {/* Card Header */}

    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5">

      <div>

        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">

          <CheckCircle2 className="h-5 w-5 text-emerald-600" />

          Statement Parsed Successfully

        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review the extracted transactions before importing them.
        </p>

      </div>

      <button
        onClick={importAll}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700"
      >
        <CheckCircle2 className="h-4 w-4" />

        Import All ({parsed.transactions.length})

      </button>

    </div>

    {/* Summary */}

    <div className="grid gap-4 border-b border-slate-100 bg-white p-6 md:grid-cols-3">

      {/* Fund */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Fund Name
        </div>

        <div className="mt-2 font-semibold text-slate-800">
          {parsed.fundName}
        </div>

      </div>

      {/* Folio */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Folio Number
        </div>

        <div className="mt-2 font-semibold text-slate-800">
          {parsed.folio}
        </div>

      </div>

      {/* Transactions */}

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">

        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Transactions Found
        </div>

        <div className="mt-2 text-2xl font-bold text-indigo-700">
          {parsed.transactions.length}
        </div>

      </div>

    </div>

    {/* Table */}

    <div className="overflow-x-auto">

      <table className="min-w-[980px] w-full text-sm">

        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

          <tr>

            <th className="px-4 py-4"></th>

            <th className="px-4 py-4">Fund</th>

            <th className="px-4 py-4">Date</th>

            <th className="px-4 py-4">Type</th>

            <th className="px-4 py-4">Amount</th>

            <th className="px-4 py-4">Units</th>

            <th className="px-4 py-4">NAV</th>

          </tr>

        </thead>

        <tbody>

          {parsed.transactions.map((row, i) => (
            <>
              <tr
                key={i}
                className="border-t border-slate-100 transition hover:bg-slate-50"
              >

                <td className="px-4 py-3">

                  <button
                    className="rounded-lg p-2 transition hover:bg-indigo-100"
                    onClick={() =>
                      setExpanded({
                        ...expanded,
                        [i]: !expanded[i],
                      })
                    }
                    title="Show confidence"
                  >
                    <Pencil className="h-4 w-4 text-indigo-600" />
                  </button>

                </td>

                <CellEdit
                  value={row.fundName}
                  onChange={(v) => editRow(i, "fundName", v)}
                />

                <CellEdit
                  value={row.date}
                  onChange={(v) => editRow(i, "date", v)}
                />

                <CellEdit
                  value={row.transactionType}
                  onChange={(v) => editRow(i, "transactionType", v)}
                />

                <CellEdit
                  value={row.amount}
                  onChange={(v) => editRow(i, "amount", v)}
                  prefix="₹"
                />

                <CellEdit
                  value={row.units}
                  onChange={(v) => editRow(i, "units", v)}
                />

                <CellEdit
                  value={row.nav}
                  onChange={(v) => editRow(i, "nav", v)}
                  prefix="₹"
                />

              </tr>

              {expanded[i] && (
                <tr className="bg-slate-50">

                  <td />

                  <td colSpan="6" className="px-4 py-4">

                    <div className="flex flex-wrap gap-2">

                      {Object.entries(row.confidence || {}).map(
                        ([field, score]) => (
                          <span
                            key={field}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${confidenceClass(score)}`}
                          >
                            {field}: {Math.round(score * 100)}%
                          </span>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
    </div>
  );
}

function CellEdit({ value, onChange, prefix = "" }) {
  return (
    <td className="px-4 py-3">

      <div className="flex items-center rounded-lg border border-transparent bg-transparent px-2 py-1 transition hover:border-slate-200 hover:bg-slate-50 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">

        {prefix && (
          <span className="mr-2 text-sm font-medium text-slate-400">
            {prefix}
          </span>
        )}

        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />

      </div>

    </td>
  );
}
