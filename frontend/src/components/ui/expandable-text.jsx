import { useState } from 'react';

/**
 * ExpandableText — Shows text clamped to 2 lines, expands on tap/click.
 * @param {string} children - The text content
 * @param {string} className - Additional CSS classes for the text
 */
export function ExpandableText({ children, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <span
      className={`${expanded ? '' : 'line-clamp-2'} ${className}`}
      onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
    >
      {children}
    </span>
  );
}
