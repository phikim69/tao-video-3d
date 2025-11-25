import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  fullWidth = false,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg transition-all duration-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-green/50 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-zinc-800 text-white hover:bg-gradient-brand hover:shadow-[0_0_15px_rgba(22,163,74,0.5)] border border-zinc-700 hover:border-transparent",
    secondary: "bg-transparent text-zinc-300 hover:text-white hover:bg-white/10 border border-transparent",
    icon: "p-2 bg-zinc-900/50 text-zinc-300 hover:text-white hover:bg-gradient-brand rounded-full border border-zinc-800 hover:border-brand-green/50"
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};