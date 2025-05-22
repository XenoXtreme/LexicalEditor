
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
  $createParagraphNode,
  $getNodeByKey,
  COMMAND_PRIORITY_LOW,
  ElementFormatType,
  $getRoot,
  $createTextNode,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  LexicalCommand,
  createCommand,
  $isRootOrShadowRoot,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND, $createLinkNode, $isAutoLinkNode } from '@lexical/link';
import { $isListItemNode, $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND, ListNode } from '@lexical/list';
import { $isCodeNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, $createCodeNode, getCodeLanguages, getDefaultCodeLanguage, CodeNode } from '@lexical/code';
import { $getNearestNodeOfType, mergeRegister, $findMatchingParent } from '@lexical/utils';
import { $createHeadingNode, $isHeadingNode, $createQuoteNode, $isQuoteNode as isQuoteNodeLexical, HeadingTagType } from '@lexical/rich-text';
import * as LexicalSelectionUtil from '@lexical/selection';


import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $createImageNode, ImageNode } from '../nodes/ImageNode.tsx';
import { INSERT_EQUATION_COMMAND } from './EquationPlugin';
import { INSERT_COLLAPSIBLE_COMMAND } from './Collapsible';


import {
  Bold, Italic, Underline, Code as CodeIcon, Link2, List, ListOrdered, ListChecks, Quote, Pilcrow, Heading1, Heading2, Heading3, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, CaseSensitive, Eraser, Copy, Type, ChevronDown, Highlighter, PlusSquare, Minus, TableIcon, Image as ImageIconLucide, Sparkles, Loader2, Indent, Outdent, Calculator, CaseLower, CaseUpper, Subscript, Superscript, Strikethrough as StrikethroughIcon, Baseline, ChevronsUpDown, UploadCloud
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
  DropdownMenuShortcut,
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

// Custom Commands
export const OPEN_LINK_DIALOG_COMMAND: LexicalCommand<void> = createCommand('OPEN_LINK_DIALOG_COMMAND');
export const CUSTOM_CLEAR_FORMATTING_COMMAND: LexicalCommand<void> = createCommand('CUSTOM_CLEAR_FORMATTING_COMMAND');
export type TextCaseType = 'uppercase' | 'lowercase' | 'capitalize';
export const CUSTOM_TRANSFORM_TEXT_CASE_COMMAND: LexicalCommand<TextCaseType> = createCommand('CUSTOM_TRANSFORM_TEXT_CASE_COMMAND');


export type InsertImagePayload = {
  altText: string;
  src: string;
  width?: number;
  height?: number;
  showModal?: boolean; // To trigger dialog opening
};
export const INSERT_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand('INSERT_IMAGE_COMMAND');

export type InsertTablePayload = {
  columns: string;
  rows: string;
  showModal?: boolean; // To trigger dialog opening
};
export const INSERT_TABLE_DIALOG_COMMAND: LexicalCommand<void> = createCommand('INSERT_TABLE_DIALOG_COMMAND');


const LowPriority = COMMAND_PRIORITY_LOW;

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
  [`Arial`, `Arial, sans-serif`],
  [`Courier New`, `'Courier New', Courier, monospace`],
  [`Georgia`, `Georgia, serif`],
  [`Times New Roman`, `'Times New Roman', Times, serif`],
  [`Trebuchet MS`, `'Trebuchet MS', Helvetica, sans-serif`],
  [`Verdana`, `Verdana, Geneva, sans-serif`],
  [`Roboto`, `var(--font-roboto), sans-serif`],
  [`Open Sans`, `var(--font-open-sans), sans-serif`],
  [`Lato`, `var(--font-lato), sans-serif`],
  [`Montserrat`, `var(--font-montserrat), sans-serif`],
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

const getNumericFontSize = (fontSize: string) => {
  const match = fontSize.match(/^(\d+)/);
  return match ? match[1] : fontSize.replace('px', '');
};

const COLOR_PALETTE: { name: string; value: string; isThemeVar?: boolean }[] = [
  { name: 'Default', value: 'inherit' },
  { name: 'Black', value: 'hsl(var(--foreground))', isThemeVar: true },
  { name: 'Primary', value: 'hsl(var(--primary))', isThemeVar: true },
  { name: 'Secondary Text', value: 'hsl(var(--secondary-foreground))', isThemeVar: true },
  { name: 'Accent', value: 'hsl(var(--accent))', isThemeVar: true },
  { name: 'Destructive', value: 'hsl(var(--destructive))', isThemeVar: true },
  { name: 'Red', value: '#DB4437' }, { name: 'Dark Red', value: '#A52714' },
  { name: 'Green', value: '#0F9D58' }, { name: 'Dark Green', value: '#0B8043' },
  { name: 'Blue', value: '#4285F4' }, { name: 'Dark Blue', value: '#1A73E8'},
  { name: 'Yellow', value: '#F4B400' }, { name: 'Gold', value: '#E69138' },
  { name: 'Purple', value: '#5E35B1'}, { name: 'Dark Purple', value: '#311B92'},
  { name: 'Pink', value: '#D81B60'}, { name: 'Magenta', value: '#8E24AA'},
  { name: 'Orange', value: '#F57C00'}, { name: 'Dark Orange', value: '#E65100'},
  { name: 'Teal', value: '#00897B'}, { name: 'Cyan', value: '#00BCD4'},
  { name: 'Gray', value: '#757575'}, { name: 'Dark Gray', value: '#424242'}
];

const ALIGNMENT_OPTIONS: { value: ElementFormatType | 'start' | 'end'; label: string; icon: React.ElementType, shortcut?: string }[] = [
  { value: 'left', label: 'Left Align', icon: AlignLeft, shortcut: 'Ctrl+Shift+L' },
  { value: 'center', label: 'Center Align', icon: AlignCenter, shortcut: 'Ctrl+Shift+E' },
  { value: 'right', label: 'Right Align', icon: AlignRight, shortcut: 'Ctrl+Shift+R' },
  { value: 'justify', label: 'Justify Align', icon: AlignJustify, shortcut: 'Ctrl+Shift+J' },
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkDialogUrl, setLinkDialogUrl] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);


  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isGenAIDialogOpen, setIsGenAIDialogOpen] = useState(false);


  const { toast } = useToast();

  const openLinkDialog = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      let urlToEdit = 'https://';
      let editing = false;
      if ($isRangeSelection(selection)) {
        const node = getSelectedNode(selection);
        const parentLink = $findMatchingParent(node, (n) => $isLinkNode(n) || $isAutoLinkNode(n));
        if (parentLink && ($isLinkNode(parentLink) || $isAutoLinkNode(parentLink))) {
          urlToEdit = parentLink.getURL();
          editing = true;
        } else if (($isLinkNode(node) || $isAutoLinkNode(node))) {
          urlToEdit = node.getURL();
          editing = true;
        }
      }
      setLinkDialogUrl(urlToEdit);
      setIsEditingLink(editing);
    });
    setIsLinkDialogOpen(true);
  }, [editor]);


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

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsCode(selection.hasFormat('code'));
      setIsHighlight(selection.hasFormat('highlight'));

      const node = getSelectedNode(selection);
      const parentLink = $findMatchingParent(node, (n) => $isLinkNode(n) || $isAutoLinkNode(n));
      setIsLink(!!parentLink || $isLinkNode(node) || $isAutoLinkNode(node));
      
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
            setBlockType('paragraph');
          }

          if ($isCodeNode(element)) {
            const language = element.getLanguage() as keyof typeof CODE_LANGUAGE_FRIENDLY_NAME_MAP;
            setCodeLanguage(language || getDefaultCodeLanguage() || 'plaintext');
          }
        }
      }
      
      setCurrentFontSize(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-size', '16px'));
      setCurrentFontFamily(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-family', `var(--font-roboto), sans-serif`));
      setCurrentTextColor(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'color', 'inherit'));
      setCurrentHighlightColor(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'background-color', 'transparent'));
      
      let formatableNode: any = element;
      if (typeof formatableNode.getFormatType !== 'function') {
        formatableNode = $findMatchingParent(anchorNode, (n) => typeof (n as any).getFormatType === 'function');
      }
      if (formatableNode && typeof formatableNode.getFormatType === 'function') {
        setElementFormat(formatableNode.getFormatType());
      } else {
        setElementFormat('left');
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
      editor.registerCommand<InsertImagePayload>(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          if (payload.showModal) {
            setIsInsertImageDialogOpen(true);
            return true;
          }
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
      ),
      editor.registerCommand(OPEN_LINK_DIALOG_COMMAND, () => {
        openLinkDialog();
        return true;
      }, LowPriority),
      editor.registerCommand(INSERT_TABLE_DIALOG_COMMAND, () => {
        setIsInsertTableDialogOpen(true);
        return true;
      }, LowPriority)
    );
  }, [editor, updateToolbar, openLinkDialog]);


const handleLinkDialogSubmit = useCallback(() => {
    if (linkDialogUrl.trim() === '' || linkDialogUrl.trim() === 'https://') {
         editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
        let prefixedUrl = linkDialogUrl;
        if (!/^(https?:\/\/|mailto:|tel:|data:)/i.test(prefixedUrl)) { // Allow data URI
            prefixedUrl = `https://${prefixedUrl}`;
        }
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, prefixedUrl);
    }
    setIsLinkDialogOpen(false);
    setLinkDialogUrl('');
    setIsEditingLink(false);
}, [editor, linkDialogUrl]);


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
        setCodeLanguage(value); 
        
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const node = getSelectedNode(selection);
            const codeBlockNode = $getNearestNodeOfType(node, CodeNode); 
            if (codeBlockNode && $isCodeNode(codeBlockNode)) {
                 codeBlockNode.setLanguage(langToSet as string);
            } else { 
                 LexicalSelectionUtil.$setBlocksType(selection, () => $createCodeNode(langToSet || getDefaultCodeLanguage()));
            }
        }
      });
    },
    [editor], 
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

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            setImageUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    } else {
        setImageFile(null);
        // Optionally clear imageUrl if no file is selected, or keep previous URL
        // setImageUrl(''); 
    }
  };

  const handleInsertImage = () => {
    let srcToInsert = imageUrl.trim();
    if (!srcToInsert && !imageFile) { // If both URL and file are empty, use placeholder
        srcToInsert = 'https://placehold.co/400x300.png';
    } else if (!srcToInsert && imageFile) { // If URL is empty but file is present, imageUrl state should have dataURI
        // imageUrl is already set by handleImageFileChange
    }
    // If srcToInsert is still empty here, it means imageFile was null and imageUrl was also cleared or empty.
    // This case should be handled by the placeholder logic above.
    
    const alt = imageAltText.trim() || 'Placeholder image';
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {src: srcToInsert, altText: alt, width: 400, height: 300});
    setIsInsertImageDialogOpen(false);
    setImageUrl('');
    setImageAltText('');
    setImageFile(null);
    const fileInput = document.getElementById('image-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
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
      // setIsGenAIDialogOpen(false); // Keep dialog open based on preference
    }
  };

  const currentAlignmentOption = ALIGNMENT_OPTIONS.find(opt => opt.value === elementFormat) || ALIGNMENT_OPTIONS[0];

  return (
    <div ref={toolbarRef} className="p-2 rounded-t-md border border-b-0 border-input bg-card flex flex-wrap items-center gap-1 text-sm sm:text-base">
      <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} aria-label="Undo" title="Undo">
        <Undo className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} aria-label="Redo" title="Redo">
        <Redo className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <Select value={blockType} onValueChange={formatBlock}>
        <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-xs sm:text-sm px-2" title="Block Type">
             <Pilcrow className="mr-1 h-4 w-4 shrink-0" /> <span className="truncate w-[70px] sm:w-[90px]">{blockTypeToBlockName[blockType] || 'Normal'}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph"><Pilcrow className="mr-2 h-4 w-4 inline-block"/> Normal</SelectItem>
          <SelectItem value="h1"><Heading1 className="mr-2 h-4 w-4 inline-block"/> Heading 1</SelectItem>
          <SelectItem value="h2"><Heading2 className="mr-2 h-4 w-4 inline-block"/> Heading 2</SelectItem>
          <SelectItem value="h3"><Heading3 className="mr-2 h-4 w-4 inline-block"/> Heading 3</SelectItem>
          <SelectItem value="ul"><List className="mr-2 h-4 w-4 inline-block"/> Bullet List</SelectItem>
          <SelectItem value="ol"><ListOrdered className="mr-2 h-4 w-4 inline-block"/> Numbered List</SelectItem>
          <SelectItem value="check"><ListChecks className="mr-2 h-4 w-4 inline-block"/> Check List</SelectItem>
          <SelectItem value="quote"><Quote className="mr-2 h-4 w-4 inline-block"/> Quote</SelectItem>
          <SelectItem value="code"><CodeIcon className="mr-2 h-4 w-4 inline-block"/> Code Block</SelectItem>
        </SelectContent>
      </Select>
      
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

      <Button variant="ghost" size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} aria-pressed={isUnderline} title="Underline (Ctrl+U)">
        <Underline className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} aria-pressed={isCode} title="Inline Code">
        <CodeIcon className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => editor.dispatchCommand(OPEN_LINK_DIALOG_COMMAND, undefined)} aria-pressed={isLink} title="Insert/Edit Link (Ctrl+K)">
        <Link2 className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Text Color">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2">
            <div className="grid grid-cols-8 gap-1">
                {COLOR_PALETTE.map(color => (
                <Button
                    key={color.name + '-text'}
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 rounded-full border-2 p-0"
                    style={{
                    backgroundColor: color.isThemeVar && color.value !== 'inherit' ? `var(${color.value.slice(4,-1)})` : color.value,
                    borderColor: currentTextColor === color.value ? 'hsl(var(--ring))' : 'hsl(var(--border))'
                    }}
                    onClick={() => onTextColorSelect(color.value)}
                    title={color.name}
                >
                    {color.value === 'inherit' && <Eraser className="h-3 w-3 opacity-50"/>}
                </Button>
                ))}
            </div>
        </DropdownMenuContent>
      </DropdownMenu>

       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Highlight Color">
            <Highlighter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-2">
             <div className="grid grid-cols-8 gap-1">
                  <Button
                      key={'no-highlight'}
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 rounded-full border-2 p-0 flex items-center justify-center"
                      style={{ borderColor: currentHighlightColor === 'transparent' ? 'hsl(var(--ring))' : 'hsl(var(--border))'}}
                      onClick={() => onHighlightColorSelect('transparent')}
                      title="None"
                  >
                      <Eraser className="h-3 w-3 opacity-50"/>
                  </Button>
                  {COLOR_PALETTE.filter(c => c.value !== 'inherit' && c.value !== 'hsl(var(--foreground))' && c.value !== 'hsl(var(--primary))').map(color => (
                      <Button
                          key={color.name + '-bg'}
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-full border-2 p-0"
                          style={{
                              backgroundColor: color.isThemeVar ? `var(${color.value.slice(4,-1)})` : color.value,
                              borderColor: currentHighlightColor === color.value ? 'hsl(var(--ring))' : 'hsl(var(--border))'
                          }}
                          onClick={() => onHighlightColorSelect(color.value)}
                          title={color.name}
                      />
                  ))}
                </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* "Aa" Dropdown for More Formatting Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="More text formatting">
            <CaseSensitive className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="start">
          <DropdownMenuCheckboxItem checked={isBold} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}>
            <Bold className="mr-2 h-4 w-4" /> Bold <DropdownMenuShortcut>Ctrl+B</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isItalic} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}>
            <Italic className="mr-2 h-4 w-4" /> Italic <DropdownMenuShortcut>Ctrl+I</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isStrikethrough} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}>
            <StrikethroughIcon className="mr-2 h-4 w-4" /> Strikethrough <DropdownMenuShortcut>Ctrl+Shift+X</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isSubscript} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')}>
            <Subscript className="mr-2 h-4 w-4" /> Subscript <DropdownMenuShortcut>Ctrl+,</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isSuperscript} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')}>
            <Superscript className="mr-2 h-4 w-4" /> Superscript <DropdownMenuShortcut>Ctrl+.</DropdownMenuShortcut>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={isHighlight} onCheckedChange={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight')}>
            <Highlighter className="mr-2 h-4 w-4" /> Highlight Text
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CaseSensitive className="mr-2 h-4 w-4" /> Change Case
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
                <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => editor.dispatchCommand(CUSTOM_TRANSFORM_TEXT_CASE_COMMAND, 'lowercase')}>
                        <CaseLower className="mr-2 h-4 w-4" /> lowercase
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.dispatchCommand(CUSTOM_TRANSFORM_TEXT_CASE_COMMAND, 'uppercase')}>
                        <CaseUpper className="mr-2 h-4 w-4" /> UPPERCASE
                        <DropdownMenuShortcut>Ctrl+Shift+U</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => editor.dispatchCommand(CUSTOM_TRANSFORM_TEXT_CASE_COMMAND, 'capitalize')}>
                        <CaseSensitive className="mr-2 h-4 w-4" /> Capitalize Case
                    </DropdownMenuItem>
                </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator/>
          <DropdownMenuItem onClick={() => editor.dispatchCommand(CUSTOM_CLEAR_FORMATTING_COMMAND, undefined)}>
            <Eraser className="mr-2 h-4 w-4" /> Clear Formatting <DropdownMenuShortcut>Ctrl+\</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={isGenAIDialogOpen} onOpenChange={setIsGenAIDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Generate Text with AI">
            <Sparkles className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Text with AI</DialogTitle>
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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2 h-9 text-sm sm:text-base justify-start min-w-[90px] sm:min-w-[100px]" title="Insert">
            <PlusSquare className="mr-2 h-4 w-4 shrink-0" /> Insert <ChevronDown className="ml-auto h-4 w-4 opacity-50"/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}>
            <Minus className="mr-2 h-4 w-4" /> Horizontal Rule
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.dispatchCommand(INSERT_TABLE_DIALOG_COMMAND, undefined) }>
            <TableIcon className="mr-2 h-4 w-4" /> Table
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => editor.dispatchCommand(INSERT_IMAGE_COMMAND, { showModal: true, src: '', altText: '' }) }>
            <ImageIconLucide className="mr-2 h-4 w-4" /> Image
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor.dispatchCommand(INSERT_EQUATION_COMMAND, { showModal: true });
            }}
          >
            <Calculator className="mr-2 h-4 w-4" /> Equation
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined);
            }}
          >
            <ChevronsUpDown className="mr-2 h-4 w-4" /> Collapsible
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2 h-9 min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm justify-start" title="Alignment">
            <currentAlignmentOption.icon className="mr-2 h-4 w-4 shrink-0" /> <span className="truncate w-[50px] sm:w-[70px]">{currentAlignmentOption.label}</span> <ChevronDown className="ml-auto h-4 w-4 opacity-50"/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          {ALIGNMENT_OPTIONS.filter(opt => ['left', 'center', 'right', 'justify'].includes(opt.value)).map(opt => ( 
            <DropdownMenuItem
              key={opt.value}
              onClick={() => formatElement(opt.value as ElementFormatType)}
              className={elementFormat === opt.value ? 'bg-accent text-accent-foreground' : ''}
            >
              <opt.icon className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">{opt.label}</span>
              {opt.shortcut && <DropdownMenuShortcut>{opt.shortcut}</DropdownMenuShortcut>}
            </DropdownMenuItem>
          ))}
           <DropdownMenuItem
              onClick={() => formatElement('start')}
            >
              <AlignLeft className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">Start Align</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => formatElement('end')}
            >
              <AlignRight className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">End Align</span>
            </DropdownMenuItem>
          <DropdownMenuSeparator />
           <DropdownMenuItem onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>
              <Outdent className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">Outdent</span>
              <DropdownMenuShortcut>Ctrl+[</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>
              <Indent className="mr-2 h-4 w-4" /> 
              <span className="flex-grow">Indent</span>
              <DropdownMenuShortcut>Ctrl+]</DropdownMenuShortcut>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{isEditingLink ? "Edit Link" : "Insert Link"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="link-url">URL</Label>
                <Input 
                    id="link-url" 
                    value={linkDialogUrl} 
                    onChange={(e) => setLinkDialogUrl(e.target.value)} 
                    placeholder="https://example.com" 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLinkDialogSubmit();}}}
                />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="button" onClick={handleLinkDialogSubmit}>{isEditingLink ? "Update" : "Insert"}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Insert Table Dialog */}
      <Dialog open={isInsertTableDialogOpen} onOpenChange={setIsInsertTableDialogOpen}>
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
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="button" onClick={handleInsertTable}>Insert</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Image Dialog */}
      <Dialog open={isInsertImageDialogOpen} onOpenChange={setIsInsertImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Insert Image</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="image-url" className="text-right col-span-1">URL</Label>
                    <Input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" placeholder="https://placehold.co/400x300.png" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right col-span-1">Or</Label>
                    <div className="col-span-3"/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="image-file-input" className="text-right col-span-1">Upload</Label>
                    <Input id="image-file-input" type="file" onChange={handleImageFileChange} className="col-span-3" accept="image/*" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="image-alt" className="text-right col-span-1">Alt Text</Label>
                    <Input id="image-alt" value={imageAltText} onChange={(e) => setImageAltText(e.target.value)} className="col-span-3" placeholder="Descriptive text" />
                </div>
            </div>
            <DialogFooter>
                 <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="button" onClick={handleInsertImage}>Insert</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

