
"use client";
import { useCallback, useEffect, useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $createParagraphNode,
  $getNodeByKey,
  COMMAND_PRIORITY_LOW,
  ElementFormatType,
  $getRoot,
  $createTextNode,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListItemNode, $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND, ListNode } from '@lexical/list';
import { $isCodeNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, /* CODE_LANGUAGE_MAP, */ $createCodeNode, getCodeLanguages, getDefaultCodeLanguage } from '@lexical/code'; // CODE_LANGUAGE_MAP removed as it's not directly used
import { $getNearestNodeOfType, mergeRegister, $findMatchingParent } from '@lexical/utils';
import { $createHeadingNode, $isHeadingNode, $createQuoteNode, $isQuoteNode as isQuoteNodeLexical, HeadingTagType /* QuoteNode removed */ } from '@lexical/rich-text';
import * as LexicalSelectionUtil from '@lexical/selection'; // Using namespace import


import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $createImageNode, ImageNode } from '../nodes/ImageNode.tsx';
import { INSERT_EQUATION_COMMAND } from './EquationPlugin'; // Added Equation command


import {
  Bold, Italic, Underline, Strikethrough, Code, Link2, List, ListOrdered, ListChecks, Quote, Pilcrow, Heading1, Heading2, Heading3, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, CaseSensitive, Eraser, Copy, Type, ChevronDown, Highlighter, PlusSquare, Minus, TableIcon, Image as ImageIcon, Sparkles, Loader2, Indent, Outdent, Calculator // Calculator icon added
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { generateText, type GenerateTextInput } from '@/ai/flows/generate-text-flow'; 
import { createCommand, type LexicalCommand } from 'lexical';


const LowPriority = COMMAND_PRIORITY_LOW;

// Custom command for inserting image
export const INSERT_IMAGE_COMMAND: LexicalCommand<{altText: string; src: string; width?: number; height?: number}> = createCommand('INSERT_IMAGE_COMMAND');


const supportedBlockTypes = new Set([
  'paragraph',
  'quote',
  'code',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'check',
]);

const blockTypeToBlockName: Record<string, string> = {
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  ol: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
  ul: 'Bulleted List',
  check: 'Check List',
};

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Arial', `Arial, sans-serif`],
  ['Courier New', `'Courier New', Courier, monospace`],
  ['Georgia', `Georgia, serif`],
  ['Times New Roman', `'Times New Roman', Times, serif`],
  ['Trebuchet MS', `'Trebuchet MS', Helvetica, sans-serif`],
  ['Verdana', `Verdana, Geneva, sans-serif`],
  ['Roboto', `var(--font-roboto), sans-serif`],
  ['Open Sans', `var(--font-open-sans), sans-serif`],
  ['Lato', `var(--font-lato), sans-serif`],
  ['Montserrat', `var(--font-montserrat), sans-serif`],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['11px', '8pt (11px)'],
  ['12px', '9pt (12px)'],
  ['13px', '10pt (13px)'],
  ['15px', '11pt (15px)'],
  ['16px', '12pt (16px)'],
  ['19px', '14pt (19px)'],
  ['21px', '16pt (21px)'],
  ['24px', '18pt (24px)'],
  ['27px', '20pt (27px)'],
  ['29px', '22pt (29px)'],
  ['32px', '24pt (32px)'],
  ['35px', '26pt (35px)'],
  ['37px', '28pt (37px)'],
  ['48px', '36pt (48px)'],
  ['64px', '48pt (64px)'],
  ['96px', '72pt (96px)'],
];


// Helper to extract numeric part for font size display
const getNumericFontSize = (fontSize: string) => {
  const match = fontSize.match(/^(\d+)/);
  return match ? match[1] : fontSize.replace('px', '');
};


const COLOR_PALETTE: { name: string; value: string; isThemeVar?: boolean }[] = [
  { name: 'Default', value: 'inherit' },
  { name: 'Black', value: 'hsl(var(--foreground))', isThemeVar: true },
  { name: 'White', value: 'hsl(var(--background))', isThemeVar: true },
  { name: 'Primary', value: 'hsl(var(--primary))', isThemeVar: true },
  { name: 'Secondary', value: 'hsl(var(--secondary-foreground))', isThemeVar: true },
  { name: 'Accent', value: 'hsl(var(--accent))', isThemeVar: true },
  { name: 'Destructive', value: 'hsl(var(--destructive))', isThemeVar: true },
  { name: 'Red', value: '#DB4437' },
  { name: 'Green', value: '#0F9D58' },
  { name: 'Blue', value: '#4285F4' },
  { name: 'Yellow', value: '#F4B400' },
  { name: 'Purple', value: '#5E35B1'},
  { name: 'Pink', value: '#D81B60'},
  { name: 'Orange', value: '#F57C00'},
  { name: 'Teal', value: '#00897B'},
  { name: 'Gray', value: '#757575'}
];

const ALIGNMENT_OPTIONS: { value: ElementFormatType | 'start' | 'end'; label: string; icon: React.ElementType, shortcut?: string }[] = [
  { value: 'left', label: 'Left Align', icon: AlignLeft, shortcut: 'Ctrl+Shift+L' },
  { value: 'center', label: 'Center Align', icon: AlignCenter, shortcut: 'Ctrl+Shift+E' },
  { value: 'right', label: 'Right Align', icon: AlignRight, shortcut: 'Ctrl+Shift+R' },
  { value: 'justify', label: 'Justify Align', icon: AlignJustify, shortcut: 'Ctrl+Shift+J' },
  { value: 'start', label: 'Start Align', icon: AlignLeft }, // Icon remains AlignLeft for LTR
  { value: 'end', label: 'End Align', icon: AlignRight },   // Icon remains AlignRight for LTR
];


function getSelectedNode(selection: any) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  if (isBackward) {
    return $isRangeSelection(selection) ? anchorNode : focusNode;
  } else {
    return $isRangeSelection(selection) ? focusNode : anchorNode;
  }
}


export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState<string>('paragraph');
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState('plaintext');
  const [currentCodeLanguages, setCurrentCodeLanguages] = useState<string[]>([]);


  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isHighlight, setIsHighlight] = useState(false);
  const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');

  const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
  const [currentFontFamily, setCurrentFontFamily] = useState<string>(`var(--font-roboto), sans-serif`);
  const [currentTextColor, setCurrentTextColor] = useState<string>('inherit');
  const [currentHighlightColor, setCurrentHighlightColor] = useState<string>('transparent');

  const [isInsertTableDialogOpen, setIsInsertTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState('3');
  const [tableColumns, setTableColumns] = useState('3');

  const [isInsertImageDialogOpen, setIsInsertImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAltText, setImageAltText] = useState('');

  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isGenAIDialogOpen, setIsGenAIDialogOpen] = useState(false);


  const { toast } = useToast();


  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      
      // Parent List Item / List
      const listItemNode = $getNearestNodeOfType(anchorNode, $isListItemNode);
      const parentList = listItemNode ? $getNearestNodeOfType(listItemNode, $isListNode) : null;

      if (parentList && $isListNode(parentList)) { // Ensure parentList is a ListNode
        const listType = parentList.getListType();
        setBlockType(listType); 
         setSelectedElementKey(parentList.getKey());
         if (typeof (parentList as any).getFormatType === 'function') { // Check if list node supports format
            setElementFormat((parentList as any).getFormatType());
          } else {
            setElementFormat('left'); 
          }
      } else {
          // Not in a list, check top-level element
          let topLevelElement = anchorNode.getTopLevelElement();
          if (!topLevelElement) {
            topLevelElement = $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });
          }
          if (!topLevelElement) { 
            topLevelElement = anchorNode;
          }
          
          if (topLevelElement) {
              setSelectedElementKey(topLevelElement.getKey());
              if (typeof (topLevelElement as any).getFormatType === 'function') {
                setElementFormat((topLevelElement as any).getFormatType());
              } else {
                setElementFormat('left'); 
              }

              if ($isHeadingNode(topLevelElement)) {
                setBlockType(topLevelElement.getTag());
              } else if (isQuoteNodeLexical(topLevelElement)) {
                setBlockType('quote');
              } else if ($isCodeNode(topLevelElement)) {
                setBlockType('code');
                const lang = topLevelElement.getLanguage();
                setCodeLanguage(lang || getDefaultCodeLanguage() || 'plaintext');
              } else {
                setBlockType('paragraph');
              }
          } else {
            setSelectedElementKey(null);
            setElementFormat('left');
            setBlockType('paragraph');
          }
      }


      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      setIsHighlight(selection.hasFormat('highlight'));

      const node = getSelectedNode(selection);
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));
      

      setCurrentFontSize(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-size', '16px'));
      setCurrentFontFamily(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-family', `var(--font-roboto), sans-serif`));
      setCurrentTextColor(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'color', 'inherit'));
      setCurrentHighlightColor(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'background-color', 'transparent'));

    }
  }, [editor]);

  useEffect(() => {
    setCurrentCodeLanguages(getCodeLanguages());
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        LowPriority,
      ),
      editor.registerCommand(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          editor.update(() => {
            const { altText, src, width, height } = payload;
            const imageNode = $createImageNode({ altText, src, width, height });
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                selection.insertNodes([imageNode]);
                if ($isRootOrShadowRoot(selection.anchor.getNode())) {
                    selection.insertParagraph();
                }
            } else {
                 $getRoot().append(imageNode);
            }
          });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      )
    );
  }, [editor, updateToolbar]);

 const insertLink = useCallback(() => {
    editor.update(() => {
        const selection = $getSelection();
        let existingUrl = '';
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const parent = node.getParent();
            if ($isLinkNode(parent)) {
                existingUrl = parent.getURL();
            } else if ($isLinkNode(node)) {
                existingUrl = node.getURL();
            }
        }

        const url = window.prompt(isLink ? 'Edit link URL (leave empty to remove):' : 'Enter link URL:', existingUrl || 'https://');
        
        if (url === null) { 
            return; // User cancelled
        }
        if (url === '') { 
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null); // Remove link
        } else {
            // Ensure protocol is present if not already
            const prefixedUrl = /^(https?:\/\/|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, prefixedUrl);
        }
    });
}, [editor, isLink]);

  const formatBlock = (type: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      
      const currentBlockTypeIsList = ['ul', 'ol', 'check'].includes(blockType);

      if (blockType === type && currentBlockTypeIsList) {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        return;
      }


      if (type === 'paragraph') {
        LexicalSelectionUtil.$setBlocksType(selection, () => $createParagraphNode());
      } else if (type === 'h1' || type === 'h2' || type === 'h3') {
        LexicalSelectionUtil.$setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
      } else if (type === 'ul') {
        editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      } else if (type === 'ol') {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      } else if (type === 'check') {
        editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
      } else if (type === 'quote') {
        LexicalSelectionUtil.$setBlocksType(selection, () => $createQuoteNode());
      } else if (type === 'code') {
        const langToSet = codeLanguage === 'plaintext' ? undefined : codeLanguage;
        LexicalSelectionUtil.$setBlocksType(selection, () => $createCodeNode(langToSet || getDefaultCodeLanguage()));
      }
    });
  };

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      editor.update(() => {
        const langToSet = value === 'plaintext' ? undefined : value;
        setCodeLanguage(value); 
        
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const codeBlockNode = $getNearestNodeOfType(node, $isCodeNode); 
            if (codeBlockNode && $isCodeNode(codeBlockNode)) {
                 codeBlockNode.setLanguage(langToSet);
            } else if (blockType === 'code') { 
                 LexicalSelectionUtil.$setBlocksType(selection, () => $createCodeNode(langToSet));
            }
        }
      });
    },
    [editor, blockType], 
  );


  const formatElement = (format: ElementFormatType | 'start' | 'end') => {
    let effectiveFormat: ElementFormatType = 'left'; 
    if (format === 'start') {
        effectiveFormat = 'left'; 
    } else if (format === 'end') {
        effectiveFormat = 'right'; 
    } else {
        effectiveFormat = format as ElementFormatType;
    }
    setElementFormat(effectiveFormat); 
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, effectiveFormat);
  };

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          LexicalSelectionUtil.$patchStyleText(selection, styles);
        }
      });
    },
    [editor],
  );

  const onFontFamilySelect = (family: string) => {
    setCurrentFontFamily(family);
    applyStyleText({ 'font-family': family });
  }
  const onFontSizeSelect = (size: string) => {
    setCurrentFontSize(size);
    applyStyleText({ 'font-size': size });
  }
  const onTextColorSelect = (color: string) => {
    setCurrentTextColor(color);
    applyStyleText({ color });
  }
  const onHighlightColorSelect = (color: string) => {
    setCurrentHighlightColor(color);
    applyStyleText({ 'background-color': color });
  }


  const transformTextCase = (textCase: 'uppercase' | 'lowercase' | 'capitalize') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const selectedText = selection.getTextContent();
        let transformedText = selectedText;
        if (textCase === 'uppercase') {
          transformedText = selectedText.toUpperCase();
        } else if (textCase === 'lowercase') {
          transformedText = selectedText.toLowerCase();
        } else if (textCase === 'capitalize') {
          transformedText = selectedText.replace(/\b\w/g, char => char.toUpperCase());
        }
        selection.insertText(transformedText);
      }
    });
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // LexicalSelectionUtil.$clearFormatting(selection); // This was causing issues
        // Manual style reset as a workaround:
        console.warn("$clearFormatting from @lexical/selection is currently commented out due to persistent build issues. Attempting manual style reset.");
        
        LexicalSelectionUtil.$patchStyleText(selection, {
          'font-family': `var(--font-roboto), sans-serif`, 
          'font-size': '16px',             
          'color': 'inherit',                
          'background-color': 'transparent', 
          'font-weight': '',                 
          'font-style': '',                  
          'text-decoration': '',             
        });
        // selection.removeText(); // This might be too aggressive, removes the text itself.
        
        // Attempt to reset block type to paragraph if it's a special block
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
  };


  const copyCodeContent = useCallback(() => {
    if (blockType === 'code') {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if($isRangeSelection(selection)){
            const node = getSelectedNode(selection);
            const codeNode = $getNearestNodeOfType(node, $isCodeNode); 
            if ($isCodeNode(codeNode)) {
                navigator.clipboard.writeText(codeNode.getTextContent())
                .then(() => toast({ title: "Code Copied!", description: "Content of the code block has been copied to clipboard." }))
                .catch(err => toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy code to clipboard." }));
                return;
            }
        }
        if(selectedElementKey){
             const node = $getNodeByKey(selectedElementKey);
             if($isCodeNode(node)){
                navigator.clipboard.writeText(node.getTextContent())
                .then(() => toast({ title: "Code Copied!", description: "Content of the code block has been copied to clipboard." }))
                .catch(err => toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy code to clipboard." }));
             }
        }
      });
    }
  }, [editor, blockType, selectedElementKey, toast]);


  const handleInsertTable = () => {
    const rows = parseInt(tableRows, 10);
    const columns = parseInt(tableColumns, 10);
    if (isNaN(rows) || isNaN(columns) || rows <= 0 || columns <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Table Dimensions',
        description: 'Please enter valid numbers for rows and columns.',
      });
      return;
    }
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {columns: columns.toString(), rows: rows.toString()});
    setIsInsertTableDialogOpen(false);
    setTableRows('3');
    setTableColumns('3');
  };

  const handleInsertImage = () => {
    const src = imageUrl.trim() || `https://placehold.co/400x300.png`;
    const alt = imageAltText.trim() || 'Placeholder image';
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {src, altText: alt, width: 400, height: 300});
    setIsInsertImageDialogOpen(false);
    setImageUrl('');
    setImageAltText('');
  };

  const handleGenerateText = async () => {
    if (!promptText.trim()) {
      toast({ variant: "destructive", title: "Prompt is empty", description: "Please enter a prompt to generate text." });
      return;
    }
    setIsGeneratingText(true);
    editor.focus(); 
    try {
      const result = await generateText({ prompt: promptText });
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(result.generatedText);
        } else {
          const root = $getRoot();
          const paragraphNode = $createParagraphNode().append($createTextNode(result.generatedText));
          root.append(paragraphNode);
          paragraphNode.selectEnd();
        }
      });
      toast({ title: "Text Generated!", description: "AI has generated text based on your prompt." });
    } catch (error: any) {
      console.error("AI text generation failed:", error);
      let description = "An unexpected error occurred.";
      if (error.message) {
        if (error.message.includes("429")) {
          description = "Rate limit exceeded. Please try again later.";
        } else if (error.message.toLowerCase().includes("safety policy") || error.message.toLowerCase().includes("blocked") || error.message.toLowerCase().includes("finish reason: safety")) {
          description = "Content generation blocked due to safety policy. Please revise your prompt.";
        } else {
          description = error.message;
        }
      }
      toast({ variant: "destructive", title: "AI Generation Failed", description });
    } finally {
      setIsGeneratingText(false);
      // Do not close dialog automatically: setIsGenAIDialogOpen(false);
    }
  };


  const currentAlignmentOption = ALIGNMENT_OPTIONS.find(opt => opt.value === elementFormat) || ALIGNMENT_OPTIONS[0];


  return (
    <div ref={toolbarRef} className="p-2 rounded-t-md border border-b-0 border-input bg-card flex flex-wrap items-center gap-1">
      <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} aria-label="Undo" title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} aria-label="Redo" title="Redo (Ctrl+Y)">
        <Redo className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2 h-9 min-w-[120px] text-sm justify-start" title="Block Type">
             <Pilcrow className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate w-[70px]">{blockTypeToBlockName[blockType] || 'Normal'}</span> <ChevronDown className="ml-auto h-4 w-4 opacity-50"/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => formatBlock('paragraph')} className={blockType === 'paragraph' ? 'bg-accent text-accent-foreground' : ''}>
            <Pilcrow className="mr-2 h-4 w-4" /> Normal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('h1')} className={blockType === 'h1' ? 'bg-accent text-accent-foreground' : ''}>
            <Heading1 className="mr-2 h-4 w-4" /> Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('h2')} className={blockType === 'h2' ? 'bg-accent text-accent-foreground' : ''}>
            <Heading2 className="mr-2 h-4 w-4" /> Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('h3')} className={blockType === 'h3' ? 'bg-accent text-accent-foreground' : ''}>
            <Heading3 className="mr-2 h-4 w-4" /> Heading 3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatBlock('ul')} className={blockType === 'ul' ? 'bg-accent text-accent-foreground' : ''}>
            <List className="mr-2 h-4 w-4" /> Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('ol')} className={blockType === 'ol' ? 'bg-accent text-accent-foreground' : ''}>
            <ListOrdered className="mr-2 h-4 w-4" /> Numbered List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('check')} className={blockType === 'check' ? 'bg-accent text-accent-foreground' : ''}>
            <ListChecks className="mr-2 h-4 w-4" /> Check List
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatBlock('quote')} className={blockType === 'quote' ? 'bg-accent text-accent-foreground' : ''}>
            <Quote className="mr-2 h-4 w-4" /> Quote
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('code')} className={blockType === 'code' ? 'bg-accent text-accent-foreground' : ''}>
            <Code className="mr-2 h-4 w-4" /> Code Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {blockType === 'code' && (
        <>
         <Select value={codeLanguage} onValueChange={onCodeLanguageSelect}>
          <SelectTrigger className="w-[140px] h-9 ml-1 text-xs" title="Select Code Language">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plaintext">Plain Text</SelectItem>
            {currentCodeLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>{CODE_LANGUAGE_FRIENDLY_NAME_MAP[lang] || lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={copyCodeContent} aria-label="Copy Code" title="Copy Code Block Content">
            <Copy className="h-4 w-4" />
        </Button>
        </>
      )}

      <Select value={currentFontFamily} onValueChange={onFontFamilySelect}>
        <SelectTrigger className="w-[120px] h-9 text-sm px-2" title="Font Family">
          <Type className="mr-1 h-4 w-4 shrink-0" />
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILY_OPTIONS.map(([displayName, cssName]) => ( 
            <SelectItem key={displayName} value={cssName} style={{fontFamily: cssName}}>
              {displayName} 
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentFontSize} onValueChange={onFontSizeSelect}>
        <SelectTrigger className="w-[80px] h-9 text-sm px-2" title="Font Size">
           <span className="truncate">{getNumericFontSize(currentFontSize)}</span>
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZE_OPTIONS.map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button variant={isBold ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} aria-label="Format Bold" title="Bold (Ctrl+B)">
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant={isItalic ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} aria-label="Format Italic" title="Italic (Ctrl+I)">
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant={isUnderline ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} aria-label="Format Underline" title="Underline (Ctrl+U)">
        <Underline className="h-4 w-4" />
      </Button>
       <Button variant={isStrikethrough ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} aria-label="Format Strikethrough" title="Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button variant={isCode ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} aria-label="Format Code" title="Inline Code">
        <Code className="h-4 w-4" />
      </Button>
      <Button variant={isLink ? 'secondary' : 'ghost'} size="icon" onClick={insertLink} aria-label="Insert Link" title="Insert/Edit Link">
        <Link2 className="h-4 w-4" />
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Text Color">
            <Palette className="h-4 w-4" style={{color: currentTextColor === 'inherit' || currentTextColor.startsWith('hsl(var(--foreground))') ? 'currentColor' : currentTextColor }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          {COLOR_PALETTE.map(color => (
            <DropdownMenuItem key={color.name} onClick={() => onTextColorSelect(color.value)} className={currentTextColor === color.value ? 'bg-accent text-accent-foreground' : ''}>
              <div className="w-4 h-4 rounded-full border mr-2" style={{backgroundColor: color.isThemeVar && color.value !== 'inherit' ? `var(${color.value.slice(4,-1)})` : color.value, borderColor: 'hsl(var(--border))'}}></div>
              {color.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Highlight Color">
             <Highlighter className="h-4 w-4" style={{ color: currentHighlightColor === 'transparent' || currentHighlightColor === 'inherit' ? 'currentColor' : 'hsl(var(--accent))', fillOpacity: currentHighlightColor !== 'transparent' && currentHighlightColor !== 'inherit' ? 0.3 : 0 }}/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
           <DropdownMenuItem onClick={() => onHighlightColorSelect('transparent')} className={currentHighlightColor === 'transparent' ? 'bg-accent text-accent-foreground' : ''}>
             <div className="w-4 h-4 rounded-full border mr-2 flex items-center justify-center" style={{borderColor: 'hsl(var(--border))'}}><Eraser className="h-3 w-3 opacity-50"/></div>
              None
            </DropdownMenuItem>
          {COLOR_PALETTE.filter(c => c.value !== 'inherit').map(color => ( 
            <DropdownMenuItem key={color.name + '-bg'} onClick={() => onHighlightColorSelect(color.value)} className={currentHighlightColor === color.value ? 'bg-accent text-accent-foreground' : ''}>
              <div className="w-4 h-4 rounded-full border mr-2" style={{backgroundColor: color.isThemeVar ? `var(${color.value.slice(4,-1)})` : color.value, borderColor: 'hsl(var(--border))'}}></div>
              {color.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Change Case">
            <CaseSensitive className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => transformTextCase('lowercase')}>
             lowercase
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transformTextCase('uppercase')}>
             UPPERCASE
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transformTextCase('capitalize')}>
             Capitalize Case
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" onClick={clearFormatting} aria-label="Clear Formatting" title="Clear Formatting">
        <Eraser className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      <Dialog open={isGenAIDialogOpen} onOpenChange={setIsGenAIDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Generate Text with AI">
            <Sparkles className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Text with AI</DialogTitle>
            <DialogDescription>
              Enter a prompt and let AI generate text for you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="ai-prompt">Prompt</Label>
            <Input
              id="ai-prompt"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g., Write a short story about a dragon..."
            />
          </div>
          <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsGenAIDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleGenerateText} disabled={isGeneratingText}>
              {isGeneratingText && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isInsertTableDialogOpen || isInsertImageDialogOpen} onOpenChange={(open) => {
          if (!open) {
              setIsInsertTableDialogOpen(false);
              setIsInsertImageDialogOpen(false);
          }
      }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="px-2 h-9 text-sm justify-start" title="Insert">
              <PlusSquare className="mr-2 h-4 w-4 shrink-0" /> Insert <ChevronDown className="ml-auto h-4 w-4 opacity-50"/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}>
              <Minus className="mr-2 h-4 w-4" /> Horizontal Rule
            </DropdownMenuItem>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsInsertTableDialogOpen(true); }}>
                  <TableIcon className="mr-2 h-4 w-4" /> Table
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsInsertImageDialogOpen(true); }}>
                  <ImageIcon className="mr-2 h-4 w-4" /> Image
              </DropdownMenuItem>
            </DialogTrigger>
            <DropdownMenuItem
              onClick={() => {
                editor.dispatchCommand(INSERT_EQUATION_COMMAND, { showModal: true });
              }}
            >
              <Calculator className="mr-2 h-4 w-4" /> Equation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {isInsertTableDialogOpen && (
          <DialogContent className="sm:max-w-xs">
            <DialogHeader><DialogTitle>Insert Table</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="table-rows" className="text-right col-span-1">Rows</Label>
                <Input id="table-rows" type="number" value={tableRows} onChange={(e) => setTableRows(e.target.value)} className="col-span-3" min="1" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="table-columns" className="text-right col-span-1">Columns</Label>
                <Input id="table-columns" type="number" value={tableColumns} onChange={(e) => setTableColumns(e.target.value)} className="col-span-3" min="1" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInsertTableDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleInsertTable}>Insert</Button>
            </DialogFooter>
          </DialogContent>
        )}

        {isInsertImageDialogOpen && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Insert Image</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image-url" className="text-right col-span-1">URL</Label>
                <Input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" placeholder="https://placehold.co/400x300.png" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image-alt" className="text-right col-span-1">Alt Text</Label>
                <Input id="image-alt" value={imageAltText} onChange={(e) => setImageAltText(e.target.value)} className="col-span-3" placeholder="Descriptive text" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInsertImageDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={handleInsertImage}>Insert</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2 h-9 min-w-[120px] text-sm justify-start" title="Alignment">
            <currentAlignmentOption.icon className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate w-[70px]">{currentAlignmentOption.label}</span> <ChevronDown className="ml-auto h-4 w-4 opacity-50"/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {ALIGNMENT_OPTIONS.filter(opt => ['left', 'center', 'right', 'justify'].includes(opt.value)).map(opt => ( 
            <DropdownMenuItem
              key={opt.value}
              onClick={() => formatElement(opt.value)}
              className={elementFormat === opt.value || (opt.value === 'start' && elementFormat === 'left') || (opt.value === 'end' && elementFormat === 'right') ? 'bg-accent text-accent-foreground' : ''}
            >
              <opt.icon className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">{opt.label}</span>
              {opt.shortcut && <span className="text-xs text-muted-foreground ml-auto">{opt.shortcut}</span>}
            </DropdownMenuItem>
          ))}
           <DropdownMenuItem
              onClick={() => formatElement('start')}
              className={elementFormat === 'left' ? 'bg-accent text-accent-foreground' : ''} 
            >
              <AlignLeft className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">Start Align</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => formatElement('end')}
              className={elementFormat === 'right' ? 'bg-accent text-accent-foreground' : ''} 
            >
              <AlignRight className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">End Align</span>
            </DropdownMenuItem>
          <DropdownMenuSeparator />
           <DropdownMenuItem onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>
              <Outdent className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">Outdent</span>
              <span className="text-xs text-muted-foreground ml-auto">Ctrl+[</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
              <Indent className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">Indent</span>
              <span className="text-xs text-muted-foreground ml-auto">Ctrl+]</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}
