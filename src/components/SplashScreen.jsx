import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFilled(true), 500); // Start filling quickly
    const exitTimer = setTimeout(onComplete, 3500); // Exit after 3.5s
    return () => { clearTimeout(timer); clearTimeout(exitTimer); };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      exit={{ opacity: 0, transition: { duration: 1.5 } }}
    >
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 24 24" className="w-full h-full">
            <defs>
                <linearGradient id="fluidGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#d53e4f" />
                    <stop offset="50%" stopColor="#9e0142" />
                    <stop offset="100%" stopColor="#5e4fa2" />
                </linearGradient>
                <mask id="fillMask">
                    <motion.rect
                        x="0" y="0" width="24" height="24"
                        fill="white"
                        initial={{ y: 24 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                    />
                </mask>
            </defs>
            <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="none"
                stroke="white"
                strokeWidth="0.5"
            />
            <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="url(#fluidGradient)"
                mask="url(#fillMask)"
            />
        </svg>
      </div>
      
      <motion.h1
        className="mt-8 text-2xl font-light text-white tracking-[0.3em]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: filled ? 1 : 0, y: 0 }}
        transition={{ duration: 1, delay: 2 }}
      >
        吉琪的世界 | Our World
      </motion.h1>
    </motion.div>
  );
}
