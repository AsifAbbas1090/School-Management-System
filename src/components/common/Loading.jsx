import React from 'react';

const Loading = ({ size = 'md', fullScreen = false }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const spinner = (
        <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin`} />
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
                <div className="text-center">
                    {spinner}
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center p-8">
            {spinner}
        </div>
    );
};

export default Loading;
