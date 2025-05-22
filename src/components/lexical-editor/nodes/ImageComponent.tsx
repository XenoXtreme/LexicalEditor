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

// Minimal set of nodes for the caption editor
const captionEditorNodes = [ParagraphNode, TextNode, LineBreakNode];


// Helper function to safely check editor read-only state by checking contenteditable attribute
function isEditorActuallyReadOnly(editor: LexicalEditor | null | undefined): boolean {
  if (!editor) {
    return true; // Default to read-only if editor is null or undefined
  }
  const rootElement = editor.getRootElement();
  if (rootElement) {
    return rootElement.contentEditable === 'false';
  }
  return true; // Default to read-only if root element not found
}

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef, // Ref to the actual <img> element
  editor: parentEditor,
  imageNodeKey,
}: {
  onResizeStart: () => void;
  onResizeEnd: (width: number, height: number) => void;
  imageRef: React.RefObject<HTMLImageElement>; // Changed to HTMLImageElement
  editor: LexicalEditor;
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
    lockAspectRatio: boolean;
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
    lockAspectRatio: false,
  });

  const editorReadOnly = isEditorActuallyReadOnly(parentEditor);
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

    const imageElement = imageRef.current;
    if (!imageElement) return;
    
    event.preventDefault();
    const { width, height } = imageElement.getBoundingClientRect();
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
    positioning.lockAspectRatio = event.shiftKey;


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
  };

  const handlePointerMove = (event: PointerEvent) => {
    const imageElement = imageRef.current;
    const positioning = positioningRef.current;

    if (imageElement && positioning.isResizing) {
      let newWidth = positioning.startWidth;
      let newHeight = positioning.startHeight;

      const diffX = event.clientX - positioning.startX;
      const diffY = event.clientY - positioning.startY;

      if ([0, 3, 5].includes(positioning.direction)) { // Left handles
        newWidth -= diffX;
      }
      if ([2, 4, 7].includes(positioning.direction)) { // Right handles
        newWidth += diffX;
      }
      if ([0, 1, 2].includes(positioning.direction)) { // Top handles
        newHeight -= diffY;
      }
      if ([5, 6, 7].includes(positioning.direction)) { // Bottom handles
        newHeight += diffY;
      }
      
      const minSize = 50;
      newWidth = Math.max(newWidth, minSize);
      newHeight = Math.max(newHeight, minSize);

      if (positioning.lockAspectRatio) {
        // Adjust based on the primary axis of drag or the larger change
        if (positioning.direction === 1 || positioning.direction === 6) { // N, S
          newWidth = newHeight * positioning.ratio;
        } else if (positioning.direction === 3 || positioning.direction === 4) { // W, E
          newHeight = newWidth / positioning.ratio;
        } else { // Corners
            // Determine dominant drag axis for aspect ratio lock on corners
            if (Math.abs(diffX) > Math.abs(diffY)) {
                newHeight = newWidth / positioning.ratio;
            } else {
                newWidth = newHeight * positioning.ratio;
            }
        }
        newWidth = Math.max(newWidth, minSize);
        newHeight = Math.max(newHeight, minSize);
      }


      positioning.currentWidth = newWidth;
      positioning.currentHeight = newHeight;

      imageElement.style.width = `${positioning.currentWidth}px`;
      imageElement.style.height = `${positioning.currentHeight}px`;
    }
  };
  const handlePointerUp = (event: PointerEvent) => {
    const imageElement = imageRef.current;
    const positioning = positioningRef.current;
    if (imageElement && positioning.isResizing) {
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
              className="absolute bg-primary border border-primary-foreground rounded-sm w-3 h-3 opacity-80 hover:opacity-100 pointer-events-auto" // Changed to square
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
  captionEditor: captionEditorInstance,
  resizable,
  editor: parentEditor,
}: {
  src: string;
  altText: string;
  width?: 'inherit' | number;
  height?: 'inherit' | number;
  nodeKey: NodeKey;
  showCaption?: boolean;
  captionEditor?: LexicalEditor;
  resizable?: boolean;
  editor: LexicalEditor;
}): JSX.Element {
  const imageWrapperRef = useRef<HTMLDivElement | null>(null); // For the outer div, controls selection outline
  const imgRef = useRef<HTMLImageElement | null>(null); // Direct ref to <img> for resizer
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState(false);

  const editorReadOnly = isEditorActuallyReadOnly(parentEditor);

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
          // Potential future use: setSelection(editorState.read($getSelection));
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
            const target = event.target as Node;
            // Prevent dragging if the target is one of the resizer handles
            if (imgRef.current && imgRef.current.parentElement?.contains(target) && target !== imgRef.current) {
                const controlWrapper = imgRef.current.parentElement.querySelector('[data-lexical-image-resizer]');
                if (controlWrapper && controlWrapper.contains(target)) {
                     event.preventDefault();
                     return true;
                }
            }

            if (imageWrapperRef.current && imageWrapperRef.current.contains(event.target as Node)) {
                if (isSelected || resizable) event.preventDefault(); // Prevent native image drag
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
      if (editorReadOnly) {
          setIsResizing(false);
          return;
      }
      setIsResizing(false); // Always set resizing to false after operation
      parentEditor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isImageNode(node)) {
          node.setWidthAndHeight(newWidth, newHeight);
        }
      });
    },
    [parentEditor, nodeKey, editorReadOnly],
  );

  const handleAddCaptionHandler = () => {
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
          'relative inline-block group editor-image', // editor-image is key for some global styles
           isSelected && !editorReadOnly && 'outline outline-2 outline-primary outline-offset-2 rounded-sm'
        )}
        draggable={!editorReadOnly && isSelected && !isResizing} // Prevent dragging while resizing
        ref={imageWrapperRef}
        style={{
          width: width !== 'inherit' ? `${imageInitialWidth}px` : 'auto',
          // height: imageInitialHeight !== 'inherit' ? `${imageInitialHeight}px` : 'auto', // Height will be auto or set by resizer
          cursor: isSelected && resizable && !editorReadOnly && !isResizing ? 'grab' : (isResizing ? 'grabbing': 'default')
        }}
      >
        <div className="relative" data-lexical-image-resizer> {/* Wrapper for image and Add Caption button */}
            <img
              ref={imgRef}
              src={src}
              alt={altText}
              className={cn(
                'block',
                (typeof imageInitialWidth !== 'number') && 'max-w-full h-auto', // Allow natural size if not set
                (typeof imageInitialHeight !== 'number') && 'h-auto',
              )}
              style={{
                width: width !== 'inherit' ? `${imageInitialWidth}px` : 'auto',
                height: height !== 'inherit' ? `${imageInitialHeight}px` : 'auto',
              }}
              data-ai-hint={altText.split(' ').slice(0,2).join(' ') || 'image'}
            />
            {isSelected && !showCaption && !editorReadOnly && (
                 <Button
                    onClick={handleAddCaptionHandler}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white hover:bg-black/90 h-8 px-3 text-xs pointer-events-auto"
                    size="sm"
                  >
                    <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
                    Add Caption
                  </Button>
            )}
        </div>

        {isSelected && resizable && !editorReadOnly && imgRef.current && (
          <ImageResizer
            editor={parentEditor}
            imageRef={imgRef} // Pass the <img> ref
            imageNodeKey={nodeKey}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
          />
        )}
      </div>
      {showCaption && captionEditorInstance && (
        <div className="image-caption-editor-wrapper mt-1 p-2 border border-input rounded bg-muted/20 focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-2 rounded-b-md">
          <LexicalNestedComposer
            initialEditor={captionEditorInstance}
            initialNodes={captionEditorNodes}
            initialTheme={{
              paragraph: 'editor-image-caption-paragraph',
              placeholder: 'editor-placeholder text-sm text-center absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none',
            }}
            skipCollabChecks={true}
          >
            <RichTextPlugin
              contentEditable={<ContentEditable className="outline-none min-h-[20px] text-sm text-center caption-content-editable" />}
              placeholder={<div className="editor-placeholder">Type a caption...</div>}
              ErrorBoundary={({onError}) => { console.error("Caption editor error:", onError); return <div>Caption Error</div>;}}
            />
            <HistoryPlugin />
          </LexicalNestedComposer>
        </div>
      )}
    </Suspense>
  );
}

