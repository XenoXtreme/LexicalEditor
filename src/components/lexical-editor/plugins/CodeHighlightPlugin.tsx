"use client";
// This is a basic wrapper. Lexical's CodeHighlightPlugin relies on PrismJS or similar.
// For this example, we ensure CodeNode and CodeHighlightNode are registered,
// and the theme provides styling for `.token` classes.
// A full implementation might involve dynamic loading of PrismJS languages.

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  CodeHighlightNode,
  CodeNode,
  registerCodeHighlighting,
} from "@lexical/code";
import { useEffect } from "react";

export function CodeHighlightPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Ensure CodeNode and CodeHighlightNode are registered if not done globally
    // This is typically done in LexicalComposer initialConfig.nodes
    // For safety, we can check and register if needed, though it's better practice to register them upfront.
    // if (!editor.hasNodes([CodeNode, CodeHighlightNode])) {
    //   console.warn("CodeNode or CodeHighlightNode not registered. Code highlighting might not work.");
    //   // Potentially register them here if absolutely necessary, but it's not ideal.
    // }
    return registerCodeHighlighting(editor);
  }, [editor]);

  return null; // This plugin itself does not render anything
}
