
"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { CodeHighlightPlugin } from './plugins/CodeHighlightPlugin'; // Local wrapper for syntax highlighting
import { OnChangePlugin as LexicalOnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';


import EditorTheme from './themes/EditorTheme';
import EditorNodes from './nodes/EditorNodes';
import { LexicalErrorBoundary } from './EditorErrorBoundary';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import AiAutocompletePlugin from './plugins/AiAutocompletePlugin';
import { aiAutocomplete, type AutocompleteInput } from '@/ai/flows/ai-autocomplete';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { EditorState, LexicalEditor } from 'lexical';
import { $getRoot, $getSelection, $isRangeSelection } from 'lexical';
import { Toaster } from "@/components/ui/toaster" // For AI suggestions

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
  const [editorInstance, setEditorInstance] = useState<LexicalEditor | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const debouncedText = useDebounce(currentText, 10000); // Debounce AI call by 10 seconds to respect rate limits

  const initialConfig = {
    namespace: 'LexicalCanvasEditor',
    theme: EditorTheme,
    nodes: EditorNodes,
    editorState: JSON.stringify(initialJsonState), // Can also be a function
    onError: (error: Error) => {
      console.error("Lexical editor error:", error);
    },
  };

  const handleOnChange = useCallback((editorState: EditorState, editor: LexicalEditor) => {
    setEditorInstance(editor); // Keep track of editor instance
    editorState.read(() => {
      const root = $getRoot();
      const text = root.getTextContent();
      setCurrentText(text);

      // Clear suggestion if text content becomes empty or significantly changes from suggestion context
      if (aiSuggestion && (text.length === 0 || !text.includes(currentText.substring(0, currentText.length - aiSuggestion.length)))) {
         setAiSuggestion(null);
      }
    });
  }, [aiSuggestion, currentText]);

  useEffect(() => {
    if (debouncedText && debouncedText.trim().length > 10 && !isFetchingSuggestion) { // Min length for suggestion
      const fetchSuggestion = async () => {
        setIsFetchingSuggestion(true);
        try {
          const input: AutocompleteInput = { text: debouncedText };
          const result = await aiAutocomplete(input);
          if (result.completion && result.completion.trim() !== "") {
            // Only set suggestion if it's different from current ending or not already applied
            if (!debouncedText.endsWith(result.completion)) {
                 setAiSuggestion(result.completion);
            } else {
                setAiSuggestion(null); // Avoid suggesting what's already there
            }
          } else {
            setAiSuggestion(null);
          }
        } catch (error) {
          console.error("AI Autocomplete error:", error);
          setAiSuggestion(null);
        } finally {
          setIsFetchingSuggestion(false);
        }
      };
      fetchSuggestion();
    } else if (!debouncedText.trim()) {
        setAiSuggestion(null); // Clear suggestion if text is empty
    }
  }, [debouncedText, isFetchingSuggestion]);


  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative bg-card p-0.5 rounded-lg shadow-lg border border-input">
        <ToolbarPlugin />
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
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <LexicalOnChangePlugin onChange={handleOnChange} ignoreSelectionChange={true} />
          <AiAutocompletePlugin
            suggestion={aiSuggestion}
            setSuggestion={setAiSuggestion}
            isFetchingSuggestion={isFetchingSuggestion}
          />
        </div>
      </div>
      <Toaster />
      {isFetchingSuggestion && (
        <div className="text-sm text-muted-foreground mt-2 text-center">Loading AI suggestion...</div>
      )}
    </LexicalComposer>
  );
}

