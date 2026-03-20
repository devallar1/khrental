import React from 'react';

const FormInput = ({
  label,
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      <label htmlFor={id} className="app-label">
        {label} {required && <span className="text-red-500 font-bold">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={onChange}
        required={required}
        aria-required={required}
        aria-invalid={!!error}
        className={`app-input ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500 font-medium">{error}</p>}
    </div>
  );
};

export default FormInput; 