
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

import { $applyNodeReplacement, DecoratorNode, createEditor, $createParagraphNode, $createTextNode, ParagraphNode, TextNode, LineBreakNode } from 'lexical';
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
    const captionEditor = createEditor({
      nodes: captionEditorNodes,
      onError: (error) => console.error('Caption editor error (clone):', error),
    });
    captionEditor.setEditorState(node.__caption.getEditorState().clone());

    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__showCaption,
      captionEditor, 
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, src, width, showCaption, caption: serializedCaption } = serializedNode;
    
    const captionEditor = createEditor({
        nodes: captionEditorNodes,
        onError: (error) => console.error('Caption editor error (importJSON):', error),
    });

    if (serializedCaption) {
      try {
        const editorState = captionEditor.parseEditorState(serializedCaption.editorState);
        captionEditor.setEditorState(editorState);
      } catch (e) {
        console.error("Error parsing caption editor state:", e);
        // Fallback to an empty paragraph if parsing fails
        captionEditor.update(() => {
          const root = captionEditor.getRootElement();
          if (root) {
            root.clear();
            root.append($createParagraphNode().append($createTextNode()));
          }
        });
      }
    }
    
    const node = new ImageNode( // Use constructor directly
        src,
        altText,
        width,
        height,
        showCaption,
        captionEditor, // Pass the fully setup caption editor
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
        theme: { // Minimal theme for caption editor
          paragraph: 'editor-image-caption-paragraph',
          text: {
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
      caption: this.__showCaption ? this.__caption.getEditorState().toJSON() : undefined,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image; // This class is for the wrapper around the image AND caption
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(prevNode: ImageNode, dom: HTMLElement, config: EditorConfig): boolean {
    // It's better to handle DOM updates for src, alt, width, height in the React component
    // if they can change dynamically and need to reflect without a full re-render of the node.
    // However, for properties like `showCaption` that affect structure, Lexical might need to re-decorate.
    if (prevNode.__showCaption !== this.__showCaption) {
      return true; // Returning true triggers re-decoration
    }
    return false;
  }

  getSrc(): string {
    return this.__src;
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
    // This might require the node to re-decorate if the component structure changes
    if (writable.__showCaption !== showCaption) {
        writable.__showCaption = showCaption;
        // Potentially trigger an update if needed, though Lexical's reconciliation might handle it
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
          captionEditor={this.__caption} 
          resizable={this.isResizable()}
          editor={editor} // Pass parent editor for updates
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
      // We might need a custom DOM export/import for the whole figure with caption
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor); // This creates the span from createDOM
    if (element && element instanceof HTMLElement) {
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

      if (this.__showCaption) {
        const captionDiv = document.createElement('div');
        captionDiv.setAttribute('data-lexical-image-caption', 'true');
        // This is a simplified export. For full fidelity, you'd export caption's HTML.
        captionDiv.textContent = this.__caption.getEditorState().read(() => this.__caption.getRootElement()?.getTextContent() || '');
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
  caption?: LexicalEditor; // Can be pre-filled for new nodes if needed
  key?: NodeKey;
};


export function $createImageNode({
  altText,
  height,
  src,
  width,
  showCaption,
  caption, // LexicalEditor instance
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(
      src, 
      altText, 
      width, 
      height, 
      showCaption, 
      caption, 
      key
    )
  );
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
