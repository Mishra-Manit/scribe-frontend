"use client";

import { motion, HTMLMotionProps } from "framer-motion";

interface ScaleInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function ScaleIn({ 
  children, 
  delay = 0, 
  className = "",
  ...props 
}: ScaleInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
