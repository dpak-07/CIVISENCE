import { motion as Motion } from "framer-motion";
import { useMagnetic } from "../../hooks/useMagnetic";

const variantClassMap = {
  primary:
    "bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-slate-950 shadow-[0_10px_32px_rgba(56,189,248,0.45)]",
  secondary:
    "bg-white/10 text-white border border-white/25 backdrop-blur-xl",
};

function GradientButton({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}) {
  const magnetic = useMagnetic(18);

  return (
    <Motion.button
      ref={magnetic.ref}
      type={type}
      style={magnetic.style}
      {...magnetic.handlers}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition duration-200 hover:brightness-110 ${variantClassMap[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Motion.button>
  );
}

export default GradientButton;
