import React, { useState } from 'react';
import { Shirt } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  swatchHex?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  swatchHex = '#E4DFD5',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#ECE8DF] text-[#5B5850] p-6 select-none ${className}`}
        style={{
          backgroundImage: `radial-gradient(circle at 50% 35%, ${swatchHex}33, #EAE5DB 75%)`,
        }}
        role="img"
        aria-label={alt}
      >
        <Shirt className="w-8 h-8 stroke-[1.25] mb-2 opacity-60" />
        <span className="font-serif text-sm tracking-wide text-center">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
