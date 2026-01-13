"use client";

import { motion, HTMLMotionProps } from "framer-motion";

interface SlideInProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  direction?: "left" | "right" | "up" | "down";
  className?: string;
}

export function SlideIn({ 
  children, 
  delay = 0, 
  direction = "up", 
  className = "",
  ...props 
}: SlideInProps) {
  const variants = {
    hidden: { 
      opacity: 0, 
      x: direction === "left" ? -20 : direction === "right" ? 20 : 0, 
      y: direction === "up" ? 20 : direction === "down" ? -20 : 0 
    },
    visible: { 
      opacity: 1, 
      x: 0, 
      y: 0 
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ 
        duration: 0.5, 
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
