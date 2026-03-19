const Card = ({ children, title, className = '', headerAction }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between">
          {title && <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>}
          {headerAction}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
