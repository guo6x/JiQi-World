import React, { useState } from 'react';

export function Spinner({ size = 'md', color = 'text-cyan-400', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses[size]} ${color} ${className}`} role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
    </div>
  );
}

export function Skeleton({ variant = 'rect', className = '' }) {
  const baseClasses = "bg-white/10 animate-pulse rounded";
  const variants = {
    circle: "rounded-full",
    rect: "rounded-lg",
    text: "rounded h-4",
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className} relative overflow-hidden`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

export function ImageWithLoader({ src, alt, className, containerClassName, priority = false }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Skeleton / Loading State */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 z-0">
          <Skeleton variant="rect" className="w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="sm" className="opacity-50" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 text-gray-500 p-4 text-center">
          <span className="text-2xl mb-2">⚠️</span>
          <span className="text-xs">加载失败</span>
        </div>
      )}

      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setError(true);
          setIsLoaded(true); // Stop loading state
        }}
      />
    </div>
  );
}
