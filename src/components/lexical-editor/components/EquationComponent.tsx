
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
import { $isEquationNode } from '../nodes/EquationNode';
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
    [isSelected, nodeKey, editor], // editor added to dependencies
  );

  const onEdit = React.useCallback(() => {
    // Dispatch a command to open the modal for editing this specific node
    editor.dispatchCommand(INSERT_EQUATION_COMMAND, { 
        showModal: 'update', 
        nodeKeyToUpdate: nodeKey,
        equation: equation, // Pass current equation
        inline: inline,     // Pass current inline state
    });
  }, [editor, nodeKey, equation, inline]);


  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (event) => {
          if (event.target === equationRef.current || equationRef.current?.contains(event.target as Node)) {
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
            onEdit(); // Open editor on Enter when selected
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
    <div ref={equationRef} className={cn("cursor-pointer relative", isSelected && "outline outline-2 outline-primary rounded-sm", inline ? 'inline-block' : 'block my-2')}>
      <KatexRenderer equation={equation} inline={inline} />
      {/* Add a small edit button or visual cue when selected */}
      {/* {isSelected && (
        <button 
          onClick={onEdit} 
          className="absolute top-0 right-0 bg-gray-200 p-1 text-xs rounded"
          aria-label="Edit equation"
        >
          Edit
        </button>
      )} */}
    </div>
  );
}
