import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-none font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5ed43] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-[#e5ed43] text-[#0d0e10] hover:bg-[#eef46b]',
    secondary: 'bg-[#151619] text-[#f4f4ed] border border-[#2b2d30] hover:border-[#3a3d40] hover:bg-[#1F1F23]',
    ghost: 'bg-transparent text-[#a4a6aa] hover:text-[#f4f4ed] hover:bg-[#151619]',
    danger: 'bg-[#EF4444]/15 text-[#FCA5A5] border border-[#EF4444]/35 hover:bg-[#EF4444]/25'
  };

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
