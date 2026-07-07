import { useEffect, useState } from "react";
import {
  Wallet,
  Plus,
  RefreshCw,
} from "lucide-react";

import { api, rupee } from "../api/client";
import { useToast } from "../components/Toast";

const emptyInvestment = {
  memberId: "",
  name: "",
  type: "MF",
  units: 0,
  avgPrice: 0,
  currentValue: 0,
  monthlySip: 0,
  sipCategory: "nifty50",
  goalAmount: 0,
};

const emptyTx = {
  investmentId: "",
  type: "BUY",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  units: "",
  price: "",
};

async function getFamilyId() {
  let id = localStorage.getItem("wealthnest_family");

  if (id) return id;

  const { data } = await api.get("/family");

  id = data.data?.[0]?._id;

  if (id) {
    localStorage.setItem("wealthnest_family", id);
  }

  return id;
}

export default function Investments() {
  const [members, setMembers] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [form, setForm] = useState(emptyInvestment);
  const [txForm, setTxForm] = useState(emptyTx);

  const toast = useToast();

  async function load() {
    const familyId = await getFamilyId();

    if (!familyId) return;

    const [m, inv, tx] = await Promise.all([
      api.get(`/family/${familyId}/members`),
      api.get(`/investments?familyId=${familyId}`),
      api.get("/transactions"),
    ]);

    setMembers(m.data.data);
    setInvestments(inv.data.data);
    setTransactions(tx.data.data);

    if (!form.memberId && m.data.data[0]) {
      setForm((prev) => ({
        ...prev,
        memberId: m.data.data[0]._id,
      }));
    }

    if (!txForm.investmentId && inv.data.data[0]) {
      setTxForm((prev) => ({
        ...prev,
        investmentId: inv.data.data[0]._id,
      }));
    }
  }

  useEffect(() => {
    load().catch(() =>
      toast.show("Could not load investments", "error")
    );
  }, []);

  async function createInvestment(e) {
    e.preventDefault();

    await api.post("/investments", form);

    setForm({
      ...emptyInvestment,
      memberId: form.memberId,
    });

    toast.show("Investment created");

    await load();
  }

  async function addTransaction(e) {
    e.preventDefault();

    try {
      await api.post("/transactions", {
        ...txForm,
        amount: Number(txForm.amount),
        units: Number(txForm.units || 0),
        price: Number(txForm.price || 0),
      });

      toast.show("Transaction added");

      setTxForm({
        ...emptyTx,
        investmentId: txForm.investmentId,
      });

      await load();
    } catch (err) {
      toast.show(
        err.response?.data?.message ||
          "Could not add transaction",
        "error"
      );
    }
  }

  return (
    <div className="space-y-8">

      {/* Header will go here */}
            {/* ================= HEADER ================= */}

      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

        <div>

          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900">

            <div className="rounded-2xl bg-indigo-100 p-3">

              <Wallet className="h-7 w-7 text-indigo-600" />

            </div>

            Investments

          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your family's investments, SIPs and transaction history.
          </p>

        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>

      </div>

      {/* ================= FORMS ================= */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ================= CREATE INVESTMENT ================= */}

        <form
          onSubmit={createInvestment}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >

          {/* Card Header */}

          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">

            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">

              <Plus className="h-5 w-5 text-indigo-600" />

              Create Investment

            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add a new investment for a family member.
            </p>

          </div>
      {/* Forms Grid will go here */}
          {/* Form Body */}
          <div className="space-y-5 p-6">
                        <div className="grid gap-4 md:grid-cols-2">

              {/* Family Member */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Family Member
                </label>

                <select
                  className="input"
                  value={form.memberId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      memberId: e.target.value,
                    })
                  }
                >
                  <option value="">Select member</option>

                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>

              </div>

              {/* Investment Type */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Investment Type
                </label>

                <select
                  className="input"
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value,
                    })
                  }
                >
                  {["MF", "Stock", "FD", "PPF", "ELSS"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

              </div>

            </div>

            {/* Investment Name */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Investment Name
              </label>

              <input
                className="input"
                placeholder="Axis Bluechip Fund"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />

            </div>

            <div className="grid gap-4 md:grid-cols-2">

              {/* Monthly SIP */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Monthly SIP
                </label>

                <input
                  type="number"
                  className="input"
                  placeholder="5000"
                  value={form.monthlySip}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      monthlySip: Number(e.target.value),
                    })
                  }
                />

              </div>

              {/* SIP Category */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  SIP Category
                </label>

                <select
                  className="input"
                  value={form.sipCategory}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sipCategory: e.target.value,
                    })
                  }
                >
                  {["nifty50", "largecap", "elss", "debt"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

              </div>

            </div>

            {/* Goal Amount */}

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Goal Amount
              </label>

              <input
                type="number"
                className="input"
                placeholder="1000000"
                value={form.goalAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    goalAmount: Number(e.target.value),
                  })
                }
              />

            </div>

            <div className="flex justify-end pt-2">

              <button
                type="submit"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Investment
              </button>

            </div>

          </div>

        </form>

              {/* ================= RECENT TRANSACTIONS ================= */}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Recent Transactions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest investment activities.
            </p>
          </div>

          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            {transactions.length} Records
          </span>
        </div>

        <div className="p-6">

          {transactions.length === 0 ? (

            <div className="py-12 text-center">

              <RefreshCw className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 text-lg font-semibold text-slate-700">
                No Transactions Yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Your latest transactions will appear here.
              </p>

            </div>

          ) : (

            <div className="grid gap-4 lg:grid-cols-2">

              {transactions.slice(0, 12).map((t) => {

                const badgeColors = {
                  BUY: "bg-emerald-100 text-emerald-700",
                  SELL: "bg-red-100 text-red-700",
                  DIVIDEND: "bg-blue-100 text-blue-700",
                  DEPOSIT: "bg-amber-100 text-amber-700",
                };

                return (

                  <div
                    key={t._id}
                    className="rounded-lg border border-slate-200 p-4 transition hover:border-indigo-300 hover:shadow-md"
                  >

                    <div className="flex items-start justify-between">

                      <div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            badgeColors[t.type] ||
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {t.type}
                        </span>

                        <h3 className="mt-3 font-semibold text-slate-800">
                          {t.investmentId?.name || "Unknown Investment"}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(t.date).toLocaleDateString("en-IN")}
                        </p>

                      </div>

                      <div className="text-right">

                        <div className="text-lg font-bold text-emerald-600">
                          {rupee(t.amount)}
                        </div>

                        {Number(t.units) > 0 && (
                          <div className="mt-1 text-xs text-slate-500">
                            {Number(t.units).toLocaleString("en-IN", {
                              maximumFractionDigits: 3,
                            })}{" "}
                            Units
                          </div>
                        )}

                      </div>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      </div>

    </div>

  </div>

);
}