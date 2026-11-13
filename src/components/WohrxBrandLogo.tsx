import React from 'react';

interface WohrxLogoProps {
  variant?: 'blue' | 'white' | 'dark' | 'gradient';
  showSubtitle?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const WohrxIsotype: React.FC<{
  className?: string;
  color?: string;
  size?: number;
}> = ({ className = 'w-7 h-7', color = '#003F9B', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wohrx stylized X with upward arrow (Brandbook V6 pág. 8-12) */}
      {/* Ascending diagonal line with arrow head ↗ */}
      <path
        d="M20 85L68 37"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="square"
      />
      {/* Arrow head on top-right */}
      <path
        d="M50 24H85V59"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* Descending crossing strokes with geometric gap */}
      <path
        d="M26 30L44 48"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="square"
      />
      <path
        d="M62 66L80 84"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="square"
      />
    </svg>
  );
};

export const WohrxLogo: React.FC<WohrxLogoProps> = ({
  variant = 'blue',
  showSubtitle = false,
  className = '',
  size = 'md',
}) => {
  const heights = {
    sm: 'h-5',
    md: 'h-7',
    lg: 'h-9',
    xl: 'h-11',
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src="/assets/aistudio/Refresh-Logo_Wohrx_69795bd4.png"
        alt="Wohrx"
        className={`${heights[size]} w-auto object-contain ${
          variant === 'white' ? 'brightness-0 invert' : ''
        }`}
      />

      {showSubtitle && (
        <span
          className={`text-[10px] font-bold tracking-widest uppercase ml-1 pl-2 border-l ${
            variant === 'white'
              ? 'border-white/30 text-white/80'
              : 'border-[#8F9193]/40 text-[#5E47DF]'
          }`}
        >
          Time
        </span>
      )}
    </div>
  );
};
