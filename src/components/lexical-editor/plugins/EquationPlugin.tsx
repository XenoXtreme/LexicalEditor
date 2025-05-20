
"use client";

import * as React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ESCAPE_COMMAND,
  LexicalCommand,
  NodeKey,
  createCommand,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  SELECTION_CHANGE_COMMAND,
  CLICK_COMMAND,
} from 'lexical';
import { $createEquationNode, EquationNode, $isEquationNode } from '../nodes/EquationNode';
import EquationEditorDialog from '../ui/EquationEditorDialog';
import { mergeRegister } from '@lexical/utils';

export type InsertEquationPayload = {
  equation?: string;
  inline?: boolean;
  showModal?: boolean | 'update'; // true to show modal for new, 'update' for existing
  nodeKeyToUpdate?: NodeKey;   // key of node if updating
};

export const INSERT_EQUATION_COMMAND: LexicalCommand<InsertEquationPayload> = createCommand('INSERT_EQUATION_COMMAND');

export default function EquationPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  // State for pre-filling the modal when editing
  const [initialEquation, setInitialEquation] = React.useState('');
  const [initialInline, setInitialInline] = React.useState(false);
  const [activeNodeKey, setActiveNodeKey] = React.useState<NodeKey | null>(null);


  React.useEffect(() => {
    if (!editor.hasNodes([EquationNode])) {
      throw new Error('EquationPlugin: EquationNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertEquationPayload>(
        INSERT_EQUATION_COMMAND,
        (payload) => {
          const { equation, inline, showModal, nodeKeyToUpdate } = payload;

          if (showModal) {
            if (showModal === 'update' && nodeKeyToUpdate) {
                // Editing existing node
                const node = editor.getEditorState().read(() => $getNodeByKey(nodeKeyToUpdate));
                if ($isEquationNode(node)) {
                    setInitialEquation(node.getEquation());
                    setInitialInline(node.isInline());
                    setActiveNodeKey(nodeKeyToUpdate);
                } else {
                    // Fallback if node not found or wrong type
                    setInitialEquation(equation || '');
                    setInitialInline(inline || false);
                    setActiveNodeKey(null);
                }
            } else {
                // Creating new node
                setInitialEquation(equation || '\\frac{a}{b}'); // Default for new
                setInitialInline(inline || false);
                setActiveNodeKey(null);
            }
            setIsModalOpen(true);
            return true;
          }
          
          // Direct insertion without modal (less common for equations)
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const equationNode = $createEquationNode(equation, inline);
              selection.insertNodes([equationNode]);
              if (selection.isCollapsed()) {
                equationNode.selectNext();
              }
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      // Listen for clicks on EquationNodes to trigger edit
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (event) => {
          const domTarget = event.target as HTMLElement;
          // Traverse up to find if the click was inside an equation node's DOM representation
          const equationNodeDom = domTarget.closest<HTMLElement>('[data-lexical-equation]');
          
          if (equationNodeDom) {
            const nodeKey = editor.getEditorState().read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    const node = selection.anchor.getNode();
                    const equationParent = node.getParents().find(p => $isEquationNode(p));
                    if ($isEquationNode(node)) return node.getKey();
                    if ($isEquationNode(equationParent)) return equationParent.getKey();
                }
                // Fallback: find node key from DOM element if possible (more complex)
                // This part is tricky as there's no direct Lexical API to get node from arbitrary DOM element
                // The EquationComponent itself should ideally handle its own click to edit.
                return null;
            });
            
            // This logic is now mainly handled by EquationComponent's own click/double-click listener
            // which dispatches INSERT_EQUATION_COMMAND with 'update'.
            // Keeping a basic selection handler here.
            return false; 
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  const handleModalSubmit = (equation: string, isInline: boolean) => {
    editor.update(() => {
      if (activeNodeKey) {
        // Update existing node
        const nodeToUpdate = $getNodeByKey(activeNodeKey);
        if ($isEquationNode(nodeToUpdate)) {
          nodeToUpdate.setEquation(equation);
          nodeToUpdate.setInline(isInline);
        }
      } else {
        // Insert new node
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const equationNode = $createEquationNode(equation, isInline);
          selection.insertNodes([equationNode]);
          if (selection.isCollapsed()) {
            equationNode.selectNext(0,0); // Try to select after insertion
          }
        }
      }
    });
    setIsModalOpen(false);
    setActiveNodeKey(null); // Reset after submit
  };

  return (
    <EquationEditorDialog
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setActiveNodeKey(null); // Reset on close
        editor.focus(); // Return focus to editor
      }}
      onSubmit={handleModalSubmit}
      initialEquation={initialEquation}
      initialInline={initialInline}
    />
  );
}
