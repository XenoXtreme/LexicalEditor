
"use client";

import * as React from 'react';
import { Suspense } from 'react';

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import { $applyNodeReplacement, DecoratorNode } from 'lexical';

const ImageComponent = React.lazy(
  // @ts-ignore
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
    caption?: LexicalEditor;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __showCaption: boolean;
  __caption: LexicalEditor | undefined; // Removed initial undefined value

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
      node.__caption,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, src, width, showCaption, caption } = serializedNode;
    const node = $createImageNode({
      altText,
      height,
      src,
      width,
      showCaption,
    });
    // TODO: Properly deserialize caption if needed
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
    this.__caption = caption;
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
      // caption: this.__caption ? this.__caption.toJSON() : undefined, // Basic serialization
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

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
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
          caption={this.__caption}
          resizable={true}
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
    if (element) {
      const img = document.createElement('img');
      img.setAttribute('src', this.__src);
      img.setAttribute('alt', this.__altText);
      if (this.__width !== 'inherit') {
        img.setAttribute('width', this.__width.toString());
      }
      if (this.__height !== 'inherit') {
        img.setAttribute('height', this.__height.toString());
      }
      element.appendChild(img);
    }
    return {element};
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
}

export function $createImageNode({
  altText,
  height,
  src,
  width,
  showCaption,
  caption,
  key,
}: {
  altText: string;
  height?: 'inherit' | number;
  src: string;
  width?: 'inherit' | number;
  showCaption?: boolean;
  caption?: LexicalEditor;
  key?: NodeKey;
}): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText, width, height, showCaption, caption, key));
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
