import { AnimatePresence, motion as Motion } from "framer-motion";
import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GradientButton from "../components/common/GradientButton";
import PageTransition from "../components/common/PageTransition";
import { useAuth } from "../context/AuthContext";
import { ROLE_HOME_ROUTES, USER_ROLES } from "../services/roleConfig";

const roleTabs = [
  { label: "Citizen", value: USER_ROLES.CITIZEN, icon: UserRound },
  { label: "Municipal Office", value: USER_ROLES.MUNICIPAL, icon: Building2 },
  { label: "Main Admin", value: USER_ROLES.ADMIN, icon: ShieldCheck },
];

const defaultLogin = {
  email: "",
  password: "",
};

const defaultSignup = {
  name: "",
  email: "",
  phone: "",
  ward: "",
  password: "",
};

function LoginPage() {
  const [role, setRole] = useState(USER_ROLES.CITIZEN);
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(defaultLogin);
  const [signupForm, setSignupForm] = useState(defaultSignup);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { login, signupCitizen } = useAuth();
  const navigate = useNavigate();

  const helperText = useMemo(() => {
    if (role === USER_ROLES.ADMIN) {
      return "Demo credentials: admin@civisense.ai / admin123";
    }
    if (role === USER_ROLES.MUNICIPAL) {
      return "Demo credentials: municipal@civisense.ai / civic123";
    }
    return "Demo credentials: citizen@civisense.ai / user123";
  }, [role]);

  const onRoleChange = (nextRole) => {
    setRole(nextRole);
    setMode("login");
    setError("");
  };

  const onLoginSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await login({ ...loginForm, role });
      navigate(ROLE_HOME_ROUTES[response.user.role]);
    } catch (submitError) {
      setError(submitError.message || "Unable to login.");
    } finally {
      setBusy(false);
    }
  };

  const onSignupSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await signupCitizen(signupForm);
      navigate(ROLE_HOME_ROUTES[response.user.role]);
    } catch (submitError) {
      setError(submitError.message || "Unable to create account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageTransition className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-3xl border border-white/10 bg-white/6 p-7 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Secure Access</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Login to CiviSense control network</h1>
          <p className="mt-4 text-sm text-slate-300">
            Choose your role and continue with protected workflow access. Unauthorized routes are blocked automatically.
          </p>

          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Role Guide</p>
            <p>Citizen can register and manage own complaints.</p>
            <p>Municipal Office and Main Admin are issued managed credentials only.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/6 p-6 backdrop-blur-xl md:p-8">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-900/60 p-1">
            {roleTabs.map((tab) => {
              const Icon = tab.icon;
              const active = tab.value === role;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onRoleChange(tab.value)}
                  className={`relative flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs transition md:text-sm ${
                    active ? "text-white" : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {active ? (
                    <Motion.span
                      layoutId="role-tab-bg"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500"
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    />
                  ) : null}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {role === USER_ROLES.CITIZEN ? (
            <div className="mt-5 flex gap-2 rounded-xl bg-slate-900/50 p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm transition ${
                  mode === "login" ? "bg-white/15 text-white" : "text-slate-400"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm transition ${
                  mode === "signup" ? "bg-white/15 text-white" : "text-slate-400"
                }`}
              >
                Signup
              </button>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-cyan-200">{helperText}</p>

          {error ? (
            <p className="mt-3 rounded-lg border border-rose-300/35 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">{error}</p>
          ) : null}

          <AnimatePresence mode="wait">
            {role === USER_ROLES.CITIZEN && mode === "signup" ? (
              <Motion.form
                key="signup"
                onSubmit={onSignupSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-5 grid gap-3"
              >
                <input
                  required
                  value={signupForm.name}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Full Name"
                  className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5"
                />
                <input
                  required
                  type="email"
                  value={signupForm.email}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    required
                    value={signupForm.phone}
                    onChange={(event) => setSignupForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Phone"
                    className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5"
                  />
                  <input
                    required
                    value={signupForm.ward}
                    onChange={(event) => setSignupForm((prev) => ({ ...prev, ward: event.target.value }))}
                    placeholder="Ward"
                    className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5"
                  />
                </div>
                <input
                  required
                  type="password"
                  value={signupForm.password}
                  onChange={(event) => setSignupForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Create Password"
                  className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5"
                />
                <GradientButton type="submit" disabled={busy} className="mt-2 w-full justify-center">
                  {busy ? "Creating account..." : "Create Citizen Account"}
                </GradientButton>
              </Motion.form>
            ) : (
              <Motion.form
                key="login"
                onSubmit={onLoginSubmit}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-5 grid gap-3"
              >
                <input
                  required
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5"
                />
                <input
                  required
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Password"
                  className="rounded-xl border border-white/15 bg-slate-900/60 px-4 py-2.5"
                />
                <GradientButton type="submit" disabled={busy} className="mt-2 w-full justify-center">
                  {busy ? "Authenticating..." : "Login"}
                </GradientButton>
              </Motion.form>
            )}
          </AnimatePresence>

          {role !== USER_ROLES.CITIZEN ? (
            <p className="mt-3 text-xs text-slate-400">
              Signup is disabled for managed roles. Contact CiviSense Head Office.
            </p>
          ) : null}
        </section>
      </div>
    </PageTransition>
  );
}

export default LoginPage;
