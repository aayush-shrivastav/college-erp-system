import React from 'react';

const Input = ({
  label,
  error,
  className = '',
  icon: Icon,
  ...props
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          className={`
            w-full py-3 ${Icon ? 'pl-11' : 'px-4'} pr-4 
            bg-gray-50 dark:bg-gray-900/50 
            text-gray-900 dark:text-white 
            placeholder-gray-400 dark:placeholder-gray-500
            border-2 rounded-xl transition-all outline-none
            ${error 
              ? 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 focus:border-red-500' 
              : 'border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900'
            }
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
