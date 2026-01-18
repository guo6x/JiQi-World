import React, { useRef } from 'react';
import { motion } from 'framer-motion';

export default function MobileView({ memories, onOpenUpload }) {
  const timerRef = useRef(null);

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
        if (onOpenUpload) onOpenUpload();
    }, 1500); // 1.5s long press
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 overflow-y-auto">
      <h1 
        className="text-3xl font-bold text-center mb-10 mt-6 tracking-[0.2em] border-b border-white/10 pb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent select-none active:scale-95 transition-transform"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart} // For testing on desktop
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        吉琪的世界
      </h1>
      <div className="flex flex-col gap-12 pb-16">
        {memories.map((mem) => (
          <motion.div
            key={mem.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col gap-4"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/20 shadow-[0_0_30px_rgba(6,182,212,0.15)] group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <img 
                src={mem.url || mem.image_url} 
                alt={mem.description} 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col gap-1 px-2">
              <p className="text-xs text-cyan-400 font-mono tracking-widest uppercase opacity-80">{mem.memory_date}</p>
              <p className="text-lg font-light text-gray-100 leading-relaxed tracking-wide drop-shadow-lg">{mem.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-center text-xs text-gray-600 pb-8">
          Designed for Desktop Experience
      </div>
    </div>
  );
}
