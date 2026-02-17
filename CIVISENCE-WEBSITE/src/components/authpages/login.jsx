import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCity, FaUserShield, FaUserCog, FaTools } from "react-icons/fa";
import { MdEmail, MdLock } from "react-icons/md";

const roles = [
  { id: "admin", label: "Administrator", icon: <FaUserShield /> },
  { id: "engineer", label: "Engineer", icon: <FaTools /> },
  { id: "officer", label: "Field Officer", icon: <FaUserCog /> },
];

export default function MunicipalLogin() {
  const [selectedRole, setSelectedRole] = useState(null);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#020617] overflow-hidden">

      {/* Ambient Glow */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/30 rounded-full blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-cyan-500/30 rounded-full blur-[120px]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-[430px] rounded-3xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl"
      >
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 rounded-t-3xl" />

        <div className="p-8">
          {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-emerald-500 text-white p-4 rounded-full text-2xl">
                <FaCity />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-white">CiviSense</h1>
            <p className="text-emerald-200 text-sm">
              Municipal Secure Access
            </p>
          </div>

          {/* Role Selector */}
          <div className="mt-8">
            <p className="text-sm text-gray-300 mb-3 text-center">
              Select Your Role
            </p>

            <div className="grid grid-cols-3 gap-3">
              {roles.map((role) => (
                <motion.button
                  key={role.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition
                    ${
                      selectedRole === role.id
                        ? "bg-emerald-500/20 border-emerald-400 text-white"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                    }`}
                >
                  <span className="text-xl">{role.icon}</span>
                  <span className="text-xs">{role.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Login Form */}
          <AnimatePresence>
            {selectedRole && (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-8 space-y-5"
                autoComplete="off"
              >
                {/* Anti password-manager */}
                <input type="text" className="hidden" />
                <input type="password" className="hidden" />

                <div className="relative">
                  <MdEmail className="absolute left-3 top-3.5 text-emerald-300" />
                  <input
                    type="text"
                    placeholder="Officer ID / Email"
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-3 pl-10 pr-4 text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="relative">
                  <MdLock className="absolute left-3 top-3.5 text-emerald-300" />
                  <input
                    type="password"
                    placeholder="Password"
                    autoComplete="new-password"
                    spellCheck="false"
                    className="w-full rounded-xl bg-white/5 border border-white/10 py-3 pl-10 pr-4 text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white shadow-lg"
                >
                  Login as {roles.find(r => r.id === selectedRole)?.label}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400">
            Role-based access enabled · CiviSense © 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
}
