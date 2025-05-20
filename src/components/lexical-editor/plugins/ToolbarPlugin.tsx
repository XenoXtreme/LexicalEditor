
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
import { $isCodeNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, /* CODE_LANGUAGE_MAP, */ $createCodeNode, getCodeLanguages, getDefaultCodeLanguage, CodeNode } from '@lexical/code'; // CODE_LANGUAGE_MAP removed as it's not directly used
import { $getNearestNodeOfType, mergeRegister, $findMatchingParent } from '@lexical/utils';
import { $createHeadingNode, $isHeadingNode, $createQuoteNode, $isQuoteNode as isQuoteNodeLexical, HeadingTagType /* QuoteNode removed */ } from '@lexical/rich-text';
import * as LexicalSelectionUtil from '@lexical/selection'; // Using namespace import


import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $createImageNode, ImageNode } from '../nodes/ImageNode.tsx';
import { INSERT_EQUATION_COMMAND } from './EquationPlugin';


import {
  Bold, Italic, Underline, Code, Link2, List, ListOrdered, ListChecks, Quote, Pilcrow, Heading1, Heading2, Heading3, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, CaseSensitive, Eraser, Copy, Type, ChevronDown, Highlighter, PlusSquare, Minus, TableIcon, Image as ImageIcon, Sparkles, Loader2, Indent, Outdent, Calculator,CaseLower, CaseUpper, Subscript, Superscript, Strikethrough as StrikethroughIcon, Baseline
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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

const ALIGNMENT_OPTIONS: { value: ElementFormatType | 'start' | 'end'; label: string; icon: React.ElementType }[] = [
  { value: 'left', label: 'Left Align', icon: AlignLeft },
  { value: 'center', label: 'Center Align', icon: AlignCenter },
  { value: 'right', label: 'Right Align', icon: AlignRight },
  { value: 'justify', label: 'Justify Align', icon: AlignJustify },
  { value: 'start', label: 'Start Align', icon: AlignLeft },
  { value: 'end', label: 'End Align', icon: AlignRight },
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
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isHighlight, setIsHighlight] = useState(false); // For default highlight format
  const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');

  const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
  const [currentFontFamily, setCurrentFontFamily] = useState<string>(`var(--font-roboto), sans-serif`);
  const [currentTextColor, setCurrentTextColor] = useState<string>('inherit');
  const [currentHighlightColor, setCurrentHighlightColor] = useState<string>('transparent'); // For color picker

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
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }
      
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsCode(selection.hasFormat('code'));
      setIsHighlight(selection.hasFormat('highlight'));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }
      
      // Update block type
      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        const nearestList = $getNearestNodeOfType(anchorNode, ListNode);
        if (nearestList) {
            setBlockType(nearestList.getListType());
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : ($isCodeNode(element) ? 'code' : (isQuoteNodeLexical(element) ? 'quote' : element.getType()));

          if (type in blockTypeToBlockName || supportedBlockTypes.has(type)) {
             setBlockType(type);
          } else {
            setBlockType('paragraph'); // Default if unknown
          }

          if ($isCodeNode(element)) {
            const language = element.getLanguage() as keyof typeof CODE_LANGUAGE_FRIENDLY_NAME_MAP;
            setCodeLanguage(language || getDefaultCodeLanguage() || 'plaintext');
          }
        }
      }
      
      // Handle buttons commands
      let matchingParent = $findMatchingParent(
        anchorNode,
        (node) => $isCodeNode(node) || $isListNode(node)
      );
      if(matchingParent && $isCodeNode(matchingParent)){
        setCodeLanguage(matchingParent.getLanguage() || getDefaultCodeLanguage() || 'plaintext');
      }


      setCurrentFontSize(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-size', '16px'));
      setCurrentFontFamily(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-family', `var(--font-roboto), sans-serif`));
      setCurrentTextColor(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'color', 'inherit'));
      setCurrentHighlightColor(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'background-color', 'transparent'));
      
      // Element format (alignment)
      if (typeof (element as any).getFormatType === 'function') {
        setElementFormat((element as any).getFormatType());
      } else {
        let parentWithFormat = $findMatchingParent(anchorNode, (n) => typeof (n as any).getFormatType === 'function');
        if (parentWithFormat && typeof (parentWithFormat as any).getFormatType === 'function') {
          setElementFormat((parentWithFormat as any).getFormatType());
        } else {
          setElementFormat('left');
        }
      }
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
        let isCurrentlyLink = false;

        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const parent = node.getParent();
            if ($isLinkNode(parent)) {
                existingUrl = parent.getURL();
                isCurrentlyLink = true;
            } else if ($isLinkNode(node)) {
                existingUrl = node.getURL();
                isCurrentlyLink = true;
            }
        }

        const url = window.prompt(isCurrentlyLink ? 'Edit link URL (leave empty to remove):' : 'Enter link URL:', existingUrl || 'https://');
        
        if (url === null) { 
            return;
        }
        if (url === '' && isCurrentlyLink) { 
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        } else if (url !== '') {
            const prefixedUrl = /^(https?:\/\/|mailto:|tel:)/i.test(url) ? url : `https://`;
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, prefixedUrl);
        }
    });
}, [editor]);

  const formatBlock = (type: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      
      const currentBlockIsList = ['ul', 'ol', 'check'].includes(blockType);

      if ((blockType === type && currentBlockIsList) || (type === 'paragraph' && currentBlockIsList)) {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        if (type !== 'paragraph' && !currentBlockIsList) { 
           setTimeout(() => {
            editor.update(() => {
                const newSelection = $getSelection();
                if ($isRangeSelection(newSelection)) {
                     applySpecificBlockFormat(type, newSelection);
                }
            });
           }, 0);
        } else if (type !== 'paragraph' && blockType !== type) { 
             setTimeout(() => {
                editor.update(() => {
                    const newSelection = $getSelection();
                    if ($isRangeSelection(newSelection)) {
                        applySpecificBlockFormat(type, newSelection); 
                    }
                });
            }, 0);
        }
        return;
      }

      if (currentBlockIsList && type !== 'paragraph' && !['ul', 'ol', 'check'].includes(type)) {
         editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
         setTimeout(() => {
            editor.update(() => {
                const newSelection = $getSelection();
                if ($isRangeSelection(newSelection)) {
                     applySpecificBlockFormat(type, newSelection);
                }
            });
           }, 0);
        return;
      }
      
      applySpecificBlockFormat(type, selection);
    });
  };

  const applySpecificBlockFormat = (type: string, selection: any) => {
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
  }

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      editor.update(() => {
        const langToSet = value === 'plaintext' ? undefined : value;
        
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const codeBlockNode = $getNearestNodeOfType(node, CodeNode); 
            if (codeBlockNode && $isCodeNode(codeBlockNode)) {
                 codeBlockNode.setLanguage(langToSet as string);
            } else if (blockType === 'code') { 
                 // Handled by formatBlock if this is part of creating a new code block
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
    applyStyleText({ 'font-family': family });
  }
  const onFontSizeSelect = (size: string) => {
    applyStyleText({ 'font-size': size });
  }
  const onTextColorSelect = (color: string) => {
    applyStyleText({ color });
  }
  const onHighlightColorSelect = (color: string) => {
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
        // console.warn("$clearFormatting from @lexical/selection is commented out. Attempting manual style reset.");
        // LexicalSelectionUtil.$clearFormatting(selection); // Re-enable this if module resolution issue is fixed

        console.warn("Lexical's $clearFormatting utility is currently unavailable due to a build issue. Performing a limited manual format clearing. Please check project setup for @lexical/selection module resolution.");

        // Manual reset as a fallback or to cover aspects $clearFormatting might miss
        LexicalSelectionUtil.$patchStyleText(selection, {
          'font-family': `var(--font-roboto), sans-serif`, 
          'font-size': '16px',             
          'color': 'inherit',                
          'background-color': 'transparent', 
          'font-weight': '',                 
          'font-style': '',                  
          'text-decoration': '',             
        });
        // Clear bold, italic, underline, strikethrough, subscript, superscript, code, highlight formats
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
  };


  const copyCodeContent = useCallback(() => {
    if (blockType === 'code') {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if($isRangeSelection(selection)){
            const node = getSelectedNode(selection);
            const codeBlockNode = $getNearestNodeOfType(node, CodeNode); 
            if ($isCodeNode(codeBlockNode)) {
                navigator.clipboard.writeText(codeBlockNode.getTextContent())
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
    <div ref={toolbarRef} className="p-2 rounded-t-md border border-b-0 border-input bg-card flex flex-wrap items-center gap-1 text-sm sm:text-base">
      <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} aria-label="Undo" title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} aria-label="Redo" title="Redo (Ctrl+Y)">
        <Redo className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2 h-9 min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm justify-start" title="Block Type">
             <Pilcrow className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate w-[50px] sm:w-[70px]">{blockTypeToBlockName[blockType] || 'Normal'}</span> <ChevronDown className="ml-auto h-4 w-4 opacity-50"/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="overflow-y-auto">
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
          <SelectTrigger className="w-[120px] sm:w-[140px] h-9 ml-1 text-xs" title="Select Code Language">
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
        <SelectTrigger className="w-[100px] sm:w-[120px] h-9 text-xs sm:text-sm px-2" title="Font Family">
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
        <SelectTrigger className="w-[70px] sm:w-[80px] h-9 text-xs sm:text-sm px-2" title="Font Size">
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

      {/* Consolidated Text Formatting Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Text Formatting">
            <Baseline className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="start">
          <DropdownMenuCheckboxItem checked={isBold} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>
            <Bold className="mr-2 h-4 w-4" /> Bold
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isItalic} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>
            <Italic className="mr-2 h-4 w-4" /> Italic
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isUnderline} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}>
            <Underline className="mr-2 h-4 w-4" /> Underline
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isStrikethrough} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}>
            <StrikethroughIcon className="mr-2 h-4 w-4" /> Strikethrough
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={isSubscript} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')}>
            <Subscript className="mr-2 h-4 w-4" /> Subscript
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isSuperscript} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')}>
            <Superscript className="mr-2 h-4 w-4" /> Superscript
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isCode} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}>
            <Code className="mr-2 h-4 w-4" /> Inline Code
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
           <DropdownMenuCheckboxItem checked={isHighlight} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight')}>
            <Highlighter className="mr-2 h-4 w-4" /> Highlight Text
          </DropdownMenuCheckboxItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="mr-2 h-4 w-4" style={{color: currentTextColor === 'inherit' || currentTextColor.startsWith('hsl(var(--foreground))') ? 'currentColor' : currentTextColor }}/> Text Color
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48 max-h-60 overflow-y-auto">
                {COLOR_PALETTE.map(color => (
                  <DropdownMenuItem key={color.name + '-text'} onClick={() => onTextColorSelect(color.value)} className={currentTextColor === color.value ? 'bg-accent text-accent-foreground' : ''}>
                    <div className="w-4 h-4 rounded-full border mr-2" style={{backgroundColor: color.isThemeVar && color.value !== 'inherit' ? `var(${color.value.slice(4,-1)})` : color.value, borderColor: 'hsl(var(--border))'}}></div>
                    {color.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Highlighter className="mr-2 h-4 w-4" style={{ color: currentHighlightColor === 'transparent' || currentHighlightColor === 'inherit' ? 'currentColor' : 'hsl(var(--accent))', fillOpacity: currentHighlightColor !== 'transparent' && currentHighlightColor !== 'inherit' ? 0.3 : 0 }} /> Highlight Color
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-48 max-h-60 overflow-y-auto">
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
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
           <DropdownMenuItem onClick={insertLink}>
            <Link2 className="mr-2 h-4 w-4" /> {isLink ? 'Edit Link' : 'Insert Link'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
                <CaseSensitive className="mr-2 h-4 w-4" /> Change Case
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => transformTextCase('lowercase')}>
                        <CaseLower className="mr-2 h-4 w-4" /> lowercase
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => transformTextCase('uppercase')}>
                        <CaseUpper className="mr-2 h-4 w-4" /> UPPERCASE
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => transformTextCase('capitalize')}>
                        <CaseSensitive className="mr-2 h-4 w-4" /> Capitalize Case
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={clearFormatting}>
            <Eraser className="mr-2 h-4 w-4" /> Clear Formatting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
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
            <Button variant="ghost" className="px-2 h-9 text-sm sm:text-sm justify-start" title="Insert">
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
          <Button variant="ghost" className="px-2 h-9 min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm justify-start" title="Alignment">
            <currentAlignmentOption.icon className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate w-[50px] sm:w-[70px]">{currentAlignmentOption.label}</span> <ChevronDown className="ml-auto h-4 w-4 opacity-50"/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {ALIGNMENT_OPTIONS.filter(opt => ['left', 'center', 'right', 'justify'].includes(opt.value)).map(opt => ( 
            <DropdownMenuItem
              key={opt.value}
              onClick={() => formatElement(opt.value as ElementFormatType)}
              className={elementFormat === opt.value ? 'bg-accent text-accent-foreground' : ''}
            >
              <opt.icon className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">{opt.label}</span>
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
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
              <Indent className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">Indent</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}


