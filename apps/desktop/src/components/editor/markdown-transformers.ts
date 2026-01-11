import {
  TRANSFORMERS,
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type Transformer,
} from "@lexical/markdown"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListNode, ListItemNode } from "@lexical/list"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { LinkNode, AutoLinkNode } from "@lexical/link"
import type { Klass, LexicalNode } from "lexical"

export const MARKDOWN_TRANSFORMERS: Transformer[] = TRANSFORMERS

export const EDITOR_NODES: Klass<LexicalNode>[] = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
]

export function parseMarkdown(markdown: string): void {
  $convertFromMarkdownString(markdown, MARKDOWN_TRANSFORMERS)
}

export function serializeMarkdown(): string {
  return $convertToMarkdownString(MARKDOWN_TRANSFORMERS)
}
