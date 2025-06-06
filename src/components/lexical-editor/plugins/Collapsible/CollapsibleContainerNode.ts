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
} from 'lexical';

import {$isCollapsibleTitleNode} from "./CollapsibleTitleNode";
import {$isCollapsibleContentNode} from "./CollapsibleContentNode";
import {setDomHiddenUntilFound} from './utils';

type SerializedCollapsibleContainerNode = Spread<
  {
    open: boolean;
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

  createDOM(config: EditorConfig, editor: LexicalEditor): HTMLElement {
    // details is not well supported in Chrome #5582
    let dom: HTMLElement;
    if (IS_CHROME) {
      dom = document.createElement('div');
      dom.setAttribute('open', '');
    } else {
      const detailsDom = document.createElement('details');
      detailsDom.open = this.__open;
      detailsDom.addEventListener('toggle', () => {
        const open = editor.getEditorState().read(() => this.getOpen());
        if (open !== detailsDom.open) {
          editor.update(() => this.toggleOpen());
        }
      });
      dom = detailsDom;
    }
    dom.classList.add('Collapsible__container');

    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLDetailsElement): boolean {
    const currentOpen = this.__open;
    if (prevNode.__open !== currentOpen) {
      // details is not well supported in Chrome #5582
      if (IS_CHROME) {
        const contentDom = dom.children[1];
        if (!isHTMLElement(contentDom)) {
          throw new Error('Expected contentDom to be an HTMLElement');
        }
        if (currentOpen) {
          dom.setAttribute('open', '');
          contentDom.hidden = false;
        } else {
          dom.removeAttribute('open');
          setDomHiddenUntilFound(contentDom);
        }
      } else {
        dom.open = this.__open;
      }
    }

    return false;
  }

  static importDOM(): DOMConversionMap<HTMLDetailsElement> | null {
    return {
      details: (domNode: HTMLDetailsElement) => {
        return {
          conversion: $convertDetailsElement,
          priority: 1,
        };
      },
    };
  }


  static importJSON(
    serializedNode: SerializedCollapsibleContainerNode,
  ): CollapsibleContainerNode {
    const node = $createCollapsibleContainerNode(serializedNode.open);
    return node;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('details');
    element.classList.add('Collapsible__container');
    element.setAttribute('open', this.__open.toString());
    return {element};
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
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
  isOpen: boolean,
): CollapsibleContainerNode {
  return new CollapsibleContainerNode(isOpen);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}