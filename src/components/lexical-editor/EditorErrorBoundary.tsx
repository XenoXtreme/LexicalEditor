"use client";
import type { ErrorBoundaryProps, NodeKey } from 'lexical';
import { LexicalErrorBoundary as LexicalErrorBoundaryDefault } from '@lexical/react/LexicalErrorBoundary';
import React from 'react';

// Default error boundary component
function EditorErrorBoundaryComponent({
  children,
  onError,
  title,
}: ErrorBoundaryProps & {
  children: JSX.Element | string | (JSX.Element | string)[];
  title: string;
}): JSX.Element {
  return (
    <div title={title} className="p-4 bg-destructive/10 border border-destructive text-destructive rounded">
      <p className="font-semibold mb-2">An error occurred in the editor:</p>
      <p className="text-sm mb-2">{title}</p>
      <details className="text-xs">
        <summary>Error Details</summary>
        {/* Error details are often logged to console by Lexical, this is a simple visual cue */}
      </details>
      {/* Optionally render children or a fallback UI */}
    </div>
  );
}


export function LexicalErrorBoundary(props: Omit<ErrorBoundaryProps, 'onError'> & { onError?: (error: Error, editor?: any,  log?: Array<string>, nodeKey?: NodeKey) => void }): JSX.Element {
  const { onError, ...rest } = props;
  
  const handleError = (error: Error, editor?: any, log?: Array<string>, nodeKey?: NodeKey) => {
    console.error("Lexical ErrorBoundary caught an error:", error, "Node Key:", nodeKey, "Log:", log);
    if (onError) {
      onError(error, editor, log, nodeKey);
    }
  };

  return <LexicalErrorBoundaryDefault {...rest} onError={handleError}  />;
}
