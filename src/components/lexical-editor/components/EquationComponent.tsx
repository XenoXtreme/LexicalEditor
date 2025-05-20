
"use client";

import type { LexicalEditor, NodeKey } from 'lexical';
import * as React from 'react';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from 'lexical';

import KatexRenderer from './KatexRenderer';
import { $isEquationNode } from '../nodes/EquationNode'; // Corrected import path
import { INSERT_EQUATION_COMMAND } from '../plugins/EquationPlugin'; 
import { cn } from '@/lib/utils';

interface EquationComponentProps {
  equation: string;
  inline: boolean;
  nodeKey: NodeKey;
  editor: LexicalEditor;
}

export default function EquationComponent({
  equation,
  inline,
  nodeKey,
  editor,
}: EquationComponentProps): JSX.Element {
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const equationRef = React.useRef<HTMLDivElement>(null);

  const onDelete = React.useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isEquationNode(node)) {
          node.remove();
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey, editor], 
  );

  const onEdit = React.useCallback(() => {
    editor.dispatchCommand(INSERT_EQUATION_COMMAND, { 
        showModal: 'update', 
        nodeKeyToUpdate: nodeKey,
        equation: equation, 
        inline: inline,     
    });
  }, [editor, nodeKey, equation, inline]);


  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (event) => {
          const target = event.target as Node;
          if (equationRef.current && (equationRef.current === target || equationRef.current.contains(target))) {
            if (!event.shiftKey) {
              clearSelection();
            }
            setSelected(true);
            if (event.detail === 2) { // Double click to edit
              onEdit();
            }
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (isSelected && $isNodeSelection($getSelection())) {
            event.preventDefault();
            onEdit(); 
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
       editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        (event: KeyboardEvent) => {
          if (isSelected) {
            clearSelection();
            setSelected(false);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, isSelected, nodeKey, onDelete, onEdit, clearSelection, setSelected]);


  return (
    <div 
      ref={equationRef} 
      className={cn(
        "cursor-pointer relative", 
        isSelected && "outline outline-2 outline-primary rounded-sm", 
        inline ? 'inline-block align-middle p-1' : 'block my-2 p-2' 
      )}
      data-lexical-equation-component // For easier DOM selection if needed
    >
      <KatexRenderer equation={equation} inline={inline} />
    </div>
  );
}
