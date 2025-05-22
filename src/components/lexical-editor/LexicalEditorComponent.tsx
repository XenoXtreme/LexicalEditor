
"use client";
import React, { useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { CodeHighlightPlugin } from './plugins/CodeHighlightPlugin';
import 'katex/dist/katex.min.css';
import { mergeRegister } from '@lexical/utils';
import { $findMatchingParent } from '@lexical/utils';


import EditorTheme from './themes/EditorTheme';
import EditorNodes from './nodes/EditorNodes';
import { LexicalErrorBoundary } from './EditorErrorBoundary';
import ToolbarPlugin, { OPEN_LINK_DIALOG_COMMAND, CUSTOM_CLEAR_FORMATTING_COMMAND, CUSTOM_TRANSFORM_TEXT_CASE_COMMAND, type TextCaseType, INSERT_IMAGE_COMMAND, INSERT_TABLE_DIALOG_COMMAND } from './plugins/ToolbarPlugin';
import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import { Toaster } from "@/components/ui/toaster";
import { Separator } from '@/components/ui/separator';

import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import EquationPlugin, { INSERT_EQUATION_COMMAND } from './plugins/EquationPlugin';
import BlockAnkerPlugin from './plugins/BlockAnkerPlugin';
import CollapsiblePlugin from './plugins/Collapsible';


import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_DOWN_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  $createParagraphNode,
  $isRootOrShadowRoot,
  // $isTextNode, // Not directly used here anymore
} from 'lexical';

import { $isListNode, ListNode } from '@lexical/list';
import { $isCodeNode, CodeNode } from '@lexical/code';
import { $isHeadingNode, $isQuoteNode as isQuoteNodeLexical, HeadingNode } from '@lexical/rich-text';
import * as LexicalSelectionUtil from '@lexical/selection';


// Initial editor state
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

// Inner component to handle editor logic that depends on the context
function EditorLogicHandler() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor) {
      return;
    }

    const unregister = mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event: KeyboardEvent) => {
          const { ctrlKey, metaKey, shiftKey, key } = event;
          const modKey = ctrlKey || metaKey;

          if (modKey && shiftKey) {
            switch (key.toLowerCase()) {
              case 'x': // Strikethrough: Ctrl+Shift+X
                event.preventDefault();
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
                return true;
              case 'l': // Left Align: Ctrl+Shift+L
                event.preventDefault();
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
                return true;
              case 'e': // Center Align: Ctrl+Shift+E
                event.preventDefault();
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
                return true;
              case 'r': // Right Align: Ctrl+Shift+R
                event.preventDefault();
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
                return true;
              case 'j': // Justify Align: Ctrl+Shift+J
                event.preventDefault();
                editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
                return true;
              case 'u': // Uppercase: Ctrl+Shift+U
                event.preventDefault();
                editor.dispatchCommand(CUSTOM_TRANSFORM_TEXT_CASE_COMMAND, 'uppercase');
                return true;
            }
          } else if (modKey) {
            switch (key.toLowerCase()) {
              case ',': // Subscript: Ctrl+,
                event.preventDefault();
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
                return true;
              case '.': // Superscript: Ctrl+.
                event.preventDefault();
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
                return true;
              case '\\': // Clear Formatting: Ctrl+\\
                event.preventDefault();
                editor.dispatchCommand(CUSTOM_CLEAR_FORMATTING_COMMAND, undefined);
                return true;
              case 'k': // Link: Ctrl+K
                event.preventDefault();
                editor.dispatchCommand(OPEN_LINK_DIALOG_COMMAND, undefined);
                return true;
              case '[': // Outdent: Ctrl+[
                event.preventDefault();
                editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
                return true;
              case ']': // Indent: Ctrl+]
                event.preventDefault();
                editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
                return true;
            }
          }
          return false; // Let other handlers process the event
        },
        COMMAND_PRIORITY_NORMAL,
      ),
      editor.registerCommand(CUSTOM_CLEAR_FORMATTING_COMMAND, () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // LexicalSelectionUtil.$clearFormatting(selection); // This has import issues
            console.warn("Lexical's $clearFormatting utility is currently affected by an import issue. Performing a limited manual format clearing.");

            LexicalSelectionUtil.$patchStyleText(selection, {
              'font-family': `var(--font-roboto), sans-serif`,
              'font-size': '16px',
              'color': 'inherit',
              'background-color': 'transparent',
              'font-weight': '',
              'font-style': '',
              'text-decoration': '',
            });
            // Toggle off formats
            if (selection.hasFormat('bold')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            if (selection.hasFormat('italic')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            if (selection.hasFormat('underline')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            if (selection.hasFormat('strikethrough')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
            if (selection.hasFormat('subscript')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
            if (selection.hasFormat('superscript')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
            if (selection.hasFormat('code')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
            if (selection.hasFormat('highlight')) editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight');

            const anchorNode = selection.anchor.getNode();
            const element = $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            }) || anchorNode.getTopLevelElementOrThrow();

            if ($isListNode(element) || $isCodeNode(element) || isQuoteNodeLexical(element) || $isHeadingNode(element)) {
              LexicalSelectionUtil.$setBlocksType(selection, () => $createParagraphNode());
            }
          }
        });
        return true;
      }, COMMAND_PRIORITY_NORMAL),

      editor.registerCommand(CUSTOM_TRANSFORM_TEXT_CASE_COMMAND, (payload: TextCaseType) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const selectedText = selection.getTextContent();
            let transformedText = selectedText;
            if (payload === 'uppercase') {
              transformedText = selectedText.toUpperCase();
            } else if (payload === 'lowercase') {
              transformedText = selectedText.toLowerCase();
            } else if (payload === 'capitalize') {
              transformedText = selectedText.replace(/\b\w/g, char => char.toUpperCase());
            }
            selection.insertText(transformedText);
          }
        });
        return true;
      }, COMMAND_PRIORITY_NORMAL)
    );
    return () => {
      unregister();
    };
  }, [editor]);

  return null; // This component does not render anything itself
}


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
        <Separator orientation="horizontal" />
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
          <EquationPlugin />
          <CollapsiblePlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <BlockAnkerPlugin />
          <EditorLogicHandler /> {/* Add the logic handler here */}
        </div>
      </div>
      <Toaster />
    </LexicalComposer>
  );
}
