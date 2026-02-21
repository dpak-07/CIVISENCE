import { motion as Motion } from "framer-motion";
import { pageTransition } from "../../animations/variants";

function PageTransition({ children, className = "" }) {
  return (
    <Motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </Motion.div>
  );
}

export default PageTransition;
