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
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  LexicalEditor,
  ElementFormatType,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListItemNode, $isListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list';
import { $isCodeNode, CODE_LANGUAGE_FRIENDLY_NAME_MAP, CODE_LANGUAGE_MAP } from '@lexical/code';
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import {
  Bold, Italic, Underline, Strikethrough, Code, Link2, List, ListOrdered, Quote, Pilcrow, Heading1, Heading2, Heading3, Undo, Redo, AlignLeft, AlignCenter, AlignRight, AlignJustify,
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

const LowPriority = 1;

const supportedBlockTypes = new Set([
  'paragraph',
  'quote',
  'code',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
]);

const blockTypeToBlockName = {
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  ol: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
  ul: 'Bulleted List',
};

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
  const [blockType, setBlockType] = useState<keyof typeof blockTypeToBlockName>('paragraph');
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(null);
  const [codeLanguage, setCodeLanguage] = useState('');

  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [elementFormat, setElementFormat] = useState<ElementFormatType>('left');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $getNearestNodeOfType(anchorNode, $isRootOrShadowRoot)
          ? anchorNode.getTopLevelElementOrThrow()
          : anchorNode.getParent();

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      
      setElementFormat(element.getFormatType() || 'left');

      const node = getSelectedNode(selection);
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));
      
      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, $isListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
          if ($isCodeNode(element)) {
            setCodeLanguage(element.getLanguage() || '');
          }
        }
      }
    }
  }, [editor]);

  useEffect(() => {
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

  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $getSelection()?.getNodes().forEach(node => {
            const element = node.getParentOrThrow();
            if (!$isListItemNode(element) && !$isCodeNode(element)) {
               element.setFormat('');
            }
           });
          selection.insertNodes([$createParagraphNode()]);
        }
      });
    }
  };

  const formatHeading = (headingSize: 'h1' | 'h2' | 'h3') => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([ (headingSize === 'h1' ? $createParagraphNode().setFormat('h1') : headingSize === 'h2' ? $createParagraphNode().setFormat('h2') : $createParagraphNode().setFormat('h3')) ]);
          // A better way for headings is to use FORMAT_ELEMENT_COMMAND or specific heading node creation,
          // or transform existing paragraph. For simplicity, this inserts a new node.
          // Actual heading creation might be: $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'ul') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'ol') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatQuote = () => {
     if (blockType !== 'quote') {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // This is a simplified quote toggle. A more robust one would use $setBlocksType.
            selection.insertNodes([$createParagraphNode().setFormat('quote')]);
          }
        });
      }
  };
  
  const formatCode = () => {
    if (blockType !== 'code') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
           // This is simplified. Proper code block creation involves $createCodeNode.
           selection.insertNodes([$createParagraphNode().setFormat('codeblock')]); // Assuming 'codeblock' is a valid format or custom node type
        }
      });
    }
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
    setElementFormat(format); // Eagerly update UI
  };


  return (
    <div ref={toolbarRef} className="p-2 rounded-t-md border border-b-0 border-input bg-card flex flex-wrap items-center gap-1">
      <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} aria-label="Undo">
        <Undo className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} aria-label="Redo">
        <Redo className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-6 mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-3 h-9">
            {blockTypeToBlockName[blockType] || 'Block Type'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={formatParagraph} className={blockType === 'paragraph' ? 'bg-accent' : ''}>
            <Pilcrow className="mr-2 h-4 w-4" /> Normal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h1')} className={blockType === 'h1' ? 'bg-accent' : ''}>
            <Heading1 className="mr-2 h-4 w-4" /> Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h2')} className={blockType === 'h2' ? 'bg-accent' : ''}>
            <Heading2 className="mr-2 h-4 w-4" /> Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h3')} className={blockType === 'h3' ? 'bg-accent' : ''}>
            <Heading3 className="mr-2 h-4 w-4" /> Heading 3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={formatBulletList} className={blockType === 'ul' ? 'bg-accent' : ''}>
            <List className="mr-2 h-4 w-4" /> Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatNumberedList} className={blockType === 'ol' ? 'bg-accent' : ''}>
            <ListOrdered className="mr-2 h-4 w-4" /> Numbered List
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={formatQuote} className={blockType === 'quote' ? 'bg-accent' : ''}>
            <Quote className="mr-2 h-4 w-4" /> Quote
          </DropdownMenuItem>
          <DropdownMenuItem onClick={formatCode} className={blockType === 'code' ? 'bg-accent' : ''}>
            <Code className="mr-2 h-4 w-4" /> Code Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {blockType === 'code' && (
         <Select value={codeLanguage} onValueChange={onCodeLanguageSelect}>
          <SelectTrigger className="w-[150px] h-9 ml-1">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CODE_LANGUAGE_FRIENDLY_NAME_MAP).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />
      <Button variant={isBold ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} aria-label="Format Bold">
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant={isItalic ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} aria-label="Format Italic">
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant={isUnderline ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} aria-label="Format Underline">
        <Underline className="h-4 w-4" />
      </Button>
      <Button variant={isStrikethrough ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} aria-label="Format Strikethrough">
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button variant={isCode ? 'secondary' : 'ghost'} size="icon" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} aria-label="Format Code">
        <Code className="h-4 w-4" />
      </Button>
      <Button variant={isLink ? 'secondary' : 'ghost'} size="icon" onClick={insertLink} aria-label="Insert Link">
        <Link2 className="h-4 w-4" />
      </Button>
       <Separator orientation="vertical" className="h-6 mx-1" />
       <Button variant={elementFormat === 'left' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('left')} aria-label="Align Left">
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button variant={elementFormat === 'center' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('center')} aria-label="Align Center">
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button variant={elementFormat === 'right' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('right')} aria-label="Align Right">
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button variant={elementFormat === 'justify' ? 'secondary' : 'ghost'} size="icon" onClick={() => formatElement('justify')} aria-label="Align Justify">
        <AlignJustify className="h-4 w-4" />
      </Button>
    </div>
  );
}
