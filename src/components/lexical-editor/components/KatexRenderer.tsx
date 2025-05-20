
"use client";

import katex from 'katex';
import 'katex/dist/katex.min.css';
import * as React from 'react';
import { useEffect, useRef } from 'react';

interface KatexRendererProps {
  equation: string;
  inline: boolean;
  onClick?: () => void; // Optional onClick for triggering editor
  className?: string; // Allow passing custom class
}

export default function KatexRenderer({ equation, inline, onClick, className }: KatexRendererProps): JSX.Element {
  const katexElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const katexElement = katexElementRef.current;

    if (katexElement !== null) {
      try {
        katex.render(equation, katexElement, {
          displayMode: !inline, // true for block, false for inline
          output: 'html', // Use 'html' instead of 'htmlAndMathml' for wider compatibility if MathML isn't strictly needed
          throwOnError: false, // Consider setting to true for debugging, false for production
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        // Fallback display for errors
        katexElement.textContent = `Error rendering equation: ${equation}`;
        katexElement.style.color = 'red';
      }
    }
  }, [equation, inline]);

  return (
    <div 
        ref={katexElementRef} 
        className={className}
        onClick={onClick} 
        role="math" 
        aria-label={`Equation: ${equation}`} 
        tabIndex={onClick ? 0 : undefined} // Make clickable if onClick is provided
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    />
  );
}
