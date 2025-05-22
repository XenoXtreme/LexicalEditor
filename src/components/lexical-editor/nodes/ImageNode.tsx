
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
    const newCaptionEditor = createEditor({
      nodes: captionEditorNodes,
      onError: (error) => console.error('Caption editor error (clone):', error),
    });

    const originalCaptionState = node.__caption.getEditorState();
    const clonedCaptionState = originalCaptionState.clone();

    const rootOfClonedState = clonedCaptionState.getRoot();
    if (rootOfClonedState.getChildrenSize() === 0) {
      // This state is invalid for setEditorState.
      // We need to make it valid by adding a paragraph.
      console.warn("ImageNode.clone: Cloned caption editor state's root was empty and has been fixed by adding a paragraph.");
      clonedCaptionState.update(() => { // Directly update the problematic cloned state
        const root = clonedCaptionState.getRoot(); // Get the root of the state we are fixing
        root.append($createParagraphNode());
      }, {
        discrete: true, // This ensures the update happens synchronously within this operation
      });
    }

    newCaptionEditor.setEditorState(clonedCaptionState);

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
    
    const captionEditor = createEditor({
        nodes: captionEditorNodes,
        onError: (error) => console.error('Caption editor error (importJSON):', error),
    });

    if (serializedCaption) {
      try {
        const parsedState = captionEditor.parseEditorState(serializedCaption.editorState);
        // Ensure the parsed state is not empty before setting
        if (parsedState.getRoot().getChildrenSize() === 0) {
          console.warn("ImageNode.importJSON: Parsed caption editor state was empty. Initializing with a default paragraph.");
          captionEditor.update(() => {
            const root = captionEditor.getEditorState().getRoot();
            root.clear(); 
            root.append($createParagraphNode());
          });
        } else {
          captionEditor.setEditorState(parsedState);
        }
      } catch (e) {
        console.error("Error parsing caption editor state:", e);
        // Fallback to an empty paragraph if parsing fails
        captionEditor.update(() => {
          const root = captionEditor.getEditorState().getRoot();
          root.clear();
          root.append($createParagraphNode());
        });
      }
    }
    // If no serializedCaption, the new captionEditor already has a default state (root with a paragraph)
    
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
    const className = theme.image; 
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(prevNode: ImageNode, dom: HTMLElement, config: EditorConfig): boolean {
    if (prevNode.__showCaption !== this.__showCaption) {
      return true; 
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
    if (writable.__showCaption !== showCaption) {
        writable.__showCaption = showCaption;
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
          editor={editor} 
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
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor); 
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
  caption?: LexicalEditor; 
  key?: NodeKey;
};


export function $createImageNode({
  altText,
  height,
  src,
  width,
  showCaption,
  caption, 
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

    