import React from 'react';

const FormSelect = ({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  error = null,
  className = '',
  disabled = false
}) => {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="app-label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        className={`app-select ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''} ${disabled ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
        required={required}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default FormSelect; 