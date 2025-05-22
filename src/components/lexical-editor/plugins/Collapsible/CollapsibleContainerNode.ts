
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_CHROME} from '@lexical/utils';
import {
  $isElementNode,
  $createParagraphNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  isHTMLElement,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
  Spread,
  $getRoot,
} from 'lexical';

import {setDomHiddenUntilFound} from './utils';
import {$isCollapsibleTitleNode} from "./CollapsibleTitleNode";
import {$isCollapsibleContentNode} from "./CollapsibleContentNode";


type SerializedCollapsibleContainerNode = Spread<
  {
    open: boolean;
    type: 'collapsible-container';
    version: 1;
  },
  SerializedElementNode
>;

export function $convertDetailsElement(
  domNode: HTMLDetailsElement,
): DOMConversionOutput | null {
  const isOpen = domNode.open !== undefined ? domNode.open : true;
  const node = $createCollapsibleContainerNode(isOpen);
  return {
    node,
  };
}

export class CollapsibleContainerNode extends ElementNode {
  __open: boolean;

  constructor(open: boolean, key?: NodeKey) {
    super(key);
    this.__open = open;
  }

  static getType(): string {
    return 'collapsible-container';
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__open, node.__key);
  }

  isShadowRoot(): boolean {
    // This being true is important for nested editor behavior,
    // ensuring selections and commands are contained.
    return false; // Let's try false to see if it fixes selection issues, playground has it false.
  }

  canBeEmpty(): boolean {
    return false;
  }
  
  canInsertTextBefore(): boolean {
    return true; // Allow text insertion before for easier editing flow
  }
  
  canInsertTextAfter(): boolean {
    return true; // Allow text insertion after
  }
  
  isInline(): boolean {
    return false;
  }

  // This method handles what happens when you try to extract content from the container
  // e.g. by selecting across its boundaries.
  extractWithChild(
    child: LexicalNode, // The child node where the selection is anchored/focused
    selection: RangeSelection, // The current selection
    destination: 'clone' | 'html', // Whether the extraction is for cloning or HTML serialization
  ): boolean {
    // If the child is not an ElementNode, let Lexical handle default behavior
    if (!$isElementNode(child)) {
      return false;
    }
  
    // Collect all children from both title and content nodes
    const nodesToExtract: LexicalNode[] = [];
    this.getChildren().forEach(containerChild => {
      if ($isCollapsibleTitleNode(containerChild) || $isCollapsibleContentNode(containerChild)) {
        nodesToExtract.push(...containerChild.getChildren());
      }
    });
  
    // Insert these collected nodes before the container itself
    nodesToExtract.forEach(node => this.insertBefore(node));
    
    // Remove the now-empty container
    this.remove();
    return true; // Indicate that we've handled the extraction
  }
  

  // This method handles what happens when you press Backspace at the beginning of the container
  collapseAtStart(selection: RangeSelection): boolean {
    // Get all children from title and content nodes
    const nodesToInsert: LexicalNode[] = [];
    this.getChildren().forEach(child => {
      if ($isCollapsibleTitleNode(child) || $isCollapsibleContentNode(child)) {
        nodesToInsert.push(...child.getChildren());
      }
    });
    
    const previousSibling = this.getPreviousSibling();
    
    // Insert all extracted nodes before this container
    nodesToInsert.forEach(node => this.insertBefore(node));
    
    // Try to merge with previous sibling if it's an element
    if ($isElementNode(previousSibling) && nodesToInsert.length > 0) {
      const firstExtractedNode = nodesToInsert[0];
      if ($isElementNode(firstExtractedNode)) {
        try {
          // Move children from first extracted node to previous sibling
          const childrenToMove = firstExtractedNode.getChildren();
          childrenToMove.forEach(childToMove => previousSibling.append(childToMove));
          firstExtractedNode.remove(); // Remove the now-empty first extracted node
          
          // Set selection to the end of the merged content in the previous sibling
          previousSibling.selectEnd();
        } catch (error) {
          console.warn('Could not merge nodes during collapseAtStart:', error);
          // If merging fails, at least the content is out, and we can select the first extracted node
          if (nodesToInsert[0]) nodesToInsert[0].selectPrevious();
        }
      } else if (nodesToInsert[0]) {
         nodesToInsert[0].selectPrevious();
      }
    } else if (nodesToInsert.length > 0 && nodesToInsert[0]) {
      // If no previous sibling to merge with, select the first extracted node
       nodesToInsert[0].selectPrevious();
    }
    
    // Remove this container
    this.remove();
    return true; // Indicate that the collapse was handled
  }
  
  // Override insertNewAfter to handle what happens when user presses Enter after the container
  insertNewAfter(selection?: RangeSelection, restoreSelection = true): ElementNode | null {
    const newElement = $createParagraphNode();
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    // details is not well supported in Chrome #5582
    let dom: HTMLElement;
    // Always use div for consistency and apply open state via data attribute
    dom = document.createElement('div');
    dom.setAttribute('data-open', String(this.__open)); // Use data attribute for open state

    dom.classList.add(config.theme.collapsibleContainer || 'editor-collapsible-container');
    
    // For Chrome, handle click on summary to toggle state
    // This logic is better handled within the CollapsibleTitleNode's interaction
    // if (IS_CHROME) {
    //   // This event listener would be on the container, but needs to target the summary.
    //   // It's more robust to handle this in the CollapsibleTitleNode's createDOM or a plugin.
    // }

    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const currentOpen = this.__open;
    if (prevNode.__open !== currentOpen) {
      dom.setAttribute('data-open', String(currentOpen)); // Update data attribute

      // For non-Chrome behavior (if we were using <details>), or for CSS-driven visibility
      const contentDom = dom.children[1]; // Assuming title is first, content is second
      if (isHTMLElement(contentDom)) {
         if (currentOpen) {
            contentDom.style.display = ''; // Or remove hidden attribute
        } else {
            contentDom.style.display = 'none'; // Or set hidden attribute
        }
      }
    }
    return false; // No need for Lexical to reconcile children if structure is fixed
  }

  static importDOM(): DOMConversionMap<HTMLDetailsElement | HTMLElement> | null {
    return {
      details: (domNode: HTMLDetailsElement) => { // For pasting <details> elements
        return {
          conversion: $convertDetailsElement,
          priority: 1,
        };
      },
      div: (domNode: HTMLElement) => { // For our own div-based representation
        if (domNode.classList.contains('editor-collapsible-container') || domNode.getAttribute('data-lexical-collapsible-container')) {
           const isOpen = domNode.getAttribute('data-open') === 'true';
           return {
            conversion: (domNodeDuringConversion: HTMLElement) => {
                const node = $createCollapsibleContainerNode(isOpen);
                return { node };
            },
            priority: 2
           }
        }
        return null;
      }
    };
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContainerNode,
  ): CollapsibleContainerNode {
    const node = $createCollapsibleContainerNode(serializedNode.open);
    // Attributes like format, indent, direction are handled by ElementNode's importJSON
    return node;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div'); // Use div for export
    element.classList.add(editor.getEditorConfig().theme.collapsibleContainer || 'editor-collapsible-container');
    element.setAttribute('data-lexical-collapsible-container', 'true'); // Custom attribute for easier import
    element.setAttribute('data-open', String(this.__open));
    // Children (Title and Content) will be appended by Lexical's export process
    return {element};
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(), // Exports children, format, indent, direction
      type: 'collapsible-container',
      version: 1,
      open: this.__open,
    };
  }

  setOpen(open: boolean): void {
    const writable = this.getWritable();
    writable.__open = open;
  }

  getOpen(): boolean {
    return this.getLatest().__open;
  }

  toggleOpen(): void {
    this.setOpen(!this.getOpen());
  }
}

export function $createCollapsibleContainerNode(
  isOpen: boolean = true, // Default to open
): CollapsibleContainerNode {
  return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}

