
"use client";
import type { LexicalEditor, NodeKey } from 'lexical';
import * as React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
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
} from 'lexical';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { $isImageNode, ImageNode } from './ImageNode.tsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Trash2, Edit3, Check, X } from 'lucide-react';

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
  editor,
  nodeKey,
}: {
  onResizeStart: () => void;
  onResizeEnd: (width: number, height: number) => void;
  imageRef: React.RefObject<HTMLImageElement>;
  editor: LexicalEditor;
  nodeKey: NodeKey;
  // showCaption and setShowCaption are removed as caption feature is not implemented
}): JSX.Element {
  const controlWrapperRef = useRef<HTMLDivElement>(null);
  const userSelect = useRef({
    priority: '',
    value: 'default',
  });
  const positioningRef = useRef<{
    currentHeight: number;
    currentWidth: number;
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0: NW, 1: N, ..., 7: SE
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

  const editorReadOnly = isEditorReadOnly(editor);

  const [isEditingAlt, setIsEditingAlt] = useState(false);
  const [currentAltText, setCurrentAltText] = useState('');


  useEffect(() => {
    const image = imageRef.current;
    if (image) {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as ImageNode | null;
            if ($isImageNode(node)) {
               setCurrentAltText(node.getAltText());
            }
        });
    }
  }, [editor, imageRef, nodeKey]);


  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  ) => {
    if (editorReadOnly) return; 

    const image = imageRef.current;
    const controlWrapper = controlWrapperRef.current;

    if (image && controlWrapper) {
      event.preventDefault();
      const { width, height } = image.getBoundingClientRect();
      const positioning = positioningRef.current;
      positioning.startWidth = width;
      positioning.startHeight = height;
      positioning.ratio = width / height; // Keep for potential aspect ratio lock later
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
    const image = imageRef.current;
    const positioning = positioningRef.current;

    if (image && positioning.isResizing) {
      let newWidth = positioning.startWidth;
      let newHeight = positioning.startHeight;

      const diffX = event.clientX - positioning.startX;
      const diffY = event.clientY - positioning.startY;

      // Directions: 0:NW, 1:N, 2:NE, 3:W, 4:E, 5:SW, 6:S, 7:SE
      if ([0, 3, 5].includes(positioning.direction)) { // West edge
        newWidth -= diffX;
      }
      if ([2, 4, 7].includes(positioning.direction)) { // East edge
        newWidth += diffX;
      }
      if ([0, 1, 2].includes(positioning.direction)) { // North edge
        newHeight -= diffY;
      }
      if ([5, 6, 7].includes(positioning.direction)) { // South edge
        newHeight += diffY;
      }
      
      // Min size
      const minSize = 50;
      positioning.currentWidth = Math.max(newWidth, minSize); 
      positioning.currentHeight = Math.max(newHeight, minSize); 

      image.style.width = `${positioning.currentWidth}px`;
      image.style.height = `${positioning.currentHeight}px`;
    }
  };
  const handlePointerUp = () => {
    const image = imageRef.current;
    const positioning = positioningRef.current;
    if (image && positioning.isResizing) {
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
    editor.update(() => {
      const node = $getNodeByKey(nodeKey) as ImageNode | null;
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
  showCaption, // Kept for potential future use, but not active
  caption, 
  resizable,
}: {
  src: string;
  altText: string;
  width?: 'inherit' | number;
  height?: 'inherit' | number;
  nodeKey: NodeKey;
  showCaption?: boolean;
  caption?: LexicalEditor;
  resizable?: boolean;
}): JSX.Element {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [editor] = useLexicalComposerContext();
  const [selection, setSelection] = useState<any>(null); 
  const [isResizing, setIsResizing] = useState(false);

  const editorReadOnly = isEditorReadOnly(editor);

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

  const onEnter = useCallback(
    (event: KeyboardEvent) => {
      return false; 
    },
    [],
  );

  const onEscape = useCallback(
    (event: KeyboardEvent) => {
      if (isSelected) {
        clearSelection();
        return true;
      }
      return false;
    },
    [isSelected, clearSelection],
  );

  useEffect(() => {
    let isMounted = true;
    const unregister = mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        if (isMounted) {
          setSelection(editorState.read($getSelection));
        }
      }),
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (payload) => {
          const event = payload;
          if (isResizing) return true; 
          if (event.target === imageRef.current) {
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
      editor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => {
          if (event.target === imageRef.current) {
            // Prevent native drag for selected images if we're handling selection/resizing
             if(isSelected || resizable) event.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ENTER_COMMAND, onEnter, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ESCAPE_COMMAND, onEscape, COMMAND_PRIORITY_LOW),
    );
    return () => {
      isMounted = false;
      unregister();
    };
  }, [
    clearSelection,
    editor,
    isResizing,
    isSelected,
    nodeKey,
    onDelete,
    onEnter,
    onEscape,
    setSelected,
    resizable, // Added resizable
  ]);


  const onResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback(
    (newWidth: number, newHeight: number) => {
      if (isResizing) { 
        setIsResizing(false);
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setWidthAndHeight(newWidth, newHeight);
          }
        });
      }
    },
    [editor, nodeKey, isResizing], 
  );

  // setShowCaptionHandler is removed as caption feature is not implemented

  const W = typeof width === 'number' ? width : (imageRef.current?.naturalWidth || 400); 
  const H = typeof height === 'number' ? height : (imageRef.current?.naturalHeight || 300); 

  const currentImageWidth = typeof width === 'number' ? `${width}px` : 'auto';
  const currentImageHeight = typeof height === 'number' ? `${height}px` : 'auto';

  return (
    <Suspense fallback={null}>
      <div className={cn('relative inline-block group', isSelected && 'outline outline-2 outline-primary outline-offset-2 rounded-sm')} draggable={!editorReadOnly && isSelected}>
        <img
          ref={imageRef}
          src={src}
          alt={altText}
          className={cn(
            'max-w-full h-auto block', 
            resizable && !editorReadOnly && isSelected && 'cursor-grab',
            resizable && !editorReadOnly && isResizing && 'cursor-grabbing',
          )}
          style={{
            width: currentImageWidth,
            height: currentImageHeight,
          }}
          data-ai-hint={altText.split(' ').slice(0,2).join(' ') || 'image'} 
        />
        {isSelected && resizable && !editorReadOnly && (
          <ImageResizer
            editor={editor}
            imageRef={imageRef}
            nodeKey={nodeKey}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
          />
        )}
      </div>
      {/* {showCaption && caption && <LexicalNestedComposer initialEditor={caption}><RichTextPlugin ... /></LexicalNestedComposer>} */}
    </Suspense>
  );
}
