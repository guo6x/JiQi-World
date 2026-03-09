import React from 'react';

export default function Footer({ className = "" }) {
  return (
    <footer className={`text-center p-5 text-xs text-gray-500 ${className}`}>
      <p>© 2026 JiQi-World. All rights reserved.</p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
        <a 
          href="https://beian.miit.gov.cn/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-gray-300 transition-colors"
        >
          粤ICP备2025114761号
        </a>
        <a 
          href="https://beian.mps.gov.cn/#/query/webSearch?code=44028202000044" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1 hover:text-gray-300 transition-colors"
        >
          <img src="/beian.png" alt="公安备案图标" className="w-4 h-4" />
          粤公网安备44028202000044号
        </a>
      </div>
    </footer>
  );
}
