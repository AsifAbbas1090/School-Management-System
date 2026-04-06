import React from 'react';
import { getInitials, getAvatarColor } from '../../utils';

const sizePx = { sm: 32, md: 40, lg: 48, xl: 80 };
const fontSize = { sm: '0.7rem', md: '0.875rem', lg: '1rem', xl: '1.25rem' };

const Avatar = ({ name, src, size = 'md', className = '' }) => {
    const px = sizePx[size] || sizePx.md;
    const bgColor = getAvatarColor(name);

    return (
        <div
            className={className}
            style={{
                width: px,
                height: px,
                minWidth: px,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'white',
                fontSize: fontSize[size] || fontSize.md,
                background: src ? 'transparent' : `linear-gradient(135deg, ${bgColor}, ${getAvatarColor(name + '1')})`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                border: '2px solid var(--bg-card)',
                overflow: 'hidden',
                flexShrink: 0,
            }}
        >
            {src ? (
                <img
                    src={src}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                <span>{getInitials(name)}</span>
            )}
        </div>
    );
};

export default Avatar;
