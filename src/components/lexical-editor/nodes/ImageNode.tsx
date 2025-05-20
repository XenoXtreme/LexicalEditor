
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
  UpdateListener,
} from 'lexical';

import { $applyNodeReplacement, DecoratorNode } from 'lexical';
import * as React from 'react';
import { Suspense } from 'react';

const ImageComponent = React.lazy(
  () => import('./ImageComponent'),
);


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
  __caption: LexicalEditor | undefined; 

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption, // Cloning LexicalEditor instance might be tricky; consider deep cloning or re-creating
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, src, width, showCaption, caption: serializedCaption } = serializedNode;
    const imageNode = $createImageNode({
      altText,
      height,
      src,
      width,
      showCaption,
    });
    // TODO: If caption needs to be deserialized, it requires access to an editor instance
    // For now, we're not fully implementing caption deserialization here.
    // if (serializedCaption && imageNode.__caption) {
    //   const editorState = imageNode.__caption.parseEditorState(serializedCaption.editorState);
    //   imageNode.__caption.setEditorState(editorState);
    // }
    return imageNode;
  }

  constructor(
    src: string,
    altText: string,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    showCaption?: boolean,
    caption?: LexicalEditor, // caption: createEditor(),
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__showCaption = showCaption || false;
    this.__caption = caption; // Caption editor passed in or undefined
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
      caption: this.__caption ? this.__caption.getEditorState().toJSON() : undefined,
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
    // if (prevNode.__src !== this.__src) {
    //   // Handled by React component
    // }
    // if (prevNode.__altText !== this.__altText) {
    //    // Handled by React component
    // }
    // if (prevNode.__width !== this.__width || prevNode.__height !== this.__height) {
    //   // Handled by React component
    // }
    return false; // Decorator node usually returns false
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  getWidth(): 'inherit' | number {
    return this.getLatest().__width;
  }

  getHeight(): 'inherit' | number {
    return this.getLatest().__height;
  }

  setWidthAndHeight(width: 'inherit' | number, height: 'inherit' | number): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  isResizable(): boolean {
    return true; // Can be configured if needed
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
          caption={this.__caption} // Pass the LexicalEditor instance for the caption
          resizable={this.isResizable()}
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
    }
    return {element};
  }
}

export type ImagePayload = {
  altText: string;
  height?: number;
  src: string;
  width?: number;
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

    