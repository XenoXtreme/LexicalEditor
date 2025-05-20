
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
  LexicalCommand,
  createCommand,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListItemNode, $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND, ListNode } from '@lexical/list';
import { $isCodeNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, /* CODE_LANGUAGE_MAP, */ $createCodeNode, getCodeLanguages, getDefaultCodeLanguage } from '@lexical/code'; // CODE_LANGUAGE_MAP removed as it's not directly used
import { $getNearestNodeOfType, mergeRegister, $findMatchingParent } from '@lexical/utils';
import { $createHeadingNode, $isHeadingNode, $isQuoteNode, HeadingTagType, /* QuoteNode */ } from '@lexical/rich-text'; // QuoteNode removed as $createQuoteNode is used.
import * as LexicalSelectionUtil from '@lexical/selection';

import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { $createImageNode, ImageNode } from '../nodes/ImageNode.tsx';
import { INSERT_COLLAPSIBLE_COMMAND } from '@lexical/collapsible';


import {
  Bold, Italic, Underline, Strikethrough, Code, Link2, List, ListOrdered, ListChecks, Quote, Pilcrow, Heading1, Heading2, Heading3, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, Loader2, Palette, CaseSensitive, Eraser, Copy, FontSize, PilcrowSquare, Baseline, CaseUpper, CaseLower, Highlighter, PlusSquare, Minus, TableIcon, Image as ImageIcon, ChevronsUpDown, Rows, Columns,
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
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
  ['Geist Sans', 'var(--font-geist-sans)'],
  ['Geist Mono', 'var(--font-geist-mono)'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['10px', 'Small (10px)'],
  ['12px', 'Smaller (12px)'],
  ['14px', 'Normal (14px)'],
  ['18px', 'Medium (18px)'],
  ['24px', 'Large (24px)'],
  ['36px', 'Huge (36px)'],
];

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
  const [codeLanguage, setCodeLanguage] = useState('');
  const [currentCodeLanguages, setCurrentCodeLanguages] = useState<string[]>([]);


  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isHighlight, setIsHighlight] = useState(false); 
  const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');

  const [currentFontSize, setCurrentFontSize] = useState<string>('14px');
  const [currentFontFamily, setCurrentFontFamily] = useState<string>('Arial');
  const [currentTextColor, setCurrentTextColor] = useState<string>('inherit');
  const [currentHighlightColor, setCurrentHighlightColor] = useState<string>('transparent');


  const [isGenerateTextDialogOpen, setIsGenerateTextDialogOpen] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  
  const [isInsertTableDialogOpen, setIsInsertTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState('3');
  const [tableColumns, setTableColumns] = useState('3');

  const [isInsertImageDialogOpen, setIsInsertImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAltText, setImageAltText] = useState('');


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
            }) || anchorNode.getTopLevelElementOrThrow();


      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      setIsHighlight(selection.hasFormat('highlight'));

      const node = getSelectedNode(selection);
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));
      
      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : (element as ListNode).getListType();
          setBlockType(type);
        } else {
          let type = $isHeadingNode(element) ? element.getTag() : element.getType();
           if ($isQuoteNode(element)) { 
            type = 'quote';
          } else if ($isCodeNode(element)) {
            type = 'code';
            setCodeLanguage(element.getLanguage() || getDefaultCodeLanguage());
          }


          if (type in blockTypeToBlockName || supportedBlockTypes.has(type)) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          } else {
            setBlockType('paragraph'); 
          }
        }
      }
      
      if (element.getFormatType) {
        setElementFormat(element.getFormatType());
      } else {
        setElementFormat('left');
      }
      
      setCurrentFontSize(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-size', '14px'));
      setCurrentFontFamily(LexicalSelectionUtil.$getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
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
      // Register custom image command
      editor.registerCommand(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const { altText, src, width, height } = payload;
          const imageNode = $createImageNode({ altText, src, width, height });
          $getSelection()?.insertNodes([imageNode]);
          if ($isRootOrShadowRoot($getSelection()?.anchor.getNode())) {
            $getSelection()?.insertParagraph();
          }
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
       editor.registerCommand(
        INSERT_COLLAPSIBLE_COMMAND,
        () => {
          // Logic to insert collapsible container is handled by CollapsiblePlugin
          // This command is just to trigger it from toolbar
          // The plugin itself handles node creation.
          // We just need to make sure it's dispatched.
          // editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined); // This might be redundant if the plugin listens to it already.
          // Let's make sure the plugin does its job or we manually insert nodes.
          // For now, let the plugin handle it if correctly configured.
          // If not, manual insertion would be:
          // editor.update(() => {
          //  const selection = $getSelection();
          //  if ($isRangeSelection(selection)) {
          //    // Placeholder: Real logic in plugin or custom here
          //    const titleNode = $createCollapsibleTitleNode();
          //    titleNode.append($createTextNode('Title'));
          //    const contentNode = $createCollapsibleContentNode();
          //    contentNode.append($createParagraphNode().append($createTextNode('Content')));
          //    const containerNode = $createCollapsibleContainerNode(true); // true for initially open
          //    containerNode.append(titleNode);
          //    containerNode.append(contentNode);
          //    selection.insertNodes([containerNode]);
          //  }
          // });
          return false; // Let the plugin handle it.
        },
        COMMAND_PRIORITY_LOW,
      )
    );
  }, [editor, updateToolbar]);

  const insertLink = useCallback(() => {
    if (!isLink) {
      const url = window.prompt('Enter link URL:');
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  const formatBlock = (type: string) => {
    if (blockType === type && type !== 'paragraph' && type !== 'quote') return; 
  
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
  
      if (type === 'paragraph') {
        LexicalSelectionUtil.$setBlocksType(selection, () => $createParagraphNode());
      } else if (type === 'h1' || type === 'h2' || type === 'h3') {
        LexicalSelectionUtil.$setBlocksType(selection, () => $createHeadingNode(type as HeadingTagType));
      } else if (type === 'ul') {
        if (blockType === 'ul') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        else editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      } else if (type === 'ol') {
        if (blockType === 'ol') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      } else if (type === 'check') {
        if (blockType === 'check') editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        else editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
      } else if (type === 'quote') {
        const anchorNode = selection.anchor.getNode();
        const topLevelElement = anchorNode.getTopLevelElementOrThrow();
        if ($isQuoteNode(topLevelElement)) { 
            LexicalSelectionUtil.$setBlocksType(selection, () => $createParagraphNode());
        } else {
            LexicalSelectionUtil.$setBlocksType(selection, () => {
                const quoteNode = $createQuoteNode(); 
                return quoteNode;
            });
        }
      } else if (type === 'code') {
        const anchorNode = selection.anchor.getNode();
        const topLevelElement = anchorNode.getTopLevelElementOrThrow();
        if ($isCodeNode(topLevelElement)) {
            LexicalSelectionUtil.$setBlocksType(selection, () => $createParagraphNode());
        } else {
            LexicalSelectionUtil.$setBlocksType(selection, () => $createCodeNode(codeLanguage || getDefaultCodeLanguage()));
        }
      }
    });
  };

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      editor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(value);
          }
        }
      });
    },
    [editor, selectedElementKey],
  );

  const formatElement = (format: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
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

  const onFontFamilySelect = (family: string) => applyStyleText({ 'font-family': family });
  const onFontSizeSelect = (size: string) => applyStyleText({ 'font-size': size });
  const onTextColorSelect = (color: string) => applyStyleText({ color });
  const onHighlightColorSelect = (color: string) => applyStyleText({ 'background-color': color });


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
        // LexicalSelectionUtil.$clearFormatting(selection); // Temporarily removed due to persistent import error
        console.warn("Lexical Canvas: Clear formatting feature is temporarily unavailable due to a module resolution issue with $clearFormatting. Please check your project's dependencies and build cache.");
      }
    });
  };

  const copyCodeContent = useCallback(() => {
    if (blockType === 'code' && selectedElementKey) {
      editor.getEditorState().read(() => {
        const codeNode = $getNodeByKey(selectedElementKey);
        if ($isCodeNode(codeNode)) {
          navigator.clipboard.writeText(codeNode.getTextContent())
            .then(() => toast({ title: "Code Copied!", description: "Content of the code block has been copied to clipboard." }))
            .catch(err => toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy code to clipboard." }));
        }
      });
    }
  }, [editor, blockType, selectedElementKey, toast]);


  const handleGenerateText = async () => {
    if (!generationPrompt.trim() || isGeneratingText) return;

    setIsGeneratingText(true);
    let generatedTextContent: string | null = null; 

    try {
      const input: GenerateTextInput = { prompt: generationPrompt };
      const result = await generateText(input);

      if (result && result.generatedText) {
        generatedTextContent = result.generatedText; 
        
        editor.focus( 
          () => { 
            if (generatedTextContent !== null) { 
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  selection.insertText(generatedTextContent!); 
                } else {
                  const root = $getRoot();
                  const paragraph = $createParagraphNode();
                  paragraph.append($createTextNode(generatedTextContent!)); 
                  root.append(paragraph);
                  paragraph.selectEnd(); 
                }
              });
            }
          }
        );

        toast({
          title: "Text Generated",
          description: "AI-generated text has been inserted into the editor.",
        });
      } else if (result && result.generatedText === "") {
        toast({
          variant: "default", 
          title: "AI Response",
          description: "The AI returned an empty response. This might be due to content filters or the nature of the prompt.",
        });
      }
       else {
        throw new Error("AI returned an unexpected or empty response.");
      }
    } catch (error) {
      console.error("AI Text Generation error:", error);
      let title = "AI Text Generation Failed";
      let description = "An unexpected error occurred.";

      if (error instanceof Error) {
        if (error.message.includes("429 Too Many Requests")) {
          title = "AI Rate Limit Exceeded";
          description = "You've made too many requests for AI text generation. Please try again later.";
        } else if (error.message.includes("Candidate was blocked due to SAFETY")) {
            title = "Content Generation Blocked";
            description = "The AI could not generate text for this prompt due to safety filters. Please try a different prompt.";
        }
         else {
          description = error.message || "Failed to generate text. Please check console for details.";
        }
      }
      
      toast({
        variant: "destructive",
        title: title,
        description: description,
      });
    } finally {
      setIsGeneratingText(false);
    }
  };

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
    const src = imageUrl.trim() || `https://placehold.co/400x300.png`; // Default placeholder
    const alt = imageAltText.trim() || 'Placeholder image';
    editor.dispatchCommand(INSERT_IMAGE_COMMAND, {src, altText: alt, width: 400, height: 300});
    setIsInsertImageDialogOpen(false);
    setImageUrl('');
    setImageAltText('');
  };


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
          <Button variant="ghost" className="px-3 h-9 min-w-[120px]" title="Block Type">
             {blockTypeToBlockName[blockType] || 'Block Type'}
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
          <SelectTrigger className="w-[150px] h-9 ml-1" title="Select Code Language">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Plain Text</SelectItem>
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
      <Separator orientation="vertical" className="h-6 mx-1" />

       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-3 h-9 min-w-[120px]" title="Font Family">
            {FONT_FAMILY_OPTIONS.find(opt => opt[1] === currentFontFamily)?.[0] || FONT_FAMILY_OPTIONS.find(opt => opt[0] === currentFontFamily)?.[0] || 'Font'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {FONT_FAMILY_OPTIONS.map(([label, value]) => (
            <DropdownMenuItem key={value} onClick={() => onFontFamilySelect(value)} className={currentFontFamily === value ? 'bg-accent text-accent-foreground' : ''} style={{fontFamily: value}}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-3 h-9 min-w-[120px]" title="Font Size">
           {FONT_SIZE_OPTIONS.find(opt => opt[0] === currentFontSize)?.[1] || currentFontSize}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {FONT_SIZE_OPTIONS.map(([value, label]) => (
            <DropdownMenuItem key={value} onClick={() => onFontSizeSelect(value)} className={currentFontSize === value ? 'bg-accent text-accent-foreground' : ''}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
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
       <Button variant={isHighlight ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight')} aria-label="Highlight Text" title="Highlight Text (Default Yellow)">
        <Highlighter className="h-4 w-4" />
      </Button>
      <Button variant={isCode ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} aria-label="Format Code" title="Inline Code">
        <Code className="h-4 w-4" />
      </Button>
      <Button variant={isLink ? 'secondary' : 'ghost'} size="icon" onClick={insertLink} aria-label="Insert Link" title="Insert/Edit Link">
        <Link2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Insert Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Insert">
            <PlusSquare className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}>
            <Minus className="mr-2 h-4 w-4" /> Horizontal Rule
          </DropdownMenuItem>
          
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <TableIcon className="mr-2 h-4 w-4" /> Table
            </DropdownMenuItem>
          </DialogTrigger>

          <DialogTrigger asChild>
             <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <ImageIcon className="mr-2 h-4 w-4" /> Image
            </DropdownMenuItem>
          </DialogTrigger>

          <DropdownMenuItem onClick={() => editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined)}>
            <ChevronsUpDown className="mr-2 h-4 w-4" /> Collapsible
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Separator orientation="vertical" className="h-6 mx-1" />
      {/* End Insert Dropdown */}


      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" title="Text Color">
            <Palette className="h-4 w-4" style={{color: currentTextColor === 'inherit' || currentTextColor === 'hsl(var(--foreground))' ? 'currentColor' : currentTextColor }} />
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
          <Button variant="ghost" size="icon" title="Background Color (Highlight)">
            <Baseline className="h-4 w-4" style={{ color: currentHighlightColor === 'transparent' || currentHighlightColor === 'inherit' ? 'currentColor' : 'hsl(var(--accent))', fillOpacity: currentHighlightColor !== 'transparent' && currentHighlightColor !== 'inherit' ? 0.5 : 0 }}/>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
           <DropdownMenuItem onClick={() => onHighlightColorSelect('transparent')} className={currentHighlightColor === 'transparent' ? 'bg-accent text-accent-foreground' : ''}>
             <div className="w-4 h-4 rounded-full border mr-2 flex items-center justify-center" style={{borderColor: 'hsl(var(--border))'}}><Eraser className="h-3 w-3 opacity-50"/></div>
              None (Transparent)
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
            <CaseLower className="mr-2 h-4 w-4" /> lowercase
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transformTextCase('uppercase')}>
            <CaseUpper className="mr-2 h-4 w-4" /> UPPERCASE
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => transformTextCase('capitalize')}>
            <PilcrowSquare className="mr-2 h-4 w-4" /> Capitalize Case
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon" onClick={clearFormatting} aria-label="Clear Formatting" title="Clear Formatting">
        <Eraser className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />


      <Dialog open={isGenerateTextDialogOpen} onOpenChange={(open) => {
        setIsGenerateTextDialogOpen(open);
        if (!open) setGenerationPrompt(''); // Clear prompt on close
      }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Generate Text with AI" title="Generate Text with AI">
            <Sparkles className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Text with AI</DialogTitle>
            <DialogDescription>
              Enter a prompt below and the AI will generate text for you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prompt-input" className="text-right col-span-1">
                Prompt
              </Label>
              <Input
                id="prompt-input"
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Write a short story about..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && generationPrompt.trim()) {
                    e.preventDefault();
                    handleGenerateText();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
             <DialogClose asChild>
                <Button type="button" variant="outline">
                 Cancel
                </Button>
            </DialogClose>
            <Button 
                type="button" 
                onClick={handleGenerateText} 
                disabled={isGeneratingText || !generationPrompt.trim()}
            >
              {isGeneratingText ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>) : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Table Dialog */}
      <Dialog open={isInsertTableDialogOpen} onOpenChange={setIsInsertTableDialogOpen}>
        {/* <DialogTrigger asChild> must be part of the DropdownMenuItem for Table */}
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
            <DialogDescription>Specify the number of rows and columns.</DialogDescription>
          </DialogHeader>
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
        {/* <DialogTrigger asChild> must be part of the DropdownMenuItem for Image */}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>Enter image URL and alternative text.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-url" className="text-right col-span-1">URL</Label>
              <Input id="image-url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" placeholder="https://placehold.co/400x300.png" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image-alt" className="text-right col-span-1">Alt Text</Label>
              <Input id="image-alt" value={imageAltText} onChange={(e) => setImageAltText(e.target.value)} className="col-span-3" placeholder="Descriptive text for the image" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="button" onClick={handleInsertImage}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Separator orientation="vertical" className="h-6 mx-1" />
      <Button variant={elementFormat === 'left' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('left')} aria-label="Align Left" title="Align Left">
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant={elementFormat === 'center' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('center')} aria-label="Align Center" title="Align Center">
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant={elementFormat === 'right' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('right')} aria-label="Align Right" title="Align Right">
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button variant={elementFormat === 'justify' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('justify')} aria-label="Align Justify" title="Align Justify">
        <AlignJustify className="h-4 w-4" />
      </Button>
    </div>
  );
}
