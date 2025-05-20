
"use client";

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
import { DecoratorNode, $applyNodeReplacement } from 'lexical';
import * as React from 'react';
import { Suspense } from 'react';

const EquationComponent = React.lazy(() => import('../components/EquationComponent'));

export type SerializedEquationNode = Spread<
  {
    equation: string;
    inline: boolean;
  },
  SerializedLexicalNode
>;

function convertEquationElement(domNode: HTMLElement): DOMConversionOutput | null {
  let equation = domNode.getAttribute('data-lexical-equation');
  const inline = domNode.getAttribute('data-lexical-inline') === 'true';
  if (equation === null) {
    return null;
  }
  equation = equation.replace(/&quot;/g, '"'); // Basic unescaping
  const node = $createEquationNode(equation, inline);
  return { node };
}


export class EquationNode extends DecoratorNode<JSX.Element> {
  __equation: string;
  __inline: boolean;

  static getType(): string {
    return 'equation';
  }

  static clone(node: EquationNode): EquationNode {
    return new EquationNode(node.__equation, node.__inline, node.__key);
  }

  static importJSON(serializedNode: SerializedEquationNode): EquationNode {
    const node = $createEquationNode(
      serializedNode.equation,
      serializedNode.inline,
    );
    return node;
  }

  exportJSON(): SerializedEquationNode {
    return {
      equation: this.__equation,
      inline: this.__inline,
      type: 'equation',
      version: 1,
    };
  }

  constructor(equation: string, inline?: boolean, key?: NodeKey) {
    super(key);
    this.__equation = equation;
    this.__inline = inline ?? false;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement(this.__inline ? 'span' : 'div');
    // Setting dataset attributes for DOM export and conversion
    element.setAttribute('data-lexical-equation', this.__equation);
    element.setAttribute('data-lexical-inline', String(this.__inline));
    if (!this.__inline) {
        element.style.display = 'block'; // Ensure block display for block equations
    }
    const theme = config.theme;
    const className = theme.equation; // General equation class
    if (className !== undefined) {
      element.className = className;
    }
    if (this.__inline && theme.equationInline) { // Specific inline equation class
        element.classList.add(theme.equationInline);
    }
    return element;
  }

  updateDOM(prevNode: EquationNode, dom: HTMLElement, config: EditorConfig): boolean {
    // Update data attributes if equation or inline status changes
    if (prevNode.__equation !== this.__equation) {
      dom.setAttribute('data-lexical-equation', this.__equation);
    }
    if (prevNode.__inline !== this.__inline) {
      dom.setAttribute('data-lexical-inline', String(this.__inline));
       if (!this.__inline) {
        dom.style.display = 'block';
      } else {
        dom.style.display = ''; // Remove block style if now inline
      }
      // Update classes based on inline status
      const theme = config.theme;
      if (this.__inline && theme.equationInline) {
          dom.classList.add(theme.equationInline);
      } else if (!this.__inline && theme.equationInline) {
          dom.classList.remove(theme.equationInline);
      }
    }
    return false; // DecoratorNode typically returns false
  }

  getTextContent(): string {
    return this.__equation;
  }
  
  getEquation(): string {
    return this.__equation;
  }

  setEquation(equation: string): void {
    const writable = this.getWritable();
    writable.__equation = equation;
  }

  isInline(): boolean {
    return this.__inline;
  }

  setInline(inline: boolean): void {
    const writable = this.getWritable();
    writable.__inline = inline;
  }

  decorate(editor: LexicalEditor, config: EditorConfig): JSX.Element {
    return (
      <Suspense fallback={null}>
        <EquationComponent
          equation={this.__equation}
          inline={this.__inline}
          nodeKey={this.getKey()}
          editor={editor}
        />
      </Suspense>
    );
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-equation')) {
          return null;
        }
        return {
          conversion: convertEquationElement,
          priority: 1, // Higher priority for divs with equation data
        };
      },
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-equation')) {
          return null;
        }
        return {
          conversion: convertEquationElement,
          priority: 1, // Higher priority for spans with equation data
        };
      },
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const {element} = super.exportDOM(editor);
    if (element) {
      element.setAttribute('data-lexical-equation', this.__equation);
      element.setAttribute('data-lexical-inline', String(this.__inline));
      // Optional: Could render KaTeX directly to innerHTML for static export
      // For dynamic editor, the decorator handles rendering.
    }
    return {element};
  }
}

export function $createEquationNode(
  equation = '',
  inline = false,
): EquationNode {
  return $applyNodeReplacement(new EquationNode(equation, inline));
}

export function $isEquationNode(
  node: LexicalNode | null | undefined,
): node is EquationNode {
  return node instanceof EquationNode;
}
