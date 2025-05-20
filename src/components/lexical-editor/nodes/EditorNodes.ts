
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import type { Klass, LexicalNode } from "lexical";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { ImageNode } from "./ImageNode.tsx"; 
import { EquationNode } from "./EquationNode.tsx"; // Added EquationNode

// Collapsible nodes removed due to import issues with @lexical/collapsible
// EquationNode removed due to import issues with @lexical/math


const EditorNodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode, // Required for CodeHighlightPlugin
  TableNode,
  TableCellNode,
  TableRowNode,
  AutoLinkNode,
  LinkNode,
  HorizontalRuleNode,
  ImageNode,
  EquationNode, // Added EquationNode
  // CollapsibleContainerNode, // Removed
  // CollapsibleContentNode, // Removed
  // CollapsibleTitleNode, // Removed
];

export default EditorNodes;
