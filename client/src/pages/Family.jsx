import {
  Plus,
  Trash2,
  Users,
  MapPin,
  FileText,
  Calendar,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useToast } from "../components/Toast";

export default function Family() {
  const [families, setFamilies] = useState([]);
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [familyForm, setFamilyForm] = useState({ name: "Patel Family", city: "Ahmedabad", description: "" });
  const [memberForm, setMemberForm] = useState({ name: "", relationship: "", dob: "" });
  const toast = useToast();

  async function load() {
    const { data } = await api.get("/family");
    setFamilies(data.data);
    const stored = localStorage.getItem("wealthnest_family");
    const selected = data.data.find((f) => f._id === stored) || data.data[0];
    if (selected) {
      setFamily(selected);
      localStorage.setItem("wealthnest_family", selected._id);
      const memberRes = await api.get(`/family/${selected._id}/members`);
      setMembers(memberRes.data.data);
    }
  }

  useEffect(() => { load().catch(() => toast.show("Could not load family", "error")); }, []);

  async function createFamily(e) {
    e.preventDefault();
    const { data } = await api.post("/family", familyForm);
    localStorage.setItem("wealthnest_family", data.data._id);
    toast.show("Family created");
    await load();
  }

  async function saveMember(e) {
    e.preventDefault();
    await api.post(`/family/${family._id}/members`, memberForm);
    setMemberForm({ name: "", relationship: "", dob: "" });
    toast.show("Member added");
    await load();
  }

  async function removeMember(memberId) {
    await api.delete(`/family/${family._id}/members/${memberId}`);
    toast.show("Member removed");
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-indigo-600" />
            Family Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage the household, member profiles, and relationships.</p>
        </div>
        
        {/* Family Selector */}
        {families.length > 0 && (
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-2">Active:</label>
            <select 
              value={family?._id || ""} 
              onChange={async (e) => {
                const selected = families.find(f => f._id === e.target.value);
                if (selected) {
                  setFamily(selected);
                  localStorage.setItem("wealthnest_family", selected._id);
                  const memberRes = await api.get(`/family/${selected._id}/members`);
                  setMembers(memberRes.data.data);
                }
              }}
              className="bg-transparent border-0 text-sm font-medium text-slate-800 focus:ring-0 cursor-pointer pr-8 py-1"
            >
              {families.map((f) => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Family Setup / Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Create Family Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-600" /> Create Household
              </h2>
            </div>
            <form onSubmit={createFamily} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Family Name</label>
                <input 
                  type="text" 
                  value={familyForm.name} 
                  onChange={e => setFamilyForm({...familyForm, name: e.target.value})}
                  className="w-full text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                  placeholder="e.g. Patel Family"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={familyForm.city} 
                    onChange={e => setFamilyForm({...familyForm, city: e.target.value})}
                    className="w-full text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm pl-9"
                    placeholder="e.g. Ahmedabad"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <textarea 
                    value={familyForm.description} 
                    onChange={e => setFamilyForm({...familyForm, description: e.target.value})}
                    className="w-full text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm pl-9 min-h-[80px]"
                    placeholder="Optional household details..."
                  />
                </div>
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Plus className="h-4 w-4" /> Create Family
              </button>
            </form>
          </div>

          {/* Active Family Summary Card */}
          {family && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                <Users className="h-40 w-40" />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider bg-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-500/20 mb-3">
                Active Household
              </span>
              <h3 className="text-xl font-bold">{family.name}</h3>
              <p className="text-slate-300 text-xs flex items-center gap-1 mt-1.5">
                <MapPin className="h-3 w-3 text-slate-400" /> {family.city}
              </p>
              {family.description && (
                <p className="text-slate-400 text-sm mt-3 pt-3 border-t border-slate-700/50 leading-relaxed italic">
                  "{family.description}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Members Listing & Addition */}
        <div className="space-y-6 lg:col-span-2">
          {family ? (
            <>
              {/* Add Member Form Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-indigo-600" /> Add Family Member
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">Adding to {family.name}</span>
                </div>
                <form onSubmit={saveMember} className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={memberForm.name} 
                      onChange={e => setMemberForm({...memberForm, name: e.target.value})}
                      className="w-full text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Relationship</label>
                    <input 
                      type="text" 
                      value={memberForm.relationship} 
                      onChange={e => setMemberForm({...memberForm, relationship: e.target.value})}
                      className="w-full text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
                      placeholder="Spouse, Child, Parent..."
                      required
                    />
                  </div>
                  <div>
  <label className="block text-xs font-medium text-slate-600 mb-1">
    Date of Birth
  </label>
  <div className="relative">
    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
    <input
      type="date"
      value={memberForm.dob}
      onChange={(e) =>
        setMemberForm({
          ...memberForm,
          dob: e.target.value,
        })
      }
      className="w-full pl-9 text-sm rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
      required
    />
  </div>
</div>

<div className="md:col-span-3 flex justify-end">
  <button
    type="submit"
    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-medium text-white transition shadow-sm"
  >
    <UserPlus className="h-4 w-4" />
    Add Member
  </button>
</div>
</form>
</div>

{/* Members List Card */}
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
  <div className="flex items-center justify-between border-b border-slate-100 p-5">
    <div>
      <h2 className="text-base font-bold text-slate-800">
        Household Roster
      </h2>
      <p className="text-xs text-slate-500 mt-1">
        {members.length} {members.length === 1 ? "Member" : "Members"}
      </p>
    </div>
  </div>

  {members.length === 0 ? (
    <div className="py-12 text-center">
      <Users className="mx-auto h-12 w-12 text-slate-300" />
      <h3 className="mt-4 text-lg font-semibold text-slate-700">
        No members added yet
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Fill out the member profile form above to start building this
        household.
      </p>
    </div>
  ) : (
    <div className="divide-y divide-slate-100">
      {members.map((m) => (
        <div
          key={m._id}
          className="flex items-center justify-between p-5 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {m.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>

            <div>
              <h3 className="font-semibold text-slate-800">
                {m.name}
              </h3>

              <p className="text-sm text-slate-500">
                {m.relationship}
              </p>

              {m.dob && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(m.dob).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeMember(m._id)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title="Remove Member"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )}
</div>
</>
) : (
<div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
  <Users className="mx-auto h-14 w-14 text-slate-300" />
  <h2 className="mt-4 text-xl font-bold text-slate-700">
    No active household found
  </h2>
  <p className="mt-2 text-slate-500">
    Create your first family using the form on the left to begin
    managing members.
  </p>
</div>
)}
</div>
</div>
</div>
);
}