
"use client";
import type { LexicalEditor, NodeKey } from 'lexical';
import * as React from 'react';
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DRAGSTART_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  ParagraphNode, TextNode, LineBreakNode,
  createEditor,
  $createParagraphNode,
  $createTextNode
} from 'lexical';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';


import { $isImageNode, ImageNode } from './ImageNode.tsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Edit3, Check, X, MessageSquarePlus } from 'lucide-react';

// Minimal set of nodes for the caption editor, ensure these are registered in your main editor too
// or provide a mechanism for the nested editor to use a specific node set.
const captionEditorNodes = [ParagraphNode, TextNode, LineBreakNode];


// Helper function to safely check editor read-only state
function isEditorReadOnly(editor: LexicalEditor | null | undefined): boolean {
  if (!editor || typeof editor.isReadOnly !== 'function') {
    return true; // Default to read-only if editor or method is invalid
  }
  return editor.isReadOnly();
}

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef,
  editor: parentEditor, // Renamed to avoid confusion with nested editor
  imageNodeKey,
}: {
  onResizeStart: () => void;
  onResizeEnd: (width: number, height: number) => void;
  imageRef: React.RefObject<HTMLDivElement>;
  editor: LexicalEditor; // This is the main editor instance
  imageNodeKey: NodeKey;
}): JSX.Element {
  const controlWrapperRef = useRef<HTMLDivElement>(null);
  const userSelect = useRef({
    priority: '',
    value: 'default',
  });
  const positioningRef = useRef<{
    currentHeight: number;
    currentWidth: number;
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
    isResizing: boolean;
    ratio: number;
    startHeight: number;
    startWidth: number;
    startX: number;
    startY: number;
  }>({
    currentHeight: 0,
    currentWidth: 0,
    direction: 0,
    isResizing: false,
    ratio: 0,
    startHeight: 0,
    startWidth: 0,
    startX: 0,
    startY: 0,
  });

  const editorReadOnly = isEditorReadOnly(parentEditor);
  const [isEditingAlt, setIsEditingAlt] = useState(false);
  const [currentAltText, setCurrentAltText] = useState('');


  useEffect(() => {
    parentEditor.getEditorState().read(() => {
        const node = $getNodeByKey(imageNodeKey) as ImageNode | null;
        if ($isImageNode(node)) {
           setCurrentAltText(node.getAltText());
        }
    });
  }, [parentEditor, imageNodeKey]);


  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  ) => {
    if (editorReadOnly) return;

    const wrapperElement = imageRef.current;
    const controlWrapper = controlWrapperRef.current;

    if (wrapperElement && controlWrapper) {
      const targetImageElement = wrapperElement.querySelector('img');
      if (!targetImageElement) return;

      event.preventDefault();
      const { width, height } = targetImageElement.getBoundingClientRect();

      const positioning = positioningRef.current;
      positioning.startWidth = width;
      positioning.startHeight = height;
      positioning.ratio = width / height;
      positioning.currentWidth = width;
      positioning.currentHeight = height;
      positioning.startX = event.clientX;
      positioning.startY = event.clientY;
      positioning.isResizing = true;
      positioning.direction = direction;

      userSelect.current.value = document.body.style.getPropertyValue(
        '-webkit-user-select',
      );
      userSelect.current.priority = document.body.style.getPropertyPriority(
        '-webkit-user-select',
      );

      document.body.style.setProperty(
        '-webkit-user-select',
        'none',
        'important',
      );
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      onResizeStart();
    }
  };

  const handlePointerMove = (event: PointerEvent) => {
    const wrapperElement = imageRef.current;
    const positioning = positioningRef.current;

    if (wrapperElement && positioning.isResizing) {
      const targetImageElement = wrapperElement.querySelector('img');
      if (!targetImageElement) return;

      let newWidth = positioning.startWidth;
      let newHeight = positioning.startHeight;

      const diffX = event.clientX - positioning.startX;
      const diffY = event.clientY - positioning.startY;

      if ([0, 3, 5].includes(positioning.direction)) {
        newWidth -= diffX;
      }
      if ([2, 4, 7].includes(positioning.direction)) {
        newWidth += diffX;
      }
      if ([0, 1, 2].includes(positioning.direction)) {
        newHeight -= diffY;
      }
      if ([5, 6, 7].includes(positioning.direction)) {
        newHeight += diffY;
      }

      const minSize = 50;
      positioning.currentWidth = Math.max(newWidth, minSize);
      positioning.currentHeight = Math.max(newHeight, minSize);

      targetImageElement.style.width = `${positioning.currentWidth}px`;
      targetImageElement.style.height = `${positioning.currentHeight}px`;

      // Update the wrapper div's style as well if it directly controls perceived size
      wrapperElement.style.width = `${positioning.currentWidth}px`;
      wrapperElement.style.height = `${positioning.currentHeight}px`;
    }
  };
  const handlePointerUp = () => {
    const wrapperElement = imageRef.current;
    const positioning = positioningRef.current;
    if (wrapperElement && positioning.isResizing) {
      const width = positioning.currentWidth;
      const height = positioning.currentHeight;
      positioning.isResizing = false;
      onResizeEnd(width, height);

      document.body.style.setProperty(
        '-webkit-user-select',
        userSelect.current.value,
        userSelect.current.priority,
      );

      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }
  };

  const handleAltTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentAltText(e.target.value);
  };

  const saveAltText = () => {
    parentEditor.update(() => {
      const node = $getNodeByKey(imageNodeKey) as ImageNode | null;
      if ($isImageNode(node)) {
        node.getWritable().__altText = currentAltText;
      }
    });
    setIsEditingAlt(false);
  };

  const resizerDirections = [
    { direction: 0, style: { left: '-4px', top: '-4px', cursor: 'nwse-resize' } }, // NW
    { direction: 1, style: { left: 'calc(50% - 6px)', top: '-4px', cursor: 'ns-resize' } }, // N
    { direction: 2, style: { right: '-4px', top: '-4px', cursor: 'nesw-resize' } }, // NE
    { direction: 3, style: { left: '-4px', top: 'calc(50% - 6px)', cursor: 'ew-resize' } }, // W
    { direction: 4, style: { right: '-4px', top: 'calc(50% - 6px)', cursor: 'ew-resize' } }, // E
    { direction: 5, style: { left: '-4px', bottom: '-4px', cursor: 'nesw-resize' } }, // SW
    { direction: 6, style: { left: 'calc(50% - 6px)', bottom: '-4px', cursor: 'ns-resize' } }, // S
    { direction: 7, style: { right: '-4px', bottom: '-4px', cursor: 'nwse-resize' } }, // SE
  ];


  return (
    <div ref={controlWrapperRef} className="absolute inset-0 z-10 pointer-events-none">
      {!editorReadOnly && (
        <>
         <div className="absolute top-2 left-2 bg-background/80 p-1 rounded shadow-md flex items-center gap-1 text-xs pointer-events-auto">
            {isEditingAlt ? (
              <>
                <Input
                  type="text"
                  value={currentAltText}
                  onChange={handleAltTextChange}
                  className="h-6 text-xs p-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveAltText();
                    if (e.key === 'Escape') setIsEditingAlt(false);
                  }}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={saveAltText} title="Save Alt Text"><Check className="h-3 w-3"/></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingAlt(false)} title="Cancel"><X className="h-3 w-3"/></Button>
              </>
            ) : (
              <>
                <span className="truncate max-w-[100px]">{currentAltText || 'No alt text'}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditingAlt(true)} title="Edit Alt Text"><Edit3 className="h-3 w-3"/></Button>
              </>
            )}
          </div>

          {resizerDirections.map(({ direction, style }) => (
            <div
              key={direction}
              className="absolute bg-primary border border-primary-foreground rounded-full w-3 h-3 opacity-80 hover:opacity-100 pointer-events-auto"
              style={style as React.CSSProperties}
              onPointerDown={(event) => handlePointerDown(event, direction as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7)}
            />
          ))}
        </>
      )}
    </div>
  );
}


export default function ImageComponent({
  src,
  altText,
  width,
  height,
  nodeKey,
  showCaption,
  captionEditor: captionEditorInstance, // Renamed to avoid conflict with prop name
  resizable,
  editor: parentEditor,
}: {
  src: string;
  altText: string;
  width?: 'inherit' | number;
  height?: 'inherit' | number;
  nodeKey: NodeKey;
  showCaption?: boolean;
  captionEditor?: LexicalEditor; // Prop name is captionEditor
  resizable?: boolean;
  editor: LexicalEditor;
}): JSX.Element {
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState(false);

  const editorIsActuallyReadOnly = parentEditor && typeof parentEditor.isReadOnly === 'function' ? parentEditor.isReadOnly() : true;


  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.remove();
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey],
  );


  const onEscape = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected) {
        clearSelection();
        setSelected(false);
        return true;
      }
      return false;
    },
    [isSelected, clearSelection, setSelected],
  );

  useEffect(() => {
    let isMounted = true;
    const unregister = mergeRegister(
      parentEditor.registerUpdateListener(({ editorState }) => {
        if (isMounted) {
          // setSelection(editorState.read($getSelection)); // Original purpose unclear, remove if not needed
        }
      }),
      parentEditor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (payload) => {
          const event = payload;
          if (isResizing) return true;

          const target = event.target as Node;
          const captionEditorElement = imageWrapperRef.current?.querySelector('.image-caption-editor-wrapper');
          if (captionEditorElement && captionEditorElement.contains(target)) {
            return false;
          }

          if (imageWrapperRef.current && imageWrapperRef.current.contains(target)) {
            if (event.shiftKey) {
              setSelected(!isSelected);
            } else {
              clearSelection();
              setSelected(true);
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      parentEditor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => {
          if (imageWrapperRef.current && imageWrapperRef.current.contains(event.target as Node)) {
            if(isSelected || resizable) event.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      parentEditor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      parentEditor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      parentEditor.registerCommand(KEY_ESCAPE_COMMAND, onEscape, COMMAND_PRIORITY_LOW),
    );
    return () => {
      isMounted = false;
      unregister();
    };
  }, [
    clearSelection,
    parentEditor,
    isResizing,
    isSelected,
    nodeKey,
    onDelete,
    onEscape,
    setSelected,
    resizable,
  ]);


  const onResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback(
    (newWidth: number, newHeight: number) => {
      if (editorIsActuallyReadOnly) {
          setIsResizing(false);
          return;
      }

      if (isResizing) {
        setIsResizing(false);
        parentEditor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setWidthAndHeight(newWidth, newHeight);
          }
        });
      }
    },
    [parentEditor, nodeKey, isResizing, editorIsActuallyReadOnly],
  );

  const handleAddCaption = () => {
    parentEditor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
            node.setShowCaption(true);
        }
    });
  };

  const imageInitialWidth = typeof width === 'number' ? width : (resizable ? 400 : undefined);
  const imageInitialHeight = typeof height === 'number' ? height : (resizable && imageInitialWidth ? imageInitialWidth * 0.75 : undefined);


  return (
    <Suspense fallback={null}>
      <div
        className={cn(
          'relative inline-block group editor-image',
           isSelected && !editorIsActuallyReadOnly && 'outline outline-2 outline-primary outline-offset-2 rounded-sm'
        )}
        draggable={!editorIsActuallyReadOnly && isSelected}
        ref={imageWrapperRef}
        style={{
          width: typeof imageInitialWidth === 'number' ? `${imageInitialWidth}px` : 'auto',
          height: typeof imageInitialHeight === 'number' ? `${imageInitialHeight}px` : 'auto',
          cursor: isSelected && resizable && !editorIsActuallyReadOnly && !isResizing ? 'grab' : (isResizing ? 'grabbing': 'default')
        }}
      >
        <div className="relative"> {/* Wrapper for image and Add Caption button */}
            <img
              src={src}
              alt={altText}
              width={typeof imageInitialWidth === 'number' ? imageInitialWidth : undefined}
              height={typeof imageInitialHeight === 'number' ? imageInitialHeight : undefined}
              className={cn(
                'block',
                (typeof imageInitialWidth !== 'number' || typeof imageInitialHeight !== 'number') && 'max-w-full h-auto',
                resizable && !editorIsActuallyReadOnly && isSelected && 'cursor-grab',
                resizable && !editorIsActuallyReadOnly && isResizing && 'cursor-grabbing',
              )}
              style={{
                width: typeof imageInitialWidth === 'number' ? `${imageInitialWidth}px` : 'auto',
                height: typeof imageInitialHeight === 'number' ? `${imageInitialHeight}px` : 'auto',
              }}
              data-ai-hint={altText.split(' ').slice(0,2).join(' ') || 'image'}
            />
            {isSelected && !showCaption && !editorIsActuallyReadOnly && (
                 <Button
                    onClick={handleAddCaption}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white hover:bg-black/90 h-8 px-3 text-xs"
                    size="sm"
                  >
                    <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
                    Add Caption
                  </Button>
            )}
        </div>

        {isSelected && resizable && !editorIsActuallyReadOnly && (
          <ImageResizer
            editor={parentEditor}
            imageRef={imageWrapperRef}
            imageNodeKey={nodeKey}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
          />
        )}
      </div>
      {showCaption && captionEditorInstance && (
        <div className="image-caption-editor-wrapper mt-1 p-2 border border-input rounded bg-muted/20 focus-within:ring-1 focus-within:ring-ring">
          <LexicalNestedComposer
            initialEditor={captionEditorInstance}
            initialNodes={captionEditorNodes}
            initialTheme={{
              paragraph: 'editor-image-caption-paragraph', // Use specific class from globals.css
              // Add other theme overrides for caption if needed
            }}
            skipCollabChecks={true}
          >
            <RichTextPlugin
              contentEditable={<ContentEditable className="outline-none min-h-[20px] text-sm text-center caption-content-editable" />}
              placeholder={<div className="editor-placeholder text-sm text-center absolute top-0 left-0 right-0 pointer-events-none">Type a caption...</div>}
              ErrorBoundary={({onError}) => { console.error("Caption editor error:", onError); return <div>Caption Error</div>;}}
            />
            <HistoryPlugin />
          </LexicalNestedComposer>
        </div>
      )}
    </Suspense>
  );
}
