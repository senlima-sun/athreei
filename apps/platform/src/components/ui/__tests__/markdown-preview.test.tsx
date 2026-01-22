import { describe, it, expect, vi } from "vitest"
import React from "react"
import { render, screen } from "@testing-library/react"

vi.mock("react-markdown", () => ({
  default: ({
    children,
    remarkPlugins,
    rehypePlugins,
    components,
  }: {
    children: string
    remarkPlugins?: unknown[]
    rehypePlugins?: unknown[]
    components?: Record<string, unknown>
  }) =>
    React.createElement(
      "div",
      {
        "data-testid": "react-markdown",
        "data-has-remark-plugins": String(!!remarkPlugins?.length),
        "data-has-rehype-plugins": String(!!rehypePlugins?.length),
        "data-has-components": String(!!components),
      },
      children
    ),
}))

vi.mock("remark-gfm", () => ({
  default: {},
}))

vi.mock("rehype-highlight", () => ({
  default: {},
}))

import { MarkdownPreview } from "../markdown-preview"

describe("MarkdownPreview", () => {
  describe("Rendering", () => {
    it("renders content through ReactMarkdown", () => {
      render(<MarkdownPreview content="# Hello World" />)

      const markdown = screen.getByTestId("react-markdown")
      expect(markdown).toBeInTheDocument()
      expect(markdown).toHaveTextContent("# Hello World")
    })

    it("uses remark-gfm plugin", () => {
      render(<MarkdownPreview content="Some content" />)

      const markdown = screen.getByTestId("react-markdown")
      expect(markdown).toHaveAttribute("data-has-remark-plugins", "true")
    })

    it("uses rehype-highlight plugin", () => {
      render(<MarkdownPreview content="Some content" />)

      const markdown = screen.getByTestId("react-markdown")
      expect(markdown).toHaveAttribute("data-has-rehype-plugins", "true")
    })

    it("provides custom components to ReactMarkdown", () => {
      render(<MarkdownPreview content="Some content" />)

      const markdown = screen.getByTestId("react-markdown")
      expect(markdown).toHaveAttribute("data-has-components", "true")
    })
  })

  describe("Empty State", () => {
    it("shows empty state when content is empty", () => {
      render(<MarkdownPreview content="" />)

      expect(screen.getByText("No content to preview")).toBeInTheDocument()
    })

    it("shows empty state when content is whitespace only", () => {
      render(<MarkdownPreview content="   " />)

      expect(screen.getByText("No content to preview")).toBeInTheDocument()
    })

    it("treats newline-only content as empty", () => {
      render(<MarkdownPreview content="\n\n\n" />)

      expect(screen.getByText("No content to preview")).toBeInTheDocument()
    })

    it("does not show empty state when content has text", () => {
      render(<MarkdownPreview content="Hello" />)

      expect(
        screen.queryByText("No content to preview")
      ).not.toBeInTheDocument()
    })
  })

  describe("Styling", () => {
    it("applies prose classes to container", () => {
      const { container } = render(<MarkdownPreview content="Some content" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass("prose")
      expect(wrapper).toHaveClass("prose-sm")
    })

    it("applies max-w-none to allow full width", () => {
      const { container } = render(<MarkdownPreview content="Some content" />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass("max-w-none")
    })

    it("applies custom className", () => {
      const { container } = render(
        <MarkdownPreview content="Some content" className="custom-class" />
      )

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass("custom-class")
    })

    it("applies proper styles to empty state", () => {
      const { container } = render(<MarkdownPreview content="" />)

      const emptyState = container.firstChild as HTMLElement
      expect(emptyState).toHaveClass("text-gray-400")
      expect(emptyState).toHaveClass("italic")
    })

    it("applies custom className to empty state", () => {
      const { container } = render(
        <MarkdownPreview content="" className="custom-empty" />
      )

      const emptyState = container.firstChild as HTMLElement
      expect(emptyState).toHaveClass("custom-empty")
    })
  })

  describe("Content Types", () => {
    it("renders heading content", () => {
      render(<MarkdownPreview content="# Heading 1" />)

      expect(screen.getByText("# Heading 1")).toBeInTheDocument()
    })

    it("renders list content", () => {
      render(<MarkdownPreview content="- Item 1\n- Item 2" />)

      expect(screen.getByText(/Item 1/)).toBeInTheDocument()
    })

    it("renders code content", () => {
      render(<MarkdownPreview content="```js\nconst x = 1;\n```" />)

      expect(screen.getByTestId("react-markdown")).toBeInTheDocument()
    })

    it("renders link content", () => {
      render(<MarkdownPreview content="[Link](https://example.com)" />)

      expect(screen.getByText(/Link/)).toBeInTheDocument()
    })

    it("renders bold content", () => {
      render(<MarkdownPreview content="**bold text**" />)

      expect(screen.getByText(/bold text/)).toBeInTheDocument()
    })

    it("renders italic content", () => {
      render(<MarkdownPreview content="*italic text*" />)

      expect(screen.getByText(/italic text/)).toBeInTheDocument()
    })

    it("renders blockquote content", () => {
      render(<MarkdownPreview content="> This is a quote" />)

      expect(screen.getByText(/This is a quote/)).toBeInTheDocument()
    })

    it("renders table content (GFM)", () => {
      render(
        <MarkdownPreview content="| Col1 | Col2 |\n|------|------|\n| A | B |" />
      )

      expect(screen.getByTestId("react-markdown")).toBeInTheDocument()
    })
  })
})
