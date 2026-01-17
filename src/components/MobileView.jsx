import React from 'react';
import { motion } from 'framer-motion';

export default function MobileView({ memories }) {
  return (
    <div className="min-h-screen bg-black text-white p-4 overflow-y-auto">
      <h1 className="text-2xl font-light text-center mb-8 mt-4 tracking-widest border-b border-white/20 pb-4">
        吉琪的世界
      </h1>
      <div className="flex flex-col gap-8 pb-12">
        {memories.map((mem) => (
          <motion.div
            key={mem.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-3"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/10 shadow-lg shadow-cyan-900/10">
              <img 
                src={mem.url} 
                alt={mem.description} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex justify-between items-baseline px-1">
              <p className="text-sm text-gray-400 font-mono">{mem.memory_date}</p>
              <p className="text-base font-light text-gray-200">{mem.description}</p>
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
