import { useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export const useMagnetic = (strength = 20) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 180, damping: 14, mass: 0.2 };

  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const onMouseMove = (event) => {
    if (!ref.current) {
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;
    x.set((offsetX / rect.width) * strength);
    y.set((offsetY / rect.height) * strength);
  };

  const onMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return {
    ref,
    style: {
      x: springX,
      y: springY,
    },
    handlers: {
      onMouseMove,
      onMouseLeave,
    },
  };
};
