import { motion as Motion } from "framer-motion";

function GlassCard({ children, className = "", hover = true }) {
  return (
    <Motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`glass-panel rounded-2xl border border-white/15 p-5 shadow-2xl ${className}`}
    >
      {children}
    </Motion.div>
  );
}

export default GlassCard;
