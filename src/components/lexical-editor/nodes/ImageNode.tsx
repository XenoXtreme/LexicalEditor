
"use client";

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditor,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import { $applyNodeReplacement, DecoratorNode, createEditor, $createParagraphNode, ParagraphNode, TextNode, LineBreakNode } from 'lexical';
import * as React from 'react';
import { Suspense } from 'react';

const ImageComponent = React.lazy(
  () => import('./ImageComponent'),
);

// Minimal set of nodes for the caption editor
const captionEditorNodes = [ParagraphNode, TextNode, LineBreakNode];


function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src, width, height } = domNode;
    const node = $createImageNode({ altText, src, width, height });
    return { node };
  }
  return null;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    height?: number;
    src: string;
    width?: number;
    showCaption?: boolean;
    caption?: SerializedEditor; // Store caption as SerializedEditor
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __showCaption: boolean;
  __caption: LexicalEditor;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    const newCaptionEditor = createEditor({
      nodes: captionEditorNodes,
      onError: (error) => console.error('Caption editor error (clone):', error),
      theme: {
        paragraph: 'editor-image-caption-paragraph', // Ensure this matches your theme
      }
    });

    try {
      const originalCaptionState = node.__caption.getEditorState();
      if (originalCaptionState && typeof originalCaptionState.clone === 'function') {
        const clonedOriginalCaptionState = originalCaptionState.clone();

        if (clonedOriginalCaptionState && typeof clonedOriginalCaptionState.isEmpty === 'function' && !clonedOriginalCaptionState.isEmpty()) {
          newCaptionEditor.setEditorState(clonedOriginalCaptionState);
        } else if (clonedOriginalCaptionState && typeof clonedOriginalCaptionState.isEmpty === 'function' && clonedOriginalCaptionState.isEmpty()) {
          // The newCaptionEditor already has a default non-empty state with a paragraph.
          // console.warn("ImageNode.clone: Cloned caption state was empty. New caption editor will use its default state.");
        } else {
          // console.error("ImageNode.clone: clonedOriginalCaptionState is not a valid EditorState or does not have isEmpty method. Using default state.");
        }
      } else {
        // console.error("ImageNode.clone: Original caption state is invalid or does not have clone method. Using default state.");
      }
    } catch (e) {
      // console.error("ImageNode.clone: Error processing caption state. New caption editor will use its default state.", e);
    }

    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__showCaption,
      newCaptionEditor,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, src, width, showCaption, caption: serializedCaption } = serializedNode;

    let initialCaptionEditorStateString: string | undefined;

    if (showCaption && serializedCaption && serializedCaption.editorState) {
        try {
            const tempEditorForParsing = createEditor({ nodes: captionEditorNodes, onError: () => {} });
            const parsedState = tempEditorForParsing.parseEditorState(serializedCaption.editorState);

            if (parsedState.isEmpty()) {
                // console.warn("ImageNode.importJSON: Serialized caption was empty. Initializing with default.");
            } else {
                initialCaptionEditorStateString = JSON.stringify(parsedState.toJSON());
            }
        } catch (e) {
            // console.error("ImageNode.importJSON: Error parsing serialized caption state. Initializing with default.", e);
        }
    }

    const captionEditor = createEditor({
        nodes: captionEditorNodes,
        editorState: initialCaptionEditorStateString,
        theme: {
          paragraph: 'editor-image-caption-paragraph',
        },
        onError: (error) => console.error('Caption editor error (importJSON):', error),
    });

    const node = new ImageNode(
        src,
        altText,
        width,
        height,
        showCaption,
        captionEditor,
    );
    return node;
  }

  constructor(
    src: string,
    altText: string,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__showCaption = showCaption || false;
    this.__caption = caption || createEditor({
        nodes: captionEditorNodes,
        theme: {
          paragraph: 'editor-image-caption-paragraph',
          text: { // Basic text styles for caption editor
            bold: 'font-bold',
            italic: 'italic',
          }
        },
        onError: (error) => { console.error('Caption editor error (constructor):', error); },
    });
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? undefined : this.__height,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? undefined : this.__width,
      showCaption: this.__showCaption,
      caption: (this.__showCaption && this.__caption) ? this.__caption.getEditorState().toJSON() : undefined,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(prevNode: ImageNode, dom: HTMLElement, config: EditorConfig): boolean {
    // This method is primarily for updating DOM attributes directly.
    // Since ImageComponent handles rendering, extensive logic here might be redundant
    // unless specific attributes on the wrapper span need to change.
    if (prevNode.__showCaption !== this.__showCaption) {
      return true; // Trigger re-render of decorator component
    }
    if (prevNode.__src !== this.__src || prevNode.__altText !== this.__altText || prevNode.__width !== this.__width || prevNode.__height !== this.__height) {
        return true; // Trigger re-render if these core props change
    }
    return false;
  }

  getSrc(): string {
    return this.getLatest().__src;
  }

  getAltText(): string {
    return this.getLatest().__altText;
  }

  getWidth(): 'inherit' | number {
    return this.getLatest().__width;
  }

  getHeight(): 'inherit' | number {
    return this.getLatest().__height;
  }

  getShowCaption(): boolean {
    return this.getLatest().__showCaption;
  }

  getCaptionEditor(): LexicalEditor {
    return this.getLatest().__caption;
  }

  setWidthAndHeight(width: 'inherit' | number, height: 'inherit' | number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    if (writable.__showCaption !== showCaption) { // Only update if different
        writable.__showCaption = showCaption;
        // If caption is being shown for the first time, ensure it has content
        if (showCaption && writable.__caption.getEditorState().isEmpty()) {
            writable.__caption.update(() => {
                const root = writable.__caption.getRootElement();
                if (root && root.isEmpty()) {
                    root.append($createParagraphNode());
                }
            });
        }
    }
  }

  isResizable(): boolean {
    return true;
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return (
      <Suspense fallback={null}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
          width={this.__width}
          height={this.__height}
          nodeKey={this.getKey()}
          showCaption={this.__showCaption}
          captionEditor={this.__caption} // Pass the editor instance
          resizable={this.isResizable()}
          editor={editor} // Pass the main editor instance
        />
      </Suspense>
    );
  }

   static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
      // Could add conversion for figures with figcaptions later
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);
    if (element && element instanceof HTMLElement) { // Ensure element is HTMLElement
      const img = document.createElement('img');
      img.setAttribute('src', this.__src);
      img.setAttribute('alt', this.__altText);
      if (this.__width !== 'inherit') {
        img.setAttribute('width', String(this.__width));
      }
      if (this.__height !== 'inherit') {
        img.setAttribute('height', String(this.__height));
      }
      element.appendChild(img);

      // Export caption if shown
      if (this.__showCaption && this.__caption) {
        const captionDiv = document.createElement('div');
        captionDiv.setAttribute('data-lexical-image-caption', 'true'); // For potential re-import logic
        // A simple text content export for caption for now.
        // For full fidelity, you'd need to serialize the caption editor's state to HTML.
        this.__caption.getEditorState().read(() => {
            const captionText = this.__caption.getRootElement()?.getTextContent();
            captionDiv.textContent = captionText || '';
        });
        element.appendChild(captionDiv);
      }
    }
    return {element};
  }
}

export type ImagePayload = {
  altText: string;
  height?: 'inherit' | number;
  src: string;
  width?: 'inherit' | number;
  showCaption?: boolean;
  caption?: LexicalEditor; // For internal use when creating node
  key?: NodeKey;
};


export function $createImageNode({
  altText,
  height,
  src,
  width,
  showCaption,
  caption, // This would typically not be passed directly on initial creation from user input
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      src,
      altText,
      width,
      height,
      showCaption,
      caption, // caption editor instance
      key
    )
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}

