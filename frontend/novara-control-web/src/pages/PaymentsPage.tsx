import { Receipt, Clock, CheckCircle2, XCircle, Mail, RefreshCw } from "lucide-react";
import { useData } from "../hooks/useData";
import { getRegistrations, approveRegistration, rejectRegistration } from "../api/services";
import { useState } from "react";

export function PaymentsPage() {
  const { data: registrations, loading, refresh } = useData(() => getRegistrations());
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionId, setActionId] = useState<number | null>(null);

  const filtered = (registrations ?? []).filter((r: any) =>
    statusFilter === "all" || r.status === statusFilter
  );

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const methodLabel: Record<string, string> = {
    mobile_money: "Mobile Money",
    bank_account: "Bank Account",
  };

  const handleApprove = async (id: number) => {
    setActionId(id);
    try { await approveRegistration(id); refresh(); } catch {}
    setActionId(null);
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    try { await rejectRegistration(id); refresh(); } catch {}
    setActionId(null);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-zinc-400" />
          <h2 className="text-sm font-medium">Registration Payments</h2>
          <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full">
            {registrations?.length ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">School</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Method</th>
                  <th className="text-left px-4 py-3 font-medium">Payment Details</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg: any) => (
                  <tr key={reg.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-100">{reg.school_name}</div>
                      <div className="text-xs text-zinc-500">{reg.admin_email}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{reg.plan_name || "N/A"}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{methodLabel[reg.payment_method] || reg.payment_method}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono max-w-[200px] truncate">{reg.payment_details}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColor[reg.status] || ""}`}>
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {reg.created_at ? new Date(reg.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {reg.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(reg.id)}
                            disabled={actionId === reg.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(reg.id)}
                            disabled={actionId === reg.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">
                          {reg.status === "approved" ? "Key emailed" : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Receipt size={32} className="text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-600 text-sm">No registration payments</p>
                      <p className="text-zinc-700 text-xs mt-1">Payments will appear here when schools register</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
