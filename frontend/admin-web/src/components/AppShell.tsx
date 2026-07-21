import { Bell, LogOut, Menu, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { RoleKey, RoleProfile } from "../types";
import type { Session } from "../api";
import { NovaraLogo } from "./NovaraLogo";

interface AppShellProps {
  roles: RoleProfile[];
  activeRole: RoleProfile;
  onRoleChange: (role: RoleKey) => void;
  navItems?: string[];
  activeView?: string;
  onViewChange?: (view: string) => void;
  showRoleSwitcher?: boolean;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  session?: Session;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onSearchSubmit?: () => void;
  children: ReactNode;
}

export function AppShell({
  roles,
  activeRole,
  onRoleChange,
  navItems,
  activeView,
  onViewChange,
  showRoleSwitcher = true,
  onLogout,
  onOpenNotifications,
  onOpenProfile,
  session,
  searchQuery = "",
  onSearchChange,
  onSearchSubmit,
  children
}: AppShellProps) {
  const ActiveIcon = activeRole.icon;
  const visibleNav = navItems ?? activeRole.nav;
  const searchRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell-modern" data-role={activeRole.key}>
      <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={closeSidebar} />
      <aside className={`sidebar-modern ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-brand">
            <div className="brand-icon"><NovaraLogo size={24} /></div>
            <div className="brand-text">
              <strong>{session?.user?.school ?? "NOVARA School"}</strong>
              <span>{activeRole.label}</span>
            </div>
            <button type="button" className="mobile-menu-btn" onClick={closeSidebar} style={{marginLeft:"auto"}}>
              <X size={20} />
            </button>
          </div>

        {session && (
          <div className="user-card">
            <div className="user-avatar">{session.user.full_name.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <strong>{session.user.full_name}</strong>
              <span>{session.user.role}</span>
            </div>
          </div>
        )}

        {showRoleSwitcher && (
          <div className="role-switcher-modern">
            <label htmlFor="role">Workspace</label>
            <select id="role" value={activeRole.key} onChange={(e) => onRoleChange(e.target.value as RoleKey)}>
              {roles.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
        )}

        <nav className="nav-modern" aria-label="Primary" data-role={activeRole.key}>
          {visibleNav.map((item) => (
            <button
              type="button"
              key={item}
              className={`nav-link ${activeView === item ? "active" : ""}`}
              onClick={() => onViewChange?.(item)}
            >
              <span className="nav-indicator" style={{ backgroundColor: activeRole.accent }} />
              <span className="nav-label">{item}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="shortcut-hint">
            <kbd>Ctrl+K</kbd> Search
          </span>
          <span className="shortcut-hint">
            <kbd>Ctrl+P</kbd> Print
          </span>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar-modern" data-role={activeRole.key}>
          <div className="workspace-header">
            <button type="button" className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="workspace-icon-modern" style={{ color: activeRole.accent, borderColor: activeRole.accent + '40' }}>
              <ActiveIcon size={24} />
            </div>
            <div className="workspace-meta">
              <p className="workspace-role">{activeRole.label}</p>
              <h1 className="workspace-view">{activeView ?? activeRole.title}</h1>
            </div>
          </div>

          <div className="topbar-actions-modern">
            <div className="search-modern">
              <Search size={16} />
              <input
                ref={searchRef}
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearchSubmit?.()}
              />
              <kbd className="search-kbd">⌘K</kbd>
            </div>
            <button type="button" className="action-btn" aria-label="Notifications" onClick={onOpenNotifications}>
              <Bell size={18} />
            </button>
            <button type="button" className="action-btn" aria-label="Profile" onClick={onOpenProfile}>
              <User size={18} />
            </button>
            <button type="button" className="action-btn logout-btn" aria-label="Logout" onClick={onLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="content-modern">
          {children}
        </main>

        <footer className="footer-modern">
          <div className="footer-brand">
            <span>{session?.user?.school ?? "NOVARA School"}</span>
          </div>
          <a className="footer-powered" href="https://novara-tech-africa.kesug.com" target="_blank" rel="noopener noreferrer">Powered by Novara</a>
        </footer>

        <nav className="mobile-bottom-tabs">
          {visibleNav.map((item) => (
            <button
              key={item}
              type="button"
              className={`bottom-tab ${activeView === item ? "active" : ""}`}
              onClick={() => { onViewChange?.(item); setSidebarOpen(false); }}
            >
              <span className="bottom-tab-label">{item}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
