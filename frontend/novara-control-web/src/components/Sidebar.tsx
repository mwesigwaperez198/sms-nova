import {
  LayoutDashboard, Building2, CreditCard, KeyRound,
  Activity, ScrollText, Receipt, AlertTriangle, Settings, LogOut,
  ChevronLeft, ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  view: string;
  badge?: number | string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" },
  { icon: Building2, label: "Schools", view: "schools" },
  { icon: CreditCard, label: "Plans", view: "plans" },
  { icon: KeyRound, label: "API Keys", view: "api-keys" },
  { icon: Activity, label: "Health", view: "health" },
  { icon: ScrollText, label: "Audit Trail", view: "audit" },
  { icon: Receipt, label: "Payments", view: "payments" },
  { icon: AlertTriangle, label: "Incidents", view: "incidents" },
  { icon: Settings, label: "Settings", view: "settings" },
];

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeView, onNavigate, onLogout, collapsed, onToggle }: SidebarProps) {
  return (
    <>
      {!collapsed && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onToggle} />
      )}
      <aside
        className={`fixed top-0 left-0 z-30 h-full bg-zinc-900 border-r border-zinc-800 transition-all duration-200 flex flex-col ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="h-14 flex items-center gap-2 px-4 border-b border-zinc-800">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-xs font-bold shrink-0">
            N
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-wide">
              NOVARA <span className="text-zinc-400 font-normal">Control</span>
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeView === item.view
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-xs bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-zinc-800">
          <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={18} className="shrink-0" />
            ) : (
              <>
                <ChevronLeft size={18} className="shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
