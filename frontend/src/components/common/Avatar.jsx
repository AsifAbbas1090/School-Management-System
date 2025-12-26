import React from 'react';
import { getInitials, getAvatarColor } from '../../utils';

const Avatar = ({ name, src, size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
    };

    const initials = getInitials(name);
    const bgColor = getAvatarColor(name);

    return (
        <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white ${className}`}
            style={{ backgroundColor: src ? 'transparent' : bgColor }}
        >
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full rounded-full object-cover"
                />
            ) : (
                initials
            )}
        </div>
    );
};

export default Avatar;
