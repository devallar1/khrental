import React from 'react';

/**
 * Button component for consistent button styling across the application
 * 
 * @param {Object} props - Component props
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.variant - Button variant (primary, secondary, danger, success, warning)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {function} props.onClick - Click handler
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 */
const Button = ({ 
  type = 'button', 
  variant = 'primary',
  size = 'md',
  disabled = false, 
  onClick, 
  className = '', 
  children,
  ...rest
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-2xl font-semibold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base'
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus:ring-4 focus:ring-blue-100',
    secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 focus:ring-4 focus:ring-slate-100',
    danger: 'border border-rose-200 bg-white text-rose-700 shadow-sm hover:bg-rose-50 focus:ring-4 focus:ring-rose-100',
    success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 focus:ring-4 focus:ring-emerald-100',
    warning: 'bg-amber-500 text-white shadow-sm hover:bg-amber-400 focus:ring-4 focus:ring-amber-100',
    link: 'rounded-none bg-transparent p-0 text-blue-700 hover:text-blue-900 hover:underline focus:ring-0'
  };
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button; 