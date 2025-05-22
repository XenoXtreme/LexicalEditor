
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
        paragraph: 'editor-image-caption-paragraph',
        // Add other theme properties for caption if needed, e.g., text styles
      }
    });

    try {
      const originalCaptionState = node.__caption.getEditorState();
      // Ensure originalCaptionState is valid and has clone and isEmpty methods
      if (originalCaptionState && typeof originalCaptionState.clone === 'function') {
        const clonedCaptionState = originalCaptionState.clone();
        
        if (clonedCaptionState && typeof clonedCaptionState.isEmpty === 'function' && !clonedCaptionState.isEmpty()) {
          newCaptionEditor.setEditorState(clonedCaptionState);
        } else if (clonedCaptionState && typeof clonedCaptionState.isEmpty === 'function' && clonedCaptionState.isEmpty()) {
          console.warn("ImageNode.clone: Cloned caption state was empty. New caption editor will use its default state.");
          // newCaptionEditor already has a default non-empty state
        } else {
          console.error("ImageNode.clone: clonedCaptionState is not a valid EditorState or does not have isEmpty method. Using default state.");
        }
      } else {
        console.error("ImageNode.clone: Original caption state is invalid or does not have clone method. Using default state.");
      }
    } catch (e) {
      console.error("ImageNode.clone: Error processing caption state. New caption editor will use its default state.", e);
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
            // Attempt to parse the serialized state to ensure it's valid and not empty
            const tempEditorForParsing = createEditor({ nodes: captionEditorNodes, onError: () => {} });
            const parsedState = tempEditorForParsing.parseEditorState(serializedCaption.editorState);
            
            if (parsedState.isEmpty()) {
                console.warn("ImageNode.importJSON: Serialized caption was empty. Initializing with default.");
                // Let createEditor below handle default initialization
            } else {
                initialCaptionEditorStateString = JSON.stringify(parsedState.toJSON());
            }
        } catch (e) {
            console.error("ImageNode.importJSON: Error parsing serialized caption state. Initializing with default.", e);
            // Fallback to default initialization by createEditor
        }
    }
    
    const captionEditor = createEditor({
        nodes: captionEditorNodes,
        editorState: initialCaptionEditorStateString, // createEditor handles stringified JSON or undefined
        theme: { 
          paragraph: 'editor-image-caption-paragraph',
          // text styles if needed
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
      // Only serialize caption if it's shown and valid
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
    if (prevNode.__showCaption !== this.__showCaption) {
      return true; 
    }
    // Potentially re-render if src or altText changes, though ImageComponent handles this internally
    if (prevNode.__src !== this.__src || prevNode.__altText !== this.__altText) {
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
        // If hiding caption, we might want to clear its content or handle its editor state
        // For now, just toggling visibility.
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
          editor={editor} // Pass the parent editor instance
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
      // Could add a div[data-lexical-image-caption] rule here if needed for full HTML roundtrip
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor); 
    if (element && element instanceof HTMLElement) { // Ensure element is an HTMLElement
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

      if (this.__showCaption && this.__caption) {
        const captionDiv = document.createElement('div');
        captionDiv.setAttribute('data-lexical-image-caption', 'true');
        // It's complex to serialize Lexical editor state to simple text/HTML here.
        // For a simple representation, one might take text content.
        // For full fidelity, a proper HTML export of the caption editor would be needed.
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

    