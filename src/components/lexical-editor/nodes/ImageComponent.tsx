
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
  ParagraphNode, TextNode, LineBreakNode, $isElementNode,
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

const captionEditorNodes = [ParagraphNode, TextNode, LineBreakNode]; // Nodes for the caption editor

function isEditorActuallyReadOnly(editor: LexicalEditor | null | undefined): boolean {
  if (!editor || typeof editor.isEditable() !== 'function') {
    return true; // Default to read-only if editor or method is invalid
  }
  return editor.isEditable();
}

function ImageResizer({
  onResizeStart,
  onResizeEnd,
  imageRef,
  editor: parentEditor,
  imageNodeKey,
}: {
  onResizeStart: () => void;
  onResizeEnd: (width: number, height: number) => void;
  imageRef: React.RefObject<HTMLImageElement>;
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
    direction: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // NW, N, NE, W, E, SW, S, SE
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
    const editorState = parentEditor.getEditorState();
    editorState.read(() => {
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
    positioning.lockAspectRatio = event.shiftKey; // Lock aspect ratio if Shift is pressed


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

      // Horizontal resizing
      if ([0, 3, 5].includes(positioning.direction)) { // Left handles (NW, W, SW)
        newWidth -= diffX;
      }
      if ([2, 4, 7].includes(positioning.direction)) { // Right handles (NE, E, SE)
        newWidth += diffX;
      }

      // Vertical resizing
      if ([0, 1, 2].includes(positioning.direction)) { // Top handles (NW, N, NE)
        newHeight -= diffY;
      }
      if ([5, 6, 7].includes(positioning.direction)) { // Bottom handles (SW, S, SE)
        newHeight += diffY;
      }

      const minSize = 50; // Minimum size for width and height
      newWidth = Math.max(newWidth, minSize);
      newHeight = Math.max(newHeight, minSize);

      if (positioning.lockAspectRatio) {
        // Adjust width or height based on the primary direction of drag or handle type
        if (positioning.direction === 1 || positioning.direction === 6) { // N or S handles (vertical resize primary)
          newWidth = newHeight * positioning.ratio;
        } else if (positioning.direction === 3 || positioning.direction === 4) { // W or E handles (horizontal resize primary)
          newHeight = newWidth / positioning.ratio;
        } else { // Corner handles
          // Prioritize the dimension that changed more, or maintain aspect ratio based on width if both changed similarly
          if (Math.abs(diffX) > Math.abs(diffY)) {
            newHeight = newWidth / positioning.ratio;
          } else {
            newWidth = newHeight * positioning.ratio;
          }
        }
        // Re-check min size after aspect ratio adjustment
        newWidth = Math.max(newWidth, minSize);
        newHeight = Math.max(newHeight, minSize);
      }


      positioning.currentWidth = newWidth;
      positioning.currentHeight = newHeight;

      imageElement.style.width = `${positioning.currentWidth}px`;
      imageElement.style.height = `${positioning.currentHeight}px`;
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
    <div ref={controlWrapperRef} className="absolute inset-0 z-10 pointer-events-none" data-lexical-image-resizer>
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
              className="absolute bg-primary border border-primary-foreground rounded-sm w-3 h-3 opacity-80 hover:opacity-100 pointer-events-auto"
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
  captionEditor: captionEditorInstance, // Renamed to avoid conflict with parentEditor
  resizable,
  editor: parentEditor, // This is the main editor instance
}: {
  src: string;
  altText: string;
  width?: 'inherit' | number;
  height?: 'inherit' | number;
  nodeKey: NodeKey;
  showCaption?: boolean;
  captionEditor?: LexicalEditor; // This is the dedicated editor for the caption
  resizable?: boolean;
  editor: LexicalEditor; // Main editor instance
}): JSX.Element {
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null); // Ref for the actual <img> tag
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [isResizing, setIsResizing] = useState(false);

  const editorReadOnly = isEditorActuallyReadOnly(parentEditor);

  const onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        parentEditor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isImageNode(node)) {
            node.remove();
          }
        });
        return true;
      }
      return false;
    },
    [isSelected, nodeKey, parentEditor, clearSelection],
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
          // Potential future use for reacting to editor state changes
        }
      }),
      parentEditor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (payload) => {
          const event = payload;
          if (isResizing) return true; // Don't change selection while resizing

          const target = event.target as Node;
          // Check if the click is within the caption editor
          const captionEditorElement = imageWrapperRef.current?.querySelector('.image-caption-editor-wrapper');
          if (captionEditorElement && captionEditorElement.contains(target)) {
            // If caption is clicked, do not select the image node itself, let caption editor handle focus.
            // However, if the image itself was previously selected, we might want to keep it selected or clear selection
            // depending on desired UX. For now, let's assume clicking caption means interacting with caption.
            return false; // Let caption editor handle clicks within its bounds
          }
          
          // Check if click is on the image or its wrapper (but not caption)
          if (imageWrapperRef.current && imageWrapperRef.current.contains(target)) {
            if (!event.shiftKey) {
              clearSelection(); // Clear other selections
            }
            setSelected(true); // Select this image
            return true; // Event handled
          }

          // If clicked outside, and this image was selected, clear selection
          if (isSelected) {
            clearSelection();
            setSelected(false);
          }
          return false; // Event not handled by this image
        },
        COMMAND_PRIORITY_LOW,
      ),
      parentEditor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => {
            const target = event.target as Node;
            // Prevent native image dragging if the image is selected and resizable, or currently resizing
            if (imageWrapperRef.current && imageWrapperRef.current.contains(target)) {
                if ((isSelected && resizable && !editorReadOnly) || isResizing) {
                    event.preventDefault();
                    return true;
                }
            }
            return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      parentEditor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      parentEditor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      parentEditor.registerCommand(KEY_ESCAPE_COMMAND, onEscape, COMMAND_PRIORITY_LOW),
      parentEditor.registerCommand(KEY_ENTER_COMMAND, (event) => {
        // Prevent inserting paragraphs or splitting the image node when it's selected and Enter is pressed.
        // You might want to customize this to insert a paragraph after the image, for example.
        if (isSelected && $isNodeSelection($getSelection())) {
            event?.preventDefault();
            return true;
        }
        return false;
      }, COMMAND_PRIORITY_LOW)
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
    editorReadOnly,
  ]);


  const onResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const onResizeEnd = useCallback(
    (newWidth: number, newHeight: number) => {
      // If the editor is read-only, don't persist the resize
      if (editorReadOnly) {
          setIsResizing(false);
          return;
      }
      setIsResizing(false);
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
    if (editorReadOnly) return;
    parentEditor.update(() => {
        const node = $getNodeByKey(nodeKey) as ImageNode | null;
        if ($isImageNode(node)) {
            node.setShowCaption(true);
        }
    });
  };

  const imageCurrentWidth = typeof width === 'number' ? width : 'auto';
  const imageCurrentHeight = typeof height === 'number' ? height : 'auto';

  return (
    <Suspense fallback={null}>
      <div
        className={cn(
          'relative inline-block group editor-image', // `editor-image` class for global styling
           isSelected && !editorReadOnly && 'outline outline-2 outline-primary outline-offset-2 rounded-sm' // Blue outline when selected
        )}
        draggable={!editorReadOnly && isSelected && !isResizing} // Make draggable if selected and not resizing
        ref={imageWrapperRef}
        style={{
          width: imageCurrentWidth === 'auto' ? undefined : `${imageCurrentWidth}px`, // Apply width for layout
          // height: imageCurrentHeight === 'auto' ? undefined : `${imageCurrentHeight}px`, // Height is often auto
          cursor: isSelected && resizable && !editorReadOnly && !isResizing ? 'grab' : (isResizing ? 'grabbing': 'default')
        }}
      >
        <div className="relative" data-lexical-image-resizer-container> {/* Container for image and resizer */}
            <img
              ref={imgRef} // Ref to the actual <img> tag
              src={src}
              alt={altText}
              className={cn('block', imageCurrentWidth === 'auto' && 'max-w-full', imageCurrentHeight === 'auto' && 'h-auto')}
              style={{
                width: imageCurrentWidth === 'auto' ? undefined : `${imageCurrentWidth}px`,
                height: imageCurrentHeight === 'auto' ? undefined : `${imageCurrentHeight}px`,
              }}
              data-ai-hint={altText.split(' ').slice(0,2).join(' ') || 'image'} // AI hint for image search
            />
            {/* "Add Caption" button appears on hover when image selected and no caption shown */}
            {isSelected && !showCaption && !editorReadOnly && (
                 <Button
                    onClick={handleAddCaptionHandler}
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white hover:bg-black/90 h-8 px-3 text-xs pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    size="sm"
                  >
                    <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
                    Add Caption
                  </Button>
            )}
        </div>

        {/* ImageResizer component, shown when selected and resizable */}
        {isSelected && resizable && !editorReadOnly && imgRef.current && (
          <ImageResizer
            editor={parentEditor}
            imageRef={imgRef}
            imageNodeKey={nodeKey}
            onResizeStart={onResizeStart}
            onResizeEnd={onResizeEnd}
          />
        )}
      </div>
      {/* Caption Editor, rendered if showCaption is true and captionEditor instance exists */}
      {showCaption && captionEditorInstance && (
        <div className="image-caption-editor-wrapper mt-1 p-2 border border-input rounded bg-muted/20 focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-2 rounded-b-md max-w-full"
         style={{ width: imageCurrentWidth === 'auto' ? 'fit-content' : `${imageCurrentWidth}px` }} // Match caption width to image width
        >
          <LexicalNestedComposer
            initialEditor={captionEditorInstance} // The dedicated LexicalEditor for this caption
            initialNodes={captionEditorNodes} // Nodes allowed in the caption
            initialTheme={{ // Theme for the caption editor
              paragraph: 'editor-image-caption-paragraph', // Custom class for caption paragraph
              placeholder: 'editor-placeholder text-sm text-center absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none',
            }}
            skipCollabChecks={true} // Important for nested editors
          >
            <RichTextPlugin
              contentEditable={<ContentEditable className="outline-none min-h-[20px] text-sm text-center caption-content-editable" />}
              placeholder={<div className="editor-placeholder">Type a caption...</div>} // Placeholder text
              ErrorBoundary={({onError}) => { console.error("Caption editor error:", onError); return <div>Caption Error</div>;}}
            />
            <HistoryPlugin /> {/* Enable undo/redo for caption */}
          </LexicalNestedComposer>
        </div>
      )}
    </Suspense>
  );
}
