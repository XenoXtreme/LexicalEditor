
"use client";
import * as React from 'react';
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
  Calculator,
  ChevronsUpDown,
} from 'lucide-react';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
} from '@lexical/list';
import { $createHeadingNode, $isHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createCodeNode } from '@lexical/code';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_IMAGE_COMMAND, INSERT_TABLE_DIALOG_COMMAND } from './ToolbarPlugin';
import { INSERT_EQUATION_COMMAND } from './EquationPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from '../plugins/Collapsible';
import { $setBlocksType } from '@lexical/selection';


const ANKER_HIDE_TIMEOUT = 100; // ms to hide anker if conditions no longer met

interface AnkerButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {}

const AnkerButton = React.forwardRef<HTMLButtonElement, AnkerButtonProps>(
  (props, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onMouseDown={(e) => {
          e.preventDefault(); 
          if (props.onMouseDown) { 
            props.onMouseDown(e);
          }
        }}
        aria-label="Insert block"
        title="Insert block"
        {...props} 
      >
        <Plus className="h-5 w-5" />
      </Button>
    );
  }
);
AnkerButton.displayName = "AnkerButton";


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
          $setBlocksType(selection, () => $createQuoteNode());
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
          // ToolbarPlugin handles default language if not specified
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
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, { src: '', altText: '', showModal: true });
    },
  },
  {
    label: 'Table',
    icon: TableIcon,
    action: () => {
      editor.dispatchCommand(INSERT_TABLE_DIALOG_COMMAND, undefined);
    },
  },
  {
    label: 'Equation',
    icon: Calculator,
    action: () => {
      editor.dispatchCommand(INSERT_EQUATION_COMMAND, { showModal: true });
    },
  },
  {
    label: 'Collapsible',
    icon: ChevronsUpDown,
    action: () => {
      editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
    }
  }
];

export default function BlockAnkerPlugin() {
  const [editor] = useLexicalComposerContext();
  const ankerRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);
  const [showAnker, setShowAnker] = useState(false);
  const [ankerPosition, setAnkerPosition] = useState<{ top: number; left: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateAnkerPosition = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
        if (!isMenuOpen) setShowAnker(false);
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getTopLevelElement();

      if (element && $isElementNode(element) && (element.isEmpty() || (element.getChildrenSize() === 1 && $isLineBreakNode(element.getFirstChild())))) {
         if ($isRootNode(element)) return; 

        const domElement = editor.getElementByKey(element.getKey());
        if (domElement) {
          const rect = domElement.getBoundingClientRect();
          const editorRootRect = editor.getRootElement()?.getBoundingClientRect();

          if (editorRootRect) {
             setAnkerPosition({
                top: rect.top - editorRootRect.top + window.scrollY,
                left: rect.left - editorRootRect.left - 30 + window.scrollX, 
             });
             setShowAnker(true);
             if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
             return;
          }
        }
      }

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        if (!isMenuOpen) {
          setShowAnker(false);
        }
      }, ANKER_HIDE_TIMEOUT);

    });
  }, [editor, isMenuOpen]);


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
    const handleScrollOrResize = (event?: Event) => {
      if (isMenuOpen) {
        if (event && event.type === 'scroll') {
          const target = event.target as Node;
          if (popoverContentRef.current && popoverContentRef.current.contains(target)) {
            return; 
          }
        }
        setIsMenuOpen(false);
        updateAnkerPosition(); 
      } else if (showAnker) {
        updateAnkerPosition(); 
      }
    };
  
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize, true);
  
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize, true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [editor, showAnker, isMenuOpen, updateAnkerPosition]);


  const shouldRenderPopover = showAnker || isMenuOpen;

  if (!shouldRenderPopover && !isMenuOpen) {
    return null;
  }

  const menuItems = getBlockMenuItems(editor);

  return (
    <div
      ref={ankerRef}
      className="absolute z-20"
      style={ankerPosition ? { top: ankerPosition.top, left: ankerPosition.left } : { display: 'none' }}
    >
      <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <PopoverTrigger asChild>
          <AnkerButton
            className={(showAnker || isMenuOpen) ? 'opacity-100' : 'opacity-0 pointer-events-none'}
          />
        </PopoverTrigger>
        <PopoverContent
            ref={popoverContentRef}
            className="w-full sm:w-60 p-1"
            side="right"
            align="start"
            sideOffset={5}
            onCloseAutoFocus={(e) => e.preventDefault()} 
        >
          <div className="flex flex-col max-h-[300px] overflow-y-auto">
            <p className="p-2 text-xs font-semibold text-muted-foreground">INSERT BLOCKS</p>
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start h-8 px-2 text-sm"
                onMouseDown={(e) => { 
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
