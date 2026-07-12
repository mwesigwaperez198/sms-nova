import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SchoolsListPage } from "./pages/SchoolsListPage";
import { SchoolDetailPage } from "./pages/SchoolDetailPage";
import { PlansPage } from "./pages/PlansPage";
import { HealthPage } from "./pages/HealthPage";
import { AuditPage } from "./pages/AuditPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { SettingsPage } from "./pages/SettingsPage";

const viewTitles: Record<string, string> = {
  dashboard: "Dashboard",
  schools: "Schools",
  plans: "Subscription Plans",
  "api-keys": "API Keys",
  health: "System Health",
  audit: "Audit Trail",
  payments: "Payments",
  incidents: "Incidents",
  settings: "Settings",
};

function AppContent() {
  const { admin, logout } = useAuth();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1024);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("novara_theme") || "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("novara_theme", theme);
  }, [theme]);

  if (!admin) return <LoginPage />;

  const handleNavigate = (v: string) => {
    setView(v);
    setSelectedSchoolId(null);
    if (window.innerWidth < 1024) setSidebarCollapsed(true);
  };

  const handleSelectSchool = (id: number) => {
    setSelectedSchoolId(id);
    setView("school-detail");
  };

  const title = view === "school-detail"
    ? "School Detail"
    : (viewTitles[view] || "NOVARA Control");

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-app)" }}>
      <Sidebar
        activeView={view}
        onNavigate={handleNavigate}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      }`}>
        <Header
          title={title}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
        />

        <main className="flex-1 overflow-y-auto">
          {view === "dashboard" && <DashboardPage />}
          {view === "schools" && <SchoolsListPage onSelectSchool={handleSelectSchool} />}
          {view === "school-detail" && selectedSchoolId && (
            <SchoolDetailPage
              schoolId={selectedSchoolId}
              onBack={() => handleNavigate("schools")}
            />
          )}
          {view === "plans" && <PlansPage />}
          {view === "api-keys" && <SchoolsListPage onSelectSchool={handleSelectSchool} />}
          {view === "health" && <HealthPage />}
          {view === "audit" && <AuditPage />}
          {view === "payments" && <PaymentsPage />}
          {view === "incidents" && <IncidentsPage />}
          {view === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
