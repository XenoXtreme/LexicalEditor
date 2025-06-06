
import type { EditorThemeClasses } from 'lexical';

const theme: EditorThemeClasses = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph', 
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
    listitem: 'editor-listitem', 
    checklist: 'editor-checklist', 
    listitemChecked: 'editor-listitem-checked', 
    listitemUnchecked: 'editor-listitem-unchecked', 
  },
  image: 'editor-image', // Main wrapper class for image and caption
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code', 
    highlight: 'editor-text-highlight', // For default highlight format
    subscript: 'align-sub text-xs', 
    superscript: 'align-super text-xs', 
  },
  code: 'editor-code-block', 
  codeHighlight: {
    'atrule': 'token_atrule',
    'attr': 'token_attr', 
    'boolean': 'token_boolean',
    'builtin': 'token_builtin',
    'cdata': 'token_cdata',
    'char': 'token_char',
    'class': 'token_class',
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
    'attr-value': 'token_attr-value', 
  },
  table: 'Lexical__table', 
  tableCell: 'Lexical__tableCell', 
  tableCellHeader: 'Lexical__tableCellHeader', 
  tableRow: 'Lexical__tableRow', 
  horizontalRule: 'Lexical__horizontalRule', 
  equation: 'editor-equation', 
  equationInline: 'editor-equation-inline',
  collapsibleContainer: 'editor-collapsible-container',
  collapsibleContent: 'editor-collapsible-content',
  collapsibleTitle: 'editor-collapsible-title',
};

export default theme;
