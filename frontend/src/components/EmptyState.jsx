import React from 'react';
import { FileQuestion } from 'lucide-react';

const EmptyState = ({ 
  icon: Icon = FileQuestion, 
  title = "No data found", 
  description = "There are no records to display at the moment.",
  action 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full mb-4">
        <Icon size={40} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
