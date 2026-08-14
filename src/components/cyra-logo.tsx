'use client';

import React from 'react';
import Image from 'next/image';

export interface CyraLogoProps {
  /** Size preset ('sm' | 'md' | 'lg' | 'xl') or pixel number */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Image alt attribute. Defaults to "CYRA AI" */
  alt?: string;
  /** Additional CSS class names for the image */
  className?: string;
  /** Priority loading flag */
  priority?: boolean;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export function CyraLogo({
  size = 'md',
  alt = 'CYRA AI',
  className = '',
  priority = true,
}: CyraLogoProps) {
  const pixelSize = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 40);

  return (
    <Image
      src="/brand/cyra-logo.png"
      alt={alt}
      width={pixelSize}
      height={pixelSize}
      priority={priority}
      className={`object-contain rounded-full flex-shrink-0 select-none ${className}`}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
      }}
    />
  );
}

export default CyraLogo;
