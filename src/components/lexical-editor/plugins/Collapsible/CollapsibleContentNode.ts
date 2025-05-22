
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_CHROME} from '@lexical/utils';
import {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  SerializedElementNode,
  Spread,
  $createParagraphNode,
} from 'lexical';

import {$isCollapsibleContainerNode} from './CollapsibleContainerNode';
import {domOnBeforeMatch, setDomHiddenUntilFound} from './utils';

type SerializedCollapsibleContentNode = Spread <
  {
    type: 'collapsible-content';
    version: 1;
  },
  SerializedElementNode
>;


export function $convertCollapsibleContentElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const node = $createCollapsibleContentNode();
  // Lexical will handle populating children during conversion
  return {
    node,
  };
}

export class CollapsibleContentNode extends ElementNode {
  static getType(): string {
    return 'collapsible-content';
  }

  static clone(node: CollapsibleContentNode): CollapsibleContentNode {
    return new CollapsibleContentNode(node.__key);
  }
  
  canBeEmpty(): boolean {
    return false; // Should ideally always contain at least one paragraph
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add(config.theme.collapsibleContent || 'editor-collapsible-content');
    
    // Visibility is handled by the container's updateDOM or CSS based on data-open
    // editor.getEditorState().read(() => {
    //   const containerNode = this.getParentOrThrow();
    //   if (!$isCollapsibleContainerNode(containerNode)) {
    //     // This should ideally not happen due to node transforms
    //     console.error('CollapsibleContentNode parent is not a CollapsibleContainerNode');
    //     return;
    //   }
    //   if (!containerNode.getOpen()) {
    //      dom.style.display = 'none'; // Initially hide if not open
    //   }
    // });
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    // Content visibility should be primarily controlled by the container node's state
    // or by CSS targeting the container's [data-open] attribute.
    // For example, .editor-collapsible-container[data-open="false"] .editor-collapsible-content { display: none; }
    return false; // Children reconciliation is handled by Lexical
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domNode: HTMLElement) => {
        if (domNode.classList.contains('editor-collapsible-content') || domNode.getAttribute('data-lexical-collapsible-content')) {
          return {
            conversion: $convertCollapsibleContentElement,
            priority: 1, // Ensure this takes precedence over generic div
          };
        }
        // Handle case where content might be directly inside <details> without a specific div
        if (domNode.parentElement?.tagName === 'DETAILS' && domNode.tagName !== 'SUMMARY') {
            return {
                conversion: $convertCollapsibleContentElement,
                priority: 0
            }
        }
        return null;
      },
    };
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div');
    element.classList.add(editor.getEditorConfig().theme.collapsibleContent || 'editor-collapsible-content');
    element.setAttribute('data-lexical-collapsible-content', 'true');
    return {element};
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContentNode,
  ): CollapsibleContentNode {
    const node = $createCollapsibleContentNode();
    // ElementNode's importJSON handles children, format, indent, direction
    return node;
  }

  exportJSON(): SerializedCollapsibleContentNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-content',
      version: 1,
    };
  }

  isShadowRoot(): boolean {
    // Playground has this as true. This affects selection and command propagation.
    // If true, commands might not bubble out, selection is contained.
    // If false, it behaves more like a regular block.
    // Let's try false to match ContainerNode
    return false; 
  }

  // Ensure content node always has at least one paragraph
  // This is important for editor stability.
  static transform(): (node: LexicalNode) => void {
    return (node: LexicalNode) => {
      if ($isCollapsibleContentNode(node)) {
        if (node.isEmpty()) {
          node.append($createParagraphNode());
        }
      }
    };
  }
}

export function $createCollapsibleContentNode(): CollapsibleContentNode {
  const node = new CollapsibleContentNode();
  // Ensure it has a paragraph by default, if node transforms aren't enough
  // node.append($createParagraphNode()); 
  return node;
}

export function $isCollapsibleContentNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContentNode {
  return node instanceof CollapsibleContentNode;
}
