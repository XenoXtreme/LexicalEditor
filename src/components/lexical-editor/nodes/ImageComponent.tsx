
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
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { $isImageNode, ImageNode } from './ImageNode.tsx'; // Assuming ImageNode is in the same directory
import NextImage from 'next/image'; // Using next/image for optimization
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Trash2, Edit3, Check, X } from 'lucide-react'; // Icons

// TODO: Resizer logic can be complex. This is a simplified version.
// Consider using a library or a more robust implementation for production.

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef,
  editor,
  nodeKey,
  showCaption,
  setShowCaption,
}: {
  onResizeStart: () => void;
  onResizeEnd: (width: number, height: number) => void;
  imageRef: React.RefObject<HTMLImageElement>;
  editor: LexicalEditor;
  nodeKey: NodeKey;
  showCaption: boolean;
  setShowCaption: (show: boolean) => void;
}): JSX.Element {
  const controlWrapperRef = useRef<HTMLDivElement>(null);
  const userSelect = useRef({
    priority: '',
    value: 'default',
  });
  const positioningRef = useRef<{
    currentHeight: 'inherit' | number;
    currentWidth: 'inherit' | number;
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

  const editorSetReadOnly = editor.isReadOnly(); // Check if editor is read-only

  const draggable = !editorSetReadOnly; // Make draggable only if editor is not read-only

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
    if (!draggable) return; // Prevent interaction if not draggable

    const image = imageRef.current;
    const controlWrapper = controlWrapperRef.current;

    if (image && controlWrapper) {
      event.preventDefault();
      const { width, height } = image.getBoundingClientRect();
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
    const image = imageRef.current;
    const positioning = positioningRef.current;

    if (image && positioning.isResizing) {
      let newWidth = positioning.startWidth;
      let newHeight = positioning.startHeight;

      const diffX = event.clientX - positioning.startX;
      const diffY = event.clientY - positioning.startY;

      // Basic logic - can be enhanced for diagonal resizing
      if (positioning.direction === 0 || positioning.direction === 2) { // Horizontal
        newWidth += (positioning.direction === 0 ? -1 : 1) * diffX;
      } else if (positioning.direction === 1 || positioning.direction === 3) { // Vertical
        newHeight += (positioning.direction === 1 ? -1 : 1) * diffY;
      }
      // Add more conditions for diagonal resizing if needed

      // Maintain aspect ratio (optional, can be toggled)
      // if (newWidth / newHeight !== positioning.ratio) {
      //   newWidth = newHeight * positioning.ratio;
      // }


      positioning.currentWidth = Math.max(newWidth, 50); // Min width 50px
      positioning.currentHeight = Math.max(newHeight, 50); // Min height 50px

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
      onResizeEnd(width, height); // Call onResizeEnd with final dimensions

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


  const directions: ('n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw')[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
  const cursors = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'ew-resize', 'nesw-resize', 'ns-resize', 'nwse-resize'];


  return (
    <div ref={controlWrapperRef} className="absolute inset-0 z-10">
      {!editorSetReadOnly && (
        <>
         {/* Alt text editing UI */}
         <div className="absolute top-2 left-2 bg-background/80 p-1 rounded shadow-md flex items-center gap-1 text-xs">
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

          {/* Resizer handles */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((direction) => (
            <div
              key={direction}
              className="absolute bg-primary border border-primary-foreground rounded-full w-3 h-3 opacity-80 hover:opacity-100"
              style={{
                cursor: cursors[direction],
                left: direction % 3 === 0 ? '-4px' : direction % 3 === 1 ? 'calc(50% - 6px)' : undefined,
                right: direction % 3 === 2 ? '-4px' : undefined,
                top: Math.floor(direction / 3) === 0 ? '-4px' : Math.floor(direction / 3) === 1 ? 'calc(50% - 6px)' : undefined,
                bottom: Math.floor(direction / 3) === 2 ? '-4px' : undefined,
                // Hide center handles if not needed for design
                display: (direction === 1 || direction === 3 || direction === 4 || direction === 6) ? 'block' : 'block', // Adjust based on desired handles
              }}
              onPointerDown={(event) => handlePointerDown(event, direction as any)}
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
  caption, // LexicalEditor instance for the caption
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
  const [selection, setSelection] = useState(null); // For managing Lexical selection
  const [isResizing, setIsResizing] = useState(false);


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
      // Logic for handling Enter key, e.g., to edit caption or insert paragraph after
      return false; // Placeholder
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
          if (isResizing) return true; // Prevent selection change during resize
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
            // Prevent dragging behavior for read-only images or to avoid conflicts
            event.preventDefault();
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
  ]);


  const onResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback(
    (newWidth: number, newHeight: number) => {
      if (isResizing) { // Ensure this only runs if resizing was active
        setIsResizing(false);
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.setWidthAndHeight(newWidth, newHeight);
          }
        });
      }
    },
    [editor, nodeKey, isResizing], // Added isResizing dependency
  );

  const setShowCaption = (show: boolean) => {
     editor.update(() => {
      const node = $getNodeByKey(nodeKey) as ImageNode | null;
      if (node && $isImageNode(node)) {
        node.setShowCaption(show);
      }
    });
  };


  const W = typeof width === 'number' ? width : 400; // Default width if 'inherit'
  const H = typeof height === 'number' ? height : 300; // Default height if 'inherit'

  return (
    <Suspense fallback={null}>
      <div className={cn('relative inline-block', isSelected && 'outline outline-2 outline-primary outline-offset-2 rounded-sm')} draggable={!editor.isReadOnly()}>
        <NextImage
          ref={imageRef}
          src={src}
          alt={altText}
          width={W} // next/image requires explicit numbers or "fill"
          height={H}
          className={cn('max-w-full h-auto block', resizable && 'cursor-grab')}
          style={{
            width: width === 'inherit' ? 'auto' : `${width}px`,
            height: height === 'inherit' ? 'auto' : `${height}px`,
          }}
          data-ai-hint={altText.split(' ').slice(0,2).join(' ') || 'image'} // Add data-ai-hint
        />
        {isSelected && resizable && (
          <ImageResizer
            editor={editor}
            imageRef={imageRef}
            nodeKey={nodeKey}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
            showCaption={!!showCaption}
            setShowCaption={setShowCaption}
          />
        )}
      </div>
      {/* TODO: Implement caption rendering if showCaption is true and caption editor exists */}
      {/* {showCaption && caption && <LexicalNestedComposer initialEditor={caption}><RichTextPlugin ... /></LexicalNestedComposer>} */}
    </Suspense>
  );
}
