import { motion as Motion } from "framer-motion";
import { revealUp } from "../../animations/variants";

function SectionReveal({ children, className = "", delay = 0 }) {
  return (
    <Motion.div
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </Motion.div>
  );
}

export default SectionReveal;
