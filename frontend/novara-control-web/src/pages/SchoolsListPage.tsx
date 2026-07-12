import { useState } from "react";
import { Building2, Plus, Search, RefreshCw, Mail, Check, X, Clock } from "lucide-react";
import { useData } from "../hooks/useData";
import { getSchools, getRegistrations, approveRegistration, rejectRegistration } from "../api/services";
import { SchoolAddModal } from "../components/SchoolAddModal";
import type { School } from "../api/types";

interface SchoolsListPageProps {
  onSelectSchool: (id: number) => void;
}

export function SchoolsListPage({ onSelectSchool }: SchoolsListPageProps) {
  const { data: schools, loading, error, refresh } = useData(getSchools);
  const { data: registrations, refresh: refreshRegs } = useData(() => getRegistrations("pending"));
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"schools" | "registrations">("schools");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const filtered = (schools ?? []).filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tenant_id.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingRegs = registrations ?? [];

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    suspended: "bg-red-500/10 text-red-400",
    expired: "bg-amber-500/10 text-amber-400",
    archived: "bg-zinc-500/10 text-zinc-400",
    pending: "bg-blue-500/10 text-blue-400",
  };

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      await approveRegistration(id);
      refreshRegs();
      refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: number) => {
    setRejectingId(id);
    try {
      await rejectRegistration(id);
      refreshRegs();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-sm text-indigo-300">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-zinc-400" />
          <h2 className="text-sm font-medium">Schools</h2>
          <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
            {schools?.length ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refresh(); refreshRegs(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg px-3 py-2 transition-colors"
          >
            <Plus size={14} />
            Add School
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("schools")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === "schools" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Schools ({schools?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("registrations")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors relative ${
            activeTab === "registrations" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Pending Registrations
          {pendingRegs.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded-full">
              {pendingRegs.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "schools" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <Search size={14} className="text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schools..."
                className="bg-transparent text-sm text-zinc-100 placeholder-zinc-600 flex-1 outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">School</th>
                    <th className="text-left px-4 py-3 font-medium">Tenant</th>
                    <th className="text-left px-4 py-3 font-medium">Plan</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Users</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((school) => (
                    <tr
                      key={school.id}
                      onClick={() => onSelectSchool(school.id)}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-100">{school.name}</div>
                        <div className="text-xs text-zinc-500">{school.email}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{school.tenant_id}</td>
                      <td className="px-4 py-3 text-zinc-300">{school.plan_name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[school.status] || ""}`}>
                          {school.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">{school.total_users}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{school.last_active}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">
                        No schools found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "registrations" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {pendingRegs.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Clock size={32} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-600 text-sm">No pending registrations</p>
              <p className="text-zinc-700 text-xs mt-1">New school registrations will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">School</th>
                    <th className="text-left px-4 py-3 font-medium">Admin</th>
                    <th className="text-left px-4 py-3 font-medium">Plan</th>
                    <th className="text-left px-4 py-3 font-medium">Payment</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRegs.map((reg: any) => (
                    <tr key={reg.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-100">{reg.school_name}</div>
                        <div className="text-xs text-zinc-500">{reg.admin_email}</div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{reg.admin_name}</td>
                      <td className="px-4 py-3 text-zinc-300 text-xs">{reg.plan_name}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{reg.payment_method}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                        {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(reg.id)}
                            disabled={approvingId === reg.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            <Check size={12} />
                            {approvingId === reg.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(reg.id)}
                            disabled={rejectingId === reg.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <X size={12} />
                            {rejectingId === reg.id ? "..." : "Reject"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAdd && <SchoolAddModal onClose={() => { setShowAdd(false); refresh(); }} />}
    </div>
  );
}
