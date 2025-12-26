import React, { useState, useRef, useEffect } from 'react';

/**
 * Autocomplete Input Component
 * @param {Object} props
 * @param {string[]} props.options - List of options
 * @param {string} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.filterFn - Custom filter function
 */
const Autocomplete = ({ 
    options = [], 
    value = '', 
    onChange, 
    placeholder = 'Type to search...',
    className = '',
    filterFn = null
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Filter options based on input value
    useEffect(() => {
        if (!value || value.trim() === '') {
            setFilteredOptions(options.slice(0, 10));
            return;
        }

        const term = value.toLowerCase().trim();
        const filtered = filterFn 
            ? filterFn(term, options)
            : options.filter(opt => 
                opt.toLowerCase().includes(term)
            ).slice(0, 10);
        
        setFilteredOptions(filtered);
    }, [value, options, filterFn]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
        inputRef.current?.blur();
    };

    const handleKeyDown = (e) => {
        if (!isOpen || filteredOptions.length === 0) {
            if (e.key === 'Enter' && value) {
                // Allow custom value if Enter is pressed
                setIsOpen(false);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex]);
                } else if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                inputRef.current?.blur();
                break;
            default:
                break;
        }
    };

    const handleFocus = () => {
        setIsOpen(true);
    };

    return (
        <div className={`autocomplete-wrapper ${className}`} style={{ position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="input"
                autoComplete="off"
            />
            
            {isOpen && filteredOptions.length > 0 && (
                <div 
                    ref={dropdownRef}
                    className="autocomplete-dropdown"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.375rem',
                        marginTop: '0.25rem',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                >
                    {filteredOptions.map((option, index) => (
                        <div
                            key={index}
                            onClick={() => handleSelect(option)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            style={{
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                backgroundColor: highlightedIndex === index ? '#f3f4f6' : 'white',
                                borderBottom: index < filteredOptions.length - 1 ? '1px solid #e5e7eb' : 'none',
                            }}
                            className="hover:bg-gray-100"
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Autocomplete;

