import { useState } from 'react';

/**
 * ExpandableText — Shows text clamped to N lines, expands on tap/click.
 * @param {string} children - The text content
 * @param {number} lines - Number of lines to clamp (default 2)
 * @param {string} className - Additional CSS classes for the text
 */
export function ExpandableText({ children, lines = 2, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <span
      className={`${expanded ? '' : `line-clamp-${lines}`} ${className}`}
      onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
    >
      {children}
    </span>
  );
}
