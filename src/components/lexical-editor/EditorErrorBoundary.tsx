"use client";
import type { NodeKey } from 'lexical';

import { LexicalErrorBoundary as LexicalErrorBoundaryDefault } from '@lexical/react/LexicalErrorBoundary';
import React from 'react';

// No custom error boundary component is needed; use LexicalErrorBoundaryDefault directly.
type ErrorBoundaryProps = {
  children: JSX.Element;
  onError?: (error: Error, editor?: any, log?: Array<string>, nodeKey?: NodeKey) => void;
  title?: string;
};


export function LexicalErrorBoundary(props: ErrorBoundaryProps): JSX.Element {
  const { onError, children, ...rest } = props;

  const handleError = (error: Error, editor?: any, log?: Array<string>, nodeKey?: NodeKey) => {
    console.error("Lexical ErrorBoundary caught an error:", error, "Node Key:", nodeKey, "Log:", log);
    if (onError) {
      onError(error, editor, log, nodeKey);
    }
  };

  // Ensure children is always a JSX.Element
  return (
    <LexicalErrorBoundaryDefault {...rest} onError={handleError}>
      {children}
    </LexicalErrorBoundaryDefault>
  );
}
