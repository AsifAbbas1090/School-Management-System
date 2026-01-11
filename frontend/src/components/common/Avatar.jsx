import React from 'react';
import { getInitials, getAvatarColor } from '../../utils';

const Avatar = ({ name, src, size = 'md', className = '' }) => {
    const sizeClasses = {
        sm: { container: 'w-8 h-8', text: 'text-xs' },
        md: { container: 'w-10 h-10', text: 'text-sm' },
        lg: { container: 'w-12 h-12', text: 'text-base' },
        xl: { container: 'w-20 h-20', text: 'text-xl' },
    };

    const sizeConfig = sizeClasses[size] || sizeClasses.md;
    const initials = getInitials(name);
    const bgColor = getAvatarColor(name);

    return (
        <div
            className={`${sizeConfig.container} rounded-full flex items-center justify-center font-bold text-white shadow-md border-2 border-white ${className}`}
            style={{ 
                backgroundColor: src ? 'transparent' : bgColor,
                background: src ? 'transparent' : `linear-gradient(135deg, ${bgColor}, ${getAvatarColor(name + '1')})`,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
        >
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full rounded-full object-cover"
                />
            ) : (
                <span className={sizeConfig.text}>{initials}</span>
            )}
        </div>
    );
};

export default Avatar;
