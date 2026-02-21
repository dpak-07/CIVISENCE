import { animate, motion as Motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

function AnimatedCounter({ value, duration = 1.3, suffix = "" }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.floor(latest));

  useEffect(() => {
    const controls = animate(count, value, {
      duration,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [count, duration, value]);

  return (
    <Motion.span>
      <Motion.span>{rounded}</Motion.span>
      {suffix}
    </Motion.span>
  );
}

export default AnimatedCounter;
