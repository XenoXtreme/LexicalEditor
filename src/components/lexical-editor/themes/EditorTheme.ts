
import type { EditorThemeClasses } from 'lexical';

const theme: EditorThemeClasses = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph', // Font size will be controlled by toolbar or inherit from body
  quote: 'editor-quote',
  heading: {
    h1: 'editor-heading-h1',
    h2: 'editor-heading-h2',
    h3: 'editor-heading-h3',
    h4: 'text-lg font-medium my-1.5',
    h5: 'text-base font-medium my-1',
    h6: 'text-sm font-medium my-0.5',
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem', // Base list item class
    checklist: 'editor-checklist', // Specific class for checklist container (ul/ol)
    listitemChecked: 'editor-listitem-checked', // Class for checked list items
    listitemUnchecked: 'editor-listitem-unchecked', // Class for unchecked list items
  },
  image: 'editor-image my-2 block', // class for custom ImageNode wrapper
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
    highlight: 'editor-text-highlight',
  },
  code: 'editor-code-block', // Base class for code block
  // Theme classes for code highlighting (tokens)
  codeHighlight: {
    'atrule': 'token_atrule', // Using simple class names, Tailwind will apply via globals.css
    'attr': 'token_attr',
    'boolean': 'token_boolean',
    'builtin': 'token_builtin',
    'cdata': 'token_cdata',
    'char': 'token_char',
    'class': 'token_class', // Keep 'class' if it doesn't conflict, or use 'class-name'
    'class-name': 'token_class-name',
    'comment': 'token_comment',
    'constant': 'token_constant',
    'deleted': 'token_deleted',
    'doctype': 'token_doctype',
    'entity': 'token_entity',
    'function': 'token_function',
    'important': 'token_important',
    'inserted': 'token_inserted',
    'keyword': 'token_keyword',
    'operator': 'token_operator',
    'prolog': 'token_prolog',
    'property': 'token_property',
    'punctuation': 'token_punctuation',
    'regex': 'token_regex',
    'selector': 'token_selector',
    'string': 'token_string',
    'symbol': 'token_symbol',
    'tag': 'token_tag',
    'url': 'token_url',
    'variable': 'token_variable',
  },
  table: 'w-full my-2 border-collapse border border-input', // Lexical__table in globals
  tableCell: 'border border-input p-2 align-top', // Lexical__tableCell
  tableCellHeader: 'bg-muted font-semibold border border-input p-2 text-left align-top', // Lexical__tableCellHeader
  tableRow: 'border-b border-input', // Lexical__tableRow
  horizontalRule: 'my-4 border-t border-border', // Lexical__horizontalRule
  collapsibleContainer: 'my-2 border border-input rounded', // Collapsible__container
  collapsibleTitle: 'p-2 bg-muted cursor-pointer font-medium hover:bg-accent/20', // Collapsible__title
  collapsibleContent: 'p-2 border-t border-input', // Collapsible__content
};

export default theme;
