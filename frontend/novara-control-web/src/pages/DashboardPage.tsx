import { useData } from "../hooks/useData";
import { getDashboardStats } from "../api/services";
import {
  Building2, CreditCard, AlertTriangle, Activity,
  TrendingUp, Users, ShieldCheck, RefreshCw,
} from "lucide-react";

export function DashboardPage() {
  const { data: stats, loading, refresh } = useData(getDashboardStats);

  const cards = [
    {
      label: "Total Schools",
      value: stats?.total_schools ?? 0,
      icon: Building2,
      color: "text-blue-400 bg-blue-500/10",
    },
    {
      label: "Active Schools",
      value: stats?.active_schools ?? 0,
      icon: ShieldCheck,
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Pending Registrations",
      value: stats?.pending_payments ?? 0,
      icon: CreditCard,
      color: "text-orange-400 bg-orange-500/10",
    },
    {
      label: "Total Users",
      value: (stats as any)?.total_users ?? 0,
      icon: Users,
      color: "text-purple-400 bg-purple-500/10",
    },
    {
      label: "Total Students",
      value: (stats as any)?.total_students ?? 0,
      icon: Users,
      color: "text-cyan-400 bg-cyan-500/10",
    },
    {
      label: "System Health",
      value: `${stats?.system_health_score ?? 0}%`,
      icon: Activity,
      color: "text-emerald-400 bg-emerald-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <TrendingUp size={16} className="text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-medium">System Overview</h2>
            <p className="text-xs text-zinc-500">
              Health score: {stats?.system_health_score ?? 0}%
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon size={16} />
              </div>
            </div>
            <span className="text-2xl font-semibold">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-xs font-medium text-zinc-400 mb-3 uppercase tracking-wider">Recent Events</h3>
        {stats?.recent_events && stats.recent_events.length > 0 ? (
          <div className="space-y-2">
            {stats.recent_events.map((event, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  event.type === "registration" ? "bg-amber-500" :
                  event.type === "school" ? "bg-emerald-500" :
                  event.type === "critical" ? "bg-red-500" :
                  event.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <span className="text-zinc-300 flex-1 text-xs">{event.message}</span>
                <span className="text-xs text-zinc-600 whitespace-nowrap">
                  {event.time ? new Date(event.time).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">No recent events</p>
        )}
      </div>
    </div>
  );
}
