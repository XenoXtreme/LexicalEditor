
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_CHROME} from '@lexical/utils';
import {
  $createParagraphNode,
  $isElementNode,
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  RangeSelection,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {$isCollapsibleContainerNode} from './CollapsibleContainerNode';
import {$isCollapsibleContentNode} from './CollapsibleContentNode';

type SerializedCollapsibleTitleNode = Spread <
  {
    type: 'collapsible-title';
    version: 1;
  },
  SerializedElementNode
>;


export function $convertSummaryElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const node = $createCollapsibleTitleNode();
  // Children will be populated by Lexical's conversion process
  return {
    node,
  };
}

export class CollapsibleTitleNode extends ElementNode {
  static getType(): string {
    return 'collapsible-title';
  }

  static clone(node: CollapsibleTitleNode): CollapsibleTitleNode {
    return new CollapsibleTitleNode(node.__key);
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    // Playground uses <summary> for <details> or a <div> for its custom element.
    // We'll use a div that acts like a summary.
    const dom = document.createElement('div'); // Use div for styling consistency
    dom.classList.add(config.theme.collapsibleTitle || 'editor-collapsible-title');

    // Click listener to toggle the parent container
    dom.addEventListener('click', (event) => {
      // Prevent clicks on contenteditable children from toggling
      if ((event.target as HTMLElement).isContentEditable) {
        return;
      }
      editor.update(() => {
        const collapsibleContainer = this.getLatest().getParentOrThrow();
        if (!$isCollapsibleContainerNode(collapsibleContainer)) {
          // This should not happen if node transforms are correct
          console.error('CollapsibleTitleNode parent is not a CollapsibleContainerNode');
          return;
        }
        collapsibleContainer.toggleOpen();
      });
    });
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    // DOM structure doesn't change based on node properties here
    return false; // Children reconciliation is handled by Lexical
  }

  static importDOM(): DOMConversionMap | null {
    return {
      summary: (domNode: HTMLElement) => { // For pasting <details><summary>
        return {
          conversion: $convertSummaryElement,
          priority: 1,
        };
      },
      div: (domNode: HTMLElement) => { // For our own representation
        if (domNode.classList.contains('editor-collapsible-title') || domNode.getAttribute('data-lexical-collapsible-title')) {
           return {
            conversion: $convertSummaryElement,
            priority: 2
           }
        }
        return null;
      }
    };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleTitleNode,
  ): CollapsibleTitleNode {
    const node = $createCollapsibleTitleNode();
    // ElementNode's importJSON handles children, format, indent, direction
    return node;
  }

  exportJSON(): SerializedCollapsibleTitleNode {
    return {
      ...super.exportJSON(),
      type: 'collapsible-title',
      version: 1,
    };
  }

  // Ensure title always has at least one paragraph.
  static transform(): (node: LexicalNode) => void {
    return (node: LexicalNode) => {
      if ($isCollapsibleTitleNode(node)) {
        if (node.isEmpty()) {
          node.append($createParagraphNode());
        }
      }
    };
  }

  // Defines behavior when Enter is pressed inside the title
  insertNewAfter(_selection?: RangeSelection, restoreSelection = true): ElementNode | null {
    const containerNode = this.getParentOrThrow();

    if (!$isCollapsibleContainerNode(containerNode)) {
      throw new Error(
        'CollapsibleTitleNode expects to be child of CollapsibleContainerNode',
      );
    }

    if (containerNode.getOpen()) {
      const contentNode = this.getNextSibling();
      if (!$isCollapsibleContentNode(contentNode)) {
        // This case should be prevented by node transforms ensuring valid structure
        const newContentNode = $createCollapsibleContentNode().append($createParagraphNode());
        this.insertAfter(newContentNode); // This might be wrong, should append to container
        return newContentNode.getFirstChild() as ElementNode; // Or newContentNode itself
      }

      const firstChild = contentNode.getFirstChild();
      if ($isElementNode(firstChild)) {
        // If content has a first child, select it
        if (restoreSelection) firstChild.selectStart();
        return firstChild;
      } else {
        // If content is empty, create a paragraph, append, and select it
        const paragraph = $createParagraphNode();
        contentNode.append(paragraph);
        if (restoreSelection) paragraph.select();
        return paragraph;
      }
    } else {
      // If container is closed, Enter creates a new paragraph *after* the container
      const paragraph = $createParagraphNode();
      containerNode.insertAfter(paragraph, restoreSelection);
      return paragraph;
    }
  }

  // Prevent title from being deleted if it's the last child of the container
  // or if it would leave the container in an invalid state.
  // This logic might need refinement based on desired UX.
  // For now, standard ElementNode behavior for collapse/extract is used.
}

export function $createCollapsibleTitleNode(): CollapsibleTitleNode {
  const node = new CollapsibleTitleNode();
  // Ensure it has a paragraph by default via node transform or here
  // node.append($createParagraphNode());
  return node;
}

export function $isCollapsibleTitleNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleTitleNode {
  return node instanceof CollapsibleTitleNode;
}
