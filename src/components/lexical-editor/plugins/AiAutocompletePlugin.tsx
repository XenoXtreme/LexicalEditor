"use client";
import { useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_NORMAL,
  KEY_TAB_COMMAND,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { useToast } from '@/hooks/use-toast'; // Using toast for suggestion display

type AiAutocompletePluginProps = {
  suggestion: string | null;
  setSuggestion: (suggestion: string | null) => void;
  isFetchingSuggestion: boolean;
};

export default function AiAutocompletePlugin({ suggestion, setSuggestion, isFetchingSuggestion }: AiAutocompletePluginProps): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const { toast } = useToast();

  const handleTabCommand = useCallback(
    (event: KeyboardEvent) => {
      if (suggestion) {
        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(suggestion);
          }
          setSuggestion(null); 
        });
        return true; 
      }
      return false; 
    },
    [editor, suggestion, setSuggestion]
  );

  useEffect(() => {
    if (!editor) return;

    // Clear suggestion on other key presses
    const unregisterKeydown = editor.registerRootListener((rootElement, prevRootElement, type) => {
        if (type === 'keydown' && suggestion) {
            const event = arguments[0] as KeyboardEvent; 
            if (event.key !== 'Tab' && !event.metaKey && !event.ctrlKey && !event.altKey) {
                if (event.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(event.key) || event.key.startsWith('Arrow')) {
                    setSuggestion(null);
                }
            }
        }
    });
    
    return mergeRegister(
      editor.registerCommand(KEY_TAB_COMMAND, handleTabCommand, COMMAND_PRIORITY_NORMAL),
      unregisterKeydown
    );
  }, [editor, suggestion, handleTabCommand, setSuggestion]);

  // Display suggestion via toast (simple UI for now)
  useEffect(() => {
    if (suggestion) {
      toast({
        title: "AI Suggestion",
        description: (
          <div>
            <p className="font-mono bg-muted p-1 rounded inline-block">{suggestion}</p>
            <p className="text-xs mt-1">Press Tab to insert.</p>
          </div>
        ),
        duration: 5000, // Show for 5 seconds or until dismissed/tabbed
      });
    }
  }, [suggestion, toast]);
  
  // Optionally, show a loading indicator for AI suggestion
  useEffect(() => {
    if (isFetchingSuggestion) {
      // Could show a small loading spinner or toast
      // For now, let's log it or use a subtle indicator if available
      console.log("Fetching AI suggestion...");
    }
  }, [isFetchingSuggestion]);


  return null;
}
