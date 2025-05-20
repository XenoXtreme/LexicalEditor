
"use client";

import type { LexicalEditor } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  $isElementNode,
  $isLineBreakNode,
  ElementNode,
} from 'lexical';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Minus,
  ImageIcon,
  TableIcon,
  Type,
} from 'lucide-react';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
} from '@lexical/list';
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { INSERT_IMAGE_COMMAND } from './ToolbarPlugin'; // Assuming this is exported from ToolbarPlugin
import { $setBlocksType } from '@lexical/selection';


const ANKER_HIDE_TIMEOUT = 100; // ms to hide anker if conditions no longer met

interface AnkerButtonProps {
  editor: LexicalEditor;
  onClick: () => void;
  className?: string;
}

const AnkerButton: React.FC<AnkerButtonProps> = ({ editor, onClick, className }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onMouseDown={(e) => { // Use onMouseDown to prevent editor losing focus before menu item click
        e.preventDefault();
        onClick();
      }}
      aria-label="Insert block"
      title="Insert block"
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
};

interface BlockMenuItem {
  label: string;
  icon: React.ElementType;
  action: (editor: LexicalEditor) => void;
}

const getBlockMenuItems = (editor: LexicalEditor): BlockMenuItem[] => [
  {
    label: 'Paragraph',
    icon: Pilcrow,
    action: () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    },
  },
  {
    label: 'Heading 1',
    icon: Heading1,
    action: () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h1'));
        }
      });
    },
  },
  {
    label: 'Heading 2',
    icon: Heading2,
    action: () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h2'));
        }
      });
    },
  },
  {
    label: 'Heading 3',
    icon: Heading3,
    action: () => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h3'));
        }
      });
    },
  },
  {
    label: 'Bulleted List',
    icon: List,
    action: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
  },
  {
    label: 'Numbered List',
    icon: ListOrdered,
    action: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
  },
  {
    label: 'Check List',
    icon: ListChecks,
    action: () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
  },
  {
    label: 'Quote',
    icon: Quote,
    action: () => {
       editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          // $createQuoteNode needs to be imported from @lexical/rich-text
          // For now, using paragraph as a fallback
          $setBlocksType(selection, () => $createParagraphNode()); // Replace with $createQuoteNode() when available
        }
      });
    }
  },
  {
    label: 'Code Block',
    icon: Code,
    action: () => {
       editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    }
  },
  {
    label: 'Horizontal Rule',
    icon: Minus,
    action: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
  },
  {
    label: 'Image',
    icon: ImageIcon,
    action: () => {
      // This typically opens a dialog. For simplicity, we'll insert a placeholder.
      // In a real app, you'd trigger the same dialog as the toolbar.
      const src = 'https://placehold.co/600x400.png';
      const altText = 'placeholder image';
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src, altText, width: 400, height: 300 });
    },
  },
  {
    label: 'Table',
    icon: TableIcon,
    action: () => {
      // Similar to image, this would open a dialog.
      editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '3', rows: '3' });
    },
  },
];

export default function BlockAnkerPlugin() {
  const [editor] = useLexicalComposerContext();
  const ankerRef = useRef<HTMLDivElement>(null);
  const [showAnker, setShowAnker] = useState(false);
  const [ankerPosition, setAnkerPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateAnkerPosition = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        setShowAnker(false);
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getTopLevelElement();

      if (element && $isElementNode(element) && (element.isEmpty() || (element.getChildrenSize() === 1 && $isLineBreakNode(element.getFirstChild())))) {
         if ($isRootNode(element)) return; // Don't show for root node

        const domElement = editor.getElementByKey(element.getKey());
        if (domElement) {
          const rect = domElement.getBoundingClientRect();
          const editorRootRect = editor.getRootElement()?.getBoundingClientRect();
          
          if (editorRootRect) {
             setAnkerPosition({
                top: rect.top - editorRootRect.top + window.scrollY,
                left: rect.left - editorRootRect.left - 30 + window.scrollX, // Position to the left of the block
             });
             setShowAnker(true);
             if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
             return;
          }
        }
      }
      
      // If conditions are not met, schedule to hide the anker
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setShowAnker(false);
        setIsMenuOpen(false); // Also close menu if anker hides
      }, ANKER_HIDE_TIMEOUT);

    });
  }, [editor]);


  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateAnkerPosition();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, updateAnkerPosition]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (showAnker) {
        updateAnkerPosition();
         if (isMenuOpen) setIsMenuOpen(false); // Close menu on scroll
      }
    };
    window.addEventListener('scroll', handleScroll, true); // Use capture to get scroll events early
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [editor, showAnker, updateAnkerPosition, isMenuOpen]);


  if (!showAnker && !isMenuOpen) { // Keep popover anchor if menu is open but anker itself hides
    return null;
  }

  const menuItems = getBlockMenuItems(editor);

  return (
    <div
      ref={ankerRef}
      className="absolute z-20" // Increased z-index
      style={ankerPosition ? { top: ankerPosition.top, left: ankerPosition.left } : { display: 'none' }}
    >
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
           {/* Ensure the trigger is always rendered if the popover *could* be shown,
               but control its visibility via the parent div or CSS opacity if needed */}
          <AnkerButton
            editor={editor}
            onClick={() => setIsMenuOpen(true)}
            className={showAnker ? 'opacity-100' : 'opacity-0 pointer-events-none'} // Hide if not showAnker
          />
        </PopoverTrigger>
        <PopoverContent 
            className="w-60 p-1"
            side="right"
            align="start"
            sideOffset={5}
            onCloseAutoFocus={(e) => e.preventDefault()} // Prevent editor focus steal on close
        >
          <div className="flex flex-col">
            <p className="p-2 text-xs font-semibold text-muted-foreground">INSERT BLOCKS</p>
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start h-8 px-2 text-sm"
                onMouseDown={(e) => { // Use onMouseDown for menu items too
                    e.preventDefault();
                    item.action(editor);
                    setIsMenuOpen(false);
                }}
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

