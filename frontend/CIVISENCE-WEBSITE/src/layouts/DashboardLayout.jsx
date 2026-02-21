import { AnimatePresence, motion as Motion } from "framer-motion";
import { LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import RoleBadge from "../components/common/RoleBadge";
import { useAuth } from "../context/AuthContext";

function DashboardLayout({ title, subtitle, navItems, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.24),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.15),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.16),transparent_36%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-72 border-r border-white/10 bg-slate-950/65 p-6 backdrop-blur-2xl lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-900">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/85">CiviSense</p>
              <h1 className="text-xl font-semibold">Control Center</h1>
            </div>
          </div>

          <div className="mb-7">
            <RoleBadge role={user?.role} />
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                      isActive
                        ? "bg-white/18 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </aside>

        <AnimatePresence>
          {sidebarOpen ? (
            <Motion.aside
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.24 }}
              className="absolute inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-slate-950/95 p-6 backdrop-blur-2xl lg:hidden"
            >
              <div className="mb-8 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Navigation</p>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md border border-white/20 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                          isActive
                            ? "bg-white/18 text-white"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </Motion.aside>
          ) : null}
        </AnimatePresence>

        <div className="flex-1 p-4 md:p-8">
          <header className="mb-7 flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <div>
              <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
              <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-white/15 bg-white/8 p-2 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
