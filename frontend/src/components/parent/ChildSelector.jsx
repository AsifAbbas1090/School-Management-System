import React from 'react';

/**
 * Dropdown of children from getMyChildren() for parent-scoped dashboards.
 */
const ChildSelector = ({ students, value, onChange, label = 'Child' }) => {
  if (!students?.length) return null;

  return (
    <div className="child-selector">
      <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
      <select
        className="select select-sm border-2 border-primary-100 rounded-lg px-3 py-2 outline-none focus:border-primary-500 min-w-[200px]"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {students.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
            {child.rollNumber ? ` (${child.rollNumber})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ChildSelector;
