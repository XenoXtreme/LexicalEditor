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
    h4: 'text-lg font-medium my-1.5', // Added for completeness
    h5: 'text-base font-medium my-1', // Added for completeness
    h6: 'text-sm font-medium my-0.5', // Added for completeness
  },
  list: {
    nested: {
      listitem: 'editor-nested-listitem',
    },
    ol: 'editor-list-ol',
    ul: 'editor-list-ul',
    listitem: 'editor-listitem',
    listitemChecked: 'editor-listitem-checked',
    listitemUnchecked: 'editor-listitem-unchecked',
  },
  image: 'editor-image', // Styles for images if added
  link: 'editor-link',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    underlineStrikethrough: 'editor-text-underlineStrikethrough',
    code: 'editor-text-code',
  },
  code: 'editor-code-block', // For CodeNode
  codeHighlight: { // For CodeHighlightNode, used by CodeHighlightPlugin
    'atrule': 'text-sky-600 dark:text-sky-400',
    'attr': 'text-purple-600 dark:text-purple-400',
    'boolean': 'text-green-600 dark:text-green-400',
    'builtin': 'text-purple-600 dark:text-purple-400',
    'cdata': 'text-slate-500 dark:text-slate-400',
    'char': 'text-purple-600 dark:text-purple-400',
    'class': 'text-pink-600 dark:text-pink-400',
    'class-name': 'text-pink-600 dark:text-pink-400',
    'comment': 'text-slate-500 dark:text-slate-400',
    'constant': 'text-green-600 dark:text-green-400',
    'deleted': 'text-green-600 dark:text-green-400',
    'doctype': 'text-slate-500 dark:text-slate-400',
    'entity': 'text-yellow-600 dark:text-yellow-400',
    'function': 'text-pink-600 dark:text-pink-400',
    'important': 'text-orange-600 dark:text-orange-400',
    'inserted': 'text-purple-600 dark:text-purple-400',
    'keyword': 'text-sky-600 dark:text-sky-400',
    'operator': 'text-yellow-600 dark:text-yellow-400',
    'prolog': 'text-slate-500 dark:text-slate-400',
    'property': 'text-green-600 dark:text-green-400',
    'punctuation': 'text-slate-700 dark:text-slate-300',
    'regex': 'text-orange-600 dark:text-orange-400',
    'selector': 'text-purple-600 dark:text-purple-400',
    'string': 'text-purple-600 dark:text-purple-400',
    'symbol': 'text-green-600 dark:text-green-400',
    'tag': 'text-green-600 dark:text-green-400',
    'url': 'text-yellow-600 dark:text-yellow-400',
    'variable': 'text-orange-600 dark:text-orange-400',
  },
};

export default theme;
