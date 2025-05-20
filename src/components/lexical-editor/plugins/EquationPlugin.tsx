
"use client";

import * as React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_EDITOR,
  LexicalCommand,
  NodeKey,
  createCommand,
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
} from 'lexical';
import { $createEquationNode, EquationNode, $isEquationNode } from '../nodes/EquationNode'; // Corrected import path
import EquationEditorDialog from '../ui/EquationEditorDialog'; // Corrected import path
import { mergeRegister } from '@lexical/utils';

export type InsertEquationPayload = {
  equation?: string;
  inline?: boolean;
  showModal?: boolean | 'update'; 
  nodeKeyToUpdate?: NodeKey;  
};

export const INSERT_EQUATION_COMMAND: LexicalCommand<InsertEquationPayload> = createCommand('INSERT_EQUATION_COMMAND');

export default function EquationPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  
  const [initialEquation, setInitialEquation] = React.useState('');
  const [initialInline, setInitialInline] = React.useState(false);
  const [activeNodeKey, setActiveNodeKey] = React.useState<NodeKey | null>(null);


  React.useEffect(() => {
    if (!editor.hasNodes([EquationNode])) {
      // This error is thrown during runtime if EquationNode is not registered.
      // It's good practice to ensure node registration.
      console.error('EquationPlugin: EquationNode not registered on editor. Ensure it is added to initialConfig.nodes.');
      // Optionally, throw new Error('EquationPlugin: EquationNode not registered on editor');
    }

    return mergeRegister(
      editor.registerCommand<InsertEquationPayload>(
        INSERT_EQUATION_COMMAND,
        (payload) => {
          const { equation, inline, showModal, nodeKeyToUpdate } = payload;

          if (showModal) {
            if (showModal === 'update' && nodeKeyToUpdate) {
                const node = editor.getEditorState().read(() => $getNodeByKey(nodeKeyToUpdate));
                if ($isEquationNode(node)) {
                    setInitialEquation(node.getEquation());
                    setInitialInline(node.isInline());
                    setActiveNodeKey(nodeKeyToUpdate);
                } else {
                    setInitialEquation(equation || '');
                    setInitialInline(inline || false);
                    setActiveNodeKey(null);
                }
            } else {
                setInitialEquation(equation || '\\frac{a}{b}'); 
                setInitialInline(inline || false);
                setActiveNodeKey(null);
            }
            setIsModalOpen(true);
            return true;
          }
          
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const equationNode = $createEquationNode(equation, inline);
              selection.insertNodes([equationNode]);
              if (selection.isCollapsed()) {
                equationNode.selectNext(0,0);
              }
            }
          });
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      )
    );
  }, [editor]);

  const handleModalSubmit = (equation: string, isInline: boolean) => {
    editor.update(() => {
      if (activeNodeKey) {
        const nodeToUpdate = $getNodeByKey(activeNodeKey);
        if ($isEquationNode(nodeToUpdate)) {
          nodeToUpdate.setEquation(equation);
          nodeToUpdate.setInline(isInline);
        }
      } else {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const equationNode = $createEquationNode(equation, isInline);
          selection.insertNodes([equationNode]);
          if (selection.isCollapsed()) {
             // Attempt to place cursor after the inserted node
            const nextSibling = equationNode.getNextSibling();
            if (nextSibling) {
                nextSibling.selectPrevious(0,0);
            } else {
                equationNode.selectNext(0,0);
            }
          }
        }
      }
    });
    setIsModalOpen(false);
    setActiveNodeKey(null); 
  };

  return (
    <EquationEditorDialog
      isOpen={isModalOpen}
      onClose={() => {
        setIsModalOpen(false);
        setActiveNodeKey(null); 
        editor.focus(); 
      }}
      onSubmit={handleModalSubmit}
      initialEquation={initialEquation}
      initialInline={initialInline}
    />
  );
}
