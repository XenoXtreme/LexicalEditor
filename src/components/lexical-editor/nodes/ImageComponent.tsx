
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
import NextImage from 'next/image'; // Using next/image

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
  imageRef: React.RefObject<HTMLImageElement | HTMLDivElement>; // HTMLDivElement for NextImage wrapper
  editor: LexicalEditor;
  nodeKey: NodeKey;
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
    editor.update(() => {
        const node = $getNodeByKey(nodeKey) as ImageNode | null;
        if ($isImageNode(node)) {
           setCurrentAltText(node.getAltText());
        }
    });
  }, [editor, nodeKey]);


  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  ) => {
    if (editorReadOnly) return; 

    const imageElement = imageRef.current; // This could be the NextImage wrapper or the img itself
    const controlWrapper = controlWrapperRef.current;

    if (imageElement && controlWrapper) {
      event.preventDefault();
      const targetImage = imageElement.querySelector('img') || imageElement as HTMLImageElement; // Get the actual img element
      const { width, height } = targetImage.getBoundingClientRect();
      
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
    const imageElement = imageRef.current;
    const positioning = positioningRef.current;

    if (imageElement && positioning.isResizing) {
      const targetImage = imageElement.querySelector('img') || imageElement as HTMLImageElement;
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

      // For NextImage, we might need to update its parent wrapper if it controls size
      // For a simple <img>, this is direct.
      targetImage.style.width = `${positioning.currentWidth}px`;
      targetImage.style.height = `${positioning.currentHeight}px`;
       // If NextImage parent wrapper needs to be sized
      if (imageElement !== targetImage && imageElement instanceof HTMLElement) {
        imageElement.style.width = `${positioning.currentWidth}px`;
        imageElement.style.height = `${positioning.currentHeight}px`;
      }
    }
  };
  const handlePointerUp = () => {
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
  showCaption, 
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
  const imageRef = useRef<HTMLDivElement | null>(null); // Changed to HTMLDivElement for NextImage wrapper
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [editor] = useLexicalComposerContext();
  const [selection, setSelection] = useState<any>(null); 
  const [isResizing, setIsResizing] = useState(false);

  const editorActuallyReadOnly = editor && typeof editor.isReadOnly === 'function' ? editor.isReadOnly() : true;


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
        setSelected(false); // Explicitly deselect
        return true;
      }
      return false;
    },
    [isSelected, clearSelection, setSelected],
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
          if (imageRef.current && imageRef.current.contains(event.target as Node)) {
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
          if (imageRef.current && imageRef.current.contains(event.target as Node)) {
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
    resizable,
  ]);


  const onResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback(
    (newWidth: number, newHeight: number) => {
      // Making sure that there is an editor instance.
      if (!editor) {
        return;
      }
      
      // Preventing updates when the editor is in read-only mode.
      if (editorActuallyReadOnly) {
          setIsResizing(false);
          return;
      }

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
    [editor, nodeKey, isResizing, editorActuallyReadOnly], 
  );


  const imageWidth = typeof width === 'number' ? width : (resizable ? 400 : undefined); // Default width for resizable if not set
  const imageHeight = typeof height === 'number' ? height : (resizable && imageWidth ? imageWidth * 0.75 : undefined); // Default aspect ratio


  return (
    <Suspense fallback={null}>
      <div 
        className={cn('relative inline-block group', isSelected && !editorActuallyReadOnly && 'outline outline-2 outline-primary outline-offset-2 rounded-sm')} 
        draggable={!editorActuallyReadOnly && isSelected}
        ref={imageRef} // Attach ref to the wrapper div for NextImage
        style={{ 
          width: typeof imageWidth === 'number' ? `${imageWidth}px` : 'auto',
          height: typeof imageHeight === 'number' ? `${imageHeight}px` : 'auto',
          cursor: isSelected && resizable && !editorActuallyReadOnly && !isResizing ? 'grab' : (isResizing ? 'grabbing': 'default')
        }}
      >
        <NextImage
          src={src}
          alt={altText}
          width={imageWidth || 400} // NextImage requires width/height, provide defaults
          height={imageHeight || 300}
          className={cn(
            'block', // Removed max-w-full and h-auto as NextImage handles this with layout or fixed sizes
            resizable && !editorActuallyReadOnly && isSelected && 'cursor-grab',
            resizable && !editorActuallyReadOnly && isResizing && 'cursor-grabbing',
          )}
          style={{ 
            // Let NextImage handle the internal sizing. The parent div now controls apparent size.
            // If you were using a plain <img>, you'd set width/height here.
          }}
          data-ai-hint={altText.split(' ').slice(0,2).join(' ') || 'image'} 
          unoptimized={src.startsWith('https://placehold.co')} // Avoid optimization for placeholders
        />
        {isSelected && resizable && !editorActuallyReadOnly && (
          <ImageResizer
            editor={editor}
            imageRef={imageRef as React.RefObject<HTMLDivElement>} // Pass the wrapper div ref
            nodeKey={nodeKey}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
          />
        )}
      </div>
    </Suspense>
  );
}

    