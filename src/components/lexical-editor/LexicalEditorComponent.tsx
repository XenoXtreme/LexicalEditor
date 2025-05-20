
"use client";
import React, { useEffect } from 'react'; // Added useEffect
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { CodeHighlightPlugin } from './plugins/CodeHighlightPlugin';
import 'katex/dist/katex.min.css'; // Added KaTeX CSS


import EditorTheme from './themes/EditorTheme';
import EditorNodes from './nodes/EditorNodes';
import { LexicalErrorBoundary } from './EditorErrorBoundary';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import { Toaster } from "@/components/ui/toaster";
import { Separator } from '@/components/ui/separator';

import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
// import { CollapsiblePlugin } from '@lexical/react/LexicalCollapsiblePlugin'; // Removed
import BlockAnkerPlugin from './plugins/BlockAnkerPlugin';
import EquationPlugin from './plugins/EquationPlugin'; // Added EquationPlugin


// Initial editor state - can be empty or pre-filled
const initialJsonState = {
  "root": {
    "children": [
      {
        "children": [
          {
            "detail": 0,
            "format": 0,
            "mode": "normal",
            "style": "",
            "text": "Welcome to Lexical Canvas! Start typing...",
            "type": "text",
            "version": 1
          }
        ],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      },
      {
        "children": [],
        "direction": "ltr",
        "format": "",
        "indent": 0,
        "type": "paragraph",
        "version": 1
      }
    ],
    "direction": "ltr",
    "format": "",
    "indent": 0,
    "type": "root",
    "version": 1
  }
};


export default function LexicalEditorComponent(): JSX.Element {

  const initialConfig = {
    namespace: 'LexicalCanvasEditor',
    theme: EditorTheme,
    nodes: EditorNodes,
    editorState: JSON.stringify(initialJsonState),
    onError: (error: Error) => {
      console.error("Lexical editor error:", error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative bg-card p-0.5 rounded-lg shadow-lg border border-input">
        <ToolbarPlugin />
        <Separator orientation="horizontal"/>
        <div className="editor-inner relative mt-0 p-4 min-h-[400px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-b-md">
          <RichTextPlugin
            contentEditable={<ContentEditable className="outline-none resize-none h-full text-base" />}
            placeholder={<div className="editor-placeholder">Enter some text...</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <ListPlugin />
          <LinkPlugin />
          <CodeHighlightPlugin />
          <HorizontalRulePlugin />
          <TablePlugin />
          {/* <CollapsiblePlugin /> */} {/* Removed */}
          <EquationPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <BlockAnkerPlugin />
        </div>
      </div>
      <Toaster />
    </LexicalComposer>
  );
}
