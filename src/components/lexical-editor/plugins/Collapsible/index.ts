/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './Collapsible.css';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from '@lexical/utils';
import {
  $isElementNode,
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  LexicalNode,
  COMMAND_PRIORITY_LOW,
  createCommand,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND
} from 'lexical';
import { useEffect } from 'react';

import {
  $createCollapsibleContainerNode,
  $isCollapsibleContainerNode,
  CollapsibleContainerNode,
} from './CollapsibleContainerNode';
import {
  $createCollapsibleContentNode,
  $isCollapsibleContentNode,
  CollapsibleContentNode,
} from './CollapsibleContentNode';
import {
  $createCollapsibleTitleNode,
  $isCollapsibleTitleNode,
  CollapsibleTitleNode,
} from './CollapsibleTitleNode';

export const INSERT_COLLAPSIBLE_COMMAND = createCommand<void>(
  'INSERT_COLLAPSIBLE_COMMAND',
);

export default function CollapsiblePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (
      !editor.hasNodes([
        CollapsibleContainerNode,
        CollapsibleTitleNode,
        CollapsibleContentNode,
      ])
    ) {
      throw new Error(
        'CollapsiblePlugin: CollapsibleContainerNode, CollapsibleTitleNode, or CollapsibleContentNode not registered on editor',
      );
    }

    const $onEscapeUp = () => {
      const selection = $getSelection();
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const container = $findMatchingParent(
          selection.anchor.getNode(),
          $isCollapsibleContainerNode,
        );

        if ($isCollapsibleContainerNode(container)) {
          const parent = container.getParent();
          if (
            parent !== null &&
            parent.getFirstChild() === container &&
            selection.anchor.key === container.getFirstDescendant()?.getKey()
          ) {
            container.insertBefore($createParagraphNode());
          }
        }
      }

      return false;
    };

    const $onEscapeDown = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const container = $findMatchingParent(
          selection.anchor.getNode(),
          $isCollapsibleContainerNode,
        );

        if ($isCollapsibleContainerNode(container)) {
          const parent = container.getParent();
          if (parent !== null && parent.getLastChild() === container) {
            const titleParagraph = container.getFirstDescendant();
            const contentParagraph = container.getLastDescendant();

            if (
              (contentParagraph !== null &&
                selection.anchor.key === contentParagraph.getKey() &&
                selection.anchor.offset ===
                contentParagraph.getTextContentSize()) ||
              (titleParagraph !== null &&
                selection.anchor.key === titleParagraph.getKey() &&
                selection.anchor.offset === titleParagraph.getTextContentSize())
            ) {
              container.insertAfter($createParagraphNode());
            }
          }
        }
      }

      return false;
    };

    const $onBackSpace = () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) && selection.isCollapsed()) {
        const anchorNode = selection.anchor.getNode();

        // Check if we're at the very beginning of a collapsible container
        const container = $findMatchingParent(anchorNode, $isCollapsibleContainerNode);

        if ($isCollapsibleContainerNode(container)) {
          const titleNode = container.getFirstChild();
          if (titleNode && selection.anchor.key === titleNode.getKey() && selection.anchor.offset === 0) {
            // We're at the start of the title, collapse the container
            return container.collapseAtStart(selection);
          }
        }
      }
      return false;
    }
    
    const $onDelete = ()=>{
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();

        // Check if any selected nodes are collapsible containers
        for (const node of nodes) {
          const container = $findMatchingParent(node, $isCollapsibleContainerNode);
          if ($isCollapsibleContainerNode(container)) {
            // Remove the container and replace with its content
            const nodesToInsert: LexicalNode[] = [];
            for (const child of container.getChildren()) {
              if ($isElementNode(child)) {
                nodesToInsert.push(...child.getChildren());
              }
            }

            for (const nodeToInsert of nodesToInsert) {
              container.insertBefore(nodeToInsert);
            }

            container.remove();
            return true;
          }
        }
      }
      return false;
    }

    return mergeRegister(
      // Structure enforcing transformers for each node type. In case nesting structure is not
      // "Container > Title + Content" it'll unwrap nodes and convert it back
      // to regular content.
      editor.registerNodeTransform(CollapsibleContentNode, (node) => {
        const parent = node.getParent();
        if (!$isCollapsibleContainerNode(parent)) {
          const children = node.getChildren();
          for (const child of children) {
            node.insertBefore(child);
          }
          node.remove();
        }
      }),

      editor.registerNodeTransform(CollapsibleTitleNode, (node) => {
        const parent = node.getParent();
        if (!$isCollapsibleContainerNode(parent)) {
          node.replace($createParagraphNode().append(...node.getChildren()));
          return;
        }
      }),

      editor.registerNodeTransform(CollapsibleContainerNode, (node) => {
        const children = node.getChildren();
        if (
          children.length !== 2 ||
          !$isCollapsibleTitleNode(children[0]) ||
          !$isCollapsibleContentNode(children[1])
        ) {
          for (const child of children) {
            node.insertBefore(child);
          }
          node.remove();
        }
      }),

      // When collapsible is the last child pressing down/right arrow will insert paragraph
      // below it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if trailing paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        $onEscapeDown,
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        $onEscapeDown,
        COMMAND_PRIORITY_LOW,
      ),

      // When collapsible is the first child pressing up/left arrow will insert paragraph
      // above it to allow adding more content. It's similar what $insertBlockNode
      // (mainly for decorators), except it'll always be possible to continue adding
      // new content even if leading paragraph is accidentally deleted
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        $onEscapeUp,
        COMMAND_PRIORITY_LOW,
      ),

      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        $onEscapeUp,
        COMMAND_PRIORITY_LOW,
      ),

      // Enter goes from Title to Content rather than a new line inside Title
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const titleNode = $findMatchingParent(
              selection.anchor.getNode(),
              (node) => $isCollapsibleTitleNode(node),
            );

            if ($isCollapsibleTitleNode(titleNode)) {
              const container = titleNode.getParent();
              if (container && $isCollapsibleContainerNode(container)) {
                if (!container.getOpen()) {
                  container.toggleOpen();
                }
                titleNode.getNextSibling()?.selectEnd();
                return true;
              }
            }
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        $onBackSpace,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_COLLAPSIBLE_COMMAND,
        () => {
          editor.update(() => {
            const title = $createCollapsibleTitleNode();
            const paragraph = $createParagraphNode();
            $insertNodeToNearestRoot(
              $createCollapsibleContainerNode(true).append(
                title.append(paragraph),
                $createCollapsibleContentNode().append($createParagraphNode()),
              ),
            );
            paragraph.select();
          });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return null;
}