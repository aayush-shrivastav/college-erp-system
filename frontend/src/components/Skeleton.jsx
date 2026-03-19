import React from 'react';

export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseClasses = "bg-gray-200 dark:bg-gray-700 animate-pulse";
  const variantClasses = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2 w-full">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="h-8 w-1/2" />
        <Skeleton variant="text" className="w-1/4" />
      </div>
      <Skeleton variant="circle" className="w-12 h-12" />
    </div>
  </div>
);
