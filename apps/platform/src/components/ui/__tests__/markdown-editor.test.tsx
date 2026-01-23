import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

vi.mock("@lexical/react/LexicalComposer", () => ({
  LexicalComposer: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", { "data-testid": "lexical-composer" }, children),
}))

vi.mock("@lexical/react/LexicalRichTextPlugin", () => ({
  RichTextPlugin: ({ contentEditable }: { contentEditable: React.ReactNode }) =>
    React.createElement(
      "div",
      { "data-testid": "rich-text-plugin" },
      contentEditable
    ),
}))

vi.mock("@lexical/react/LexicalContentEditable", () => ({
  ContentEditable: ({
    id,
    className,
    placeholder,
  }: {
    id?: string
    className?: string
    placeholder?: React.ReactNode
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": "content-editable",
        id,
        className,
        contentEditable: true,
        role: "textbox",
      },
      placeholder
    ),
}))

vi.mock("@lexical/react/LexicalHistoryPlugin", () => ({
  HistoryPlugin: () =>
    React.createElement("div", { "data-testid": "history-plugin" }),
}))

vi.mock("@lexical/react/LexicalOnChangePlugin", () => ({
  OnChangePlugin: () =>
    React.createElement("div", { "data-testid": "on-change-plugin" }),
}))

vi.mock("@lexical/react/LexicalMarkdownShortcutPlugin", () => ({
  MarkdownShortcutPlugin: () =>
    React.createElement("div", { "data-testid": "markdown-shortcut-plugin" }),
}))

vi.mock("@lexical/react/LexicalErrorBoundary", () => ({
  LexicalErrorBoundary: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", { "data-testid": "error-boundary" }, children),
}))

vi.mock("@lexical/react/LexicalComposerContext", () => ({
  useLexicalComposerContext: () => [
    {
      update: vi.fn((fn: () => void) => fn()),
      getEditorState: () => ({
        read: (fn: () => string) => fn(),
      }),
    },
  ],
}))

vi.mock("@lexical/markdown", () => ({
  $convertToMarkdownString: vi.fn(() => "# Test"),
  $convertFromMarkdownString: vi.fn(),
  TRANSFORMERS: [],
}))

vi.mock("lexical", () => ({}))

vi.mock("@lexical/rich-text", () => ({
  HeadingNode: class {},
  QuoteNode: class {},
}))

vi.mock("@lexical/list", () => ({
  ListNode: class {},
  ListItemNode: class {},
}))

vi.mock("@lexical/code", () => ({
  CodeNode: class {},
  CodeHighlightNode: class {},
}))

vi.mock("@lexical/link", () => ({
  LinkNode: class {},
  AutoLinkNode: class {},
}))

vi.mock("@lexical/react/LexicalHorizontalRuleNode", () => ({
  HorizontalRuleNode: class {},
}))

import { MarkdownEditor } from "../markdown-editor"

describe("MarkdownEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders the editor container", () => {
      const onChange = vi.fn()

      render(<MarkdownEditor value="" onChange={onChange} />)

      expect(screen.getByTestId("lexical-composer")).toBeInTheDocument()
    })

    it("renders all required Lexical plugins", () => {
      const onChange = vi.fn()

      render(<MarkdownEditor value="" onChange={onChange} />)

      expect(screen.getByTestId("rich-text-plugin")).toBeInTheDocument()
      expect(screen.getByTestId("history-plugin")).toBeInTheDocument()
      expect(screen.getByTestId("on-change-plugin")).toBeInTheDocument()
      expect(screen.getByTestId("markdown-shortcut-plugin")).toBeInTheDocument()
    })

    it("renders content editable area", () => {
      const onChange = vi.fn()

      render(<MarkdownEditor value="" onChange={onChange} />)

      expect(screen.getByTestId("content-editable")).toBeInTheDocument()
    })

    it("renders placeholder text", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditor
          value=""
          onChange={onChange}
          placeholder="Write something..."
        />
      )

      expect(screen.getByText("Write something...")).toBeInTheDocument()
    })

    it("renders default placeholder when not provided", () => {
      const onChange = vi.fn()

      render(<MarkdownEditor value="" onChange={onChange} />)

      expect(screen.getByText("Write markdown content...")).toBeInTheDocument()
    })

    it("passes id to content editable", () => {
      const onChange = vi.fn()

      render(<MarkdownEditor value="" onChange={onChange} id="test-editor" />)

      const editable = screen.getByTestId("content-editable")
      expect(editable).toHaveAttribute("id", "test-editor")
    })
  })

  describe("Props", () => {
    it("applies custom className to container", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditor value="" onChange={onChange} className="custom-class" />
      )

      const editorContainer = container.querySelector(".custom-class")
      expect(editorContainer).toBeInTheDocument()
    })

    it("applies minHeight style to container", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditor value="" onChange={onChange} minHeight="400px" />
      )

      const wrapper = container.querySelector(
        '[data-testid="lexical-composer"]'
      )?.firstElementChild as HTMLElement
      expect(wrapper).toHaveStyle({ minHeight: "400px" })
    })

    it("applies disabled styles when disabled prop is true", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditor value="" onChange={onChange} disabled />
      )

      const wrapper = container.querySelector(
        '[data-testid="lexical-composer"]'
      )?.firstElementChild as HTMLElement
      expect(wrapper).toHaveClass("cursor-not-allowed")
      expect(wrapper).toHaveClass("opacity-50")
    })

    it("does not apply disabled styles when disabled prop is false", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditor value="" onChange={onChange} disabled={false} />
      )

      const wrapper = container.querySelector(
        '[data-testid="lexical-composer"]'
      )?.firstElementChild as HTMLElement
      expect(wrapper).not.toHaveClass("cursor-not-allowed")
      expect(wrapper).not.toHaveClass("opacity-50")
    })
  })

  describe("Styling", () => {
    it("has proper border styling", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditor value="" onChange={onChange} />
      )

      const wrapper = container.querySelector(
        '[data-testid="lexical-composer"]'
      )?.firstElementChild as HTMLElement
      expect(wrapper).toHaveClass("border")
      expect(wrapper).toHaveClass("border-gray-300")
      expect(wrapper).toHaveClass("rounded-md")
    })

    it("has proper background styling", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditor value="" onChange={onChange} />
      )

      const wrapper = container.querySelector(
        '[data-testid="lexical-composer"]'
      )?.firstElementChild as HTMLElement
      expect(wrapper).toHaveClass("bg-white")
    })
  })
})
