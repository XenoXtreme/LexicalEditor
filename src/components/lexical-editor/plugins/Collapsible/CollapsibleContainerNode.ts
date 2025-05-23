
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
    return false; 
  }

  canBeEmpty(): boolean {
    return false;
  }
  
  canInsertTextBefore(): boolean {
    return true; 
  }
  
  canInsertTextAfter(): boolean {
    return true; 
  }
  
  isInline(): boolean {
    return false;
  }

  extractWithChild(
    child: LexicalNode, 
    selection: RangeSelection, 
    destination: 'clone' | 'html', 
  ): boolean {
    if (!$isElementNode(child)) {
      return false;
    }
  
    const nodesToExtract: LexicalNode[] = [];
    this.getChildren().forEach(containerChild => {
      if ($isCollapsibleTitleNode(containerChild) || $isCollapsibleContentNode(containerChild)) {
        nodesToExtract.push(...containerChild.getChildren());
      }
    });
  
    nodesToExtract.forEach(node => this.insertBefore(node));
    
    this.remove();
    return true; 
  }
  

  collapseAtStart(selection: RangeSelection): boolean {
    const nodesToInsert: LexicalNode[] = [];
    this.getChildren().forEach(child => {
      if ($isCollapsibleTitleNode(child) || $isCollapsibleContentNode(child)) {
        nodesToInsert.push(...child.getChildren());
      }
    });
    
    const previousSibling = this.getPreviousSibling();
    
    nodesToInsert.forEach(node => this.insertBefore(node));
    
    if ($isElementNode(previousSibling) && nodesToInsert.length > 0) {
      const firstExtractedNode = nodesToInsert[0];
      if ($isElementNode(firstExtractedNode)) {
        try {
          const childrenToMove = firstExtractedNode.getChildren();
          childrenToMove.forEach(childToMove => previousSibling.append(childToMove));
          firstExtractedNode.remove(); 
          
          previousSibling.selectEnd();
        } catch (error) {
          console.warn('Could not merge nodes during collapseAtStart:', error);
          if (nodesToInsert[0]) nodesToInsert[0].selectPrevious();
        }
      } else if (nodesToInsert[0]) {
         nodesToInsert[0].selectPrevious();
      }
    } else if (nodesToInsert.length > 0 && nodesToInsert[0]) {
       nodesToInsert[0].selectPrevious();
    }
    
    this.remove();
    return true; 
  }
  
  insertNewAfter(selection?: RangeSelection, restoreSelection = true): ElementNode | null {
    const newElement = $createParagraphNode();
    this.insertAfter(newElement, restoreSelection);
    return newElement;
  }

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div');
    dom.setAttribute('data-lexical-collapsible-container', 'true'); // For easier selection/identification
    dom.setAttribute('data-open', String(this.__open)); // Set initial data-open state
    const themeClass = config.theme.collapsibleContainer || 'editor-collapsible-container';
    dom.classList.add(...themeClass.split(' ')); // Apply theme classes
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const currentOpen = this.__open;
    if (prevNode.__open !== currentOpen) {
      dom.setAttribute('data-open', String(currentOpen)); // Ensure data-open attribute is updated
    }
    // Returning false means Lexical will not attempt to reconcile children,
    // which is usually correct if DOM structure is static and only attributes change.
    return false;
  }

  static importDOM(): DOMConversionMap<HTMLDetailsElement | HTMLElement> | null {
    return {
      details: (domNode: HTMLDetailsElement) => { 
        return {
          conversion: $convertDetailsElement,
          priority: 1,
        };
      },
      div: (domNode: HTMLElement) => { 
        if (domNode.getAttribute('data-lexical-collapsible-container')) {
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
    return node;
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div');
    const themeClass = editor.getEditorConfig().theme.collapsibleContainer || 'editor-collapsible-container';
    element.classList.add(...themeClass.split(' '));
    element.setAttribute('data-lexical-collapsible-container', 'true');
    element.setAttribute('data-open', String(this.__open));
    return {element};
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(), 
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
  isOpen: boolean = true, 
): CollapsibleContainerNode {
  return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}
