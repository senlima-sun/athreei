import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("../markdown-editor", () => ({
  MarkdownEditor: ({
    value,
    onChange,
    placeholder,
    disabled,
    id,
    className,
    minHeight,
  }: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    id?: string
    className?: string
    minHeight?: string
  }) =>
    React.createElement("textarea", {
      "data-testid": "markdown-editor",
      value,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        onChange(e.target.value),
      placeholder,
      disabled,
      id,
      className,
      style: { minHeight },
    }),
}))

vi.mock("../markdown-preview", () => ({
  MarkdownPreview: ({
    content,
    className,
  }: {
    content: string
    className?: string
  }) =>
    React.createElement(
      "div",
      { "data-testid": "markdown-preview", className },
      content
    ),
}))

import { MarkdownEditorWithPreview } from "../markdown-editor-with-preview"

describe("MarkdownEditorWithPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("View Mode Switching", () => {
    it("renders in edit mode by default", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="" onChange={onChange} />)

      expect(screen.getByTestId("markdown-editor")).toBeInTheDocument()
      expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument()
    })

    it("switches to preview mode when Preview button is clicked", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="# Hello" onChange={onChange} />)

      fireEvent.click(screen.getByTitle("Preview"))

      expect(screen.queryByTestId("markdown-editor")).not.toBeInTheDocument()
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument()
    })

    it("switches to split mode when Split button is clicked", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="# Hello" onChange={onChange} />)

      fireEvent.click(screen.getByTitle("Split"))

      expect(screen.getByTestId("markdown-editor")).toBeInTheDocument()
      expect(screen.getByTestId("markdown-preview")).toBeInTheDocument()
    })

    it("switches back to edit mode when Edit button is clicked", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="# Hello" onChange={onChange} />)

      fireEvent.click(screen.getByTitle("Preview"))
      fireEvent.click(screen.getByTitle("Edit"))

      expect(screen.getByTestId("markdown-editor")).toBeInTheDocument()
      expect(screen.queryByTestId("markdown-preview")).not.toBeInTheDocument()
    })
  })

  describe("Toolbar", () => {
    it("renders Edit, Split, and Preview buttons", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="" onChange={onChange} />)

      expect(screen.getByTitle("Edit")).toBeInTheDocument()
      expect(screen.getByTitle("Split")).toBeInTheDocument()
      expect(screen.getByTitle("Preview")).toBeInTheDocument()
    })

    it("renders fullscreen toggle button", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="" onChange={onChange} />)

      expect(screen.getByTitle("Fullscreen")).toBeInTheDocument()
    })

    it("highlights the active mode button", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="" onChange={onChange} />)

      const editButton = screen.getByTitle("Edit")
      expect(editButton).toHaveClass("bg-white")
      expect(editButton).toHaveClass("text-gray-900")
    })

    it("disables mode buttons when disabled prop is true", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditorWithPreview value="" onChange={onChange} disabled />
      )

      expect(screen.getByTitle("Edit")).toBeDisabled()
      expect(screen.getByTitle("Split")).toBeDisabled()
      expect(screen.getByTitle("Preview")).toBeDisabled()
    })
  })

  describe("Fullscreen Mode", () => {
    it("toggles fullscreen when fullscreen button is clicked", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditorWithPreview value="" onChange={onChange} />
      )

      const fullscreenButton = screen.getByTitle("Fullscreen")
      fireEvent.click(fullscreenButton)

      const editorContainer = container.querySelector(".fixed")
      expect(editorContainer).toBeInTheDocument()
    })

    it("shows backdrop when in fullscreen mode", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditorWithPreview value="" onChange={onChange} />
      )

      fireEvent.click(screen.getByTitle("Fullscreen"))

      const backdrop = container.querySelector(".bg-black\\/50")
      expect(backdrop).toBeInTheDocument()
    })

    it("exits fullscreen when backdrop is clicked", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditorWithPreview value="" onChange={onChange} />
      )

      fireEvent.click(screen.getByTitle("Fullscreen"))

      const backdrop = container.querySelector(".bg-black\\/50")
      fireEvent.click(backdrop!)

      expect(screen.getByTitle("Fullscreen")).toBeInTheDocument()
      expect(container.querySelector(".fixed.inset-4")).not.toBeInTheDocument()
    })

    it("changes button title to Exit fullscreen when in fullscreen mode", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="" onChange={onChange} />)

      fireEvent.click(screen.getByTitle("Fullscreen"))

      expect(screen.getByTitle("Exit fullscreen")).toBeInTheDocument()
    })
  })

  describe("Value and onChange", () => {
    it("passes value to MarkdownEditor", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditorWithPreview value="# Test Content" onChange={onChange} />
      )

      const editor = screen.getByTestId(
        "markdown-editor"
      ) as HTMLTextAreaElement
      expect(editor.value).toBe("# Test Content")
    })

    it("calls onChange when editor value changes", () => {
      const onChange = vi.fn()

      render(<MarkdownEditorWithPreview value="" onChange={onChange} />)

      const editor = screen.getByTestId("markdown-editor")
      fireEvent.change(editor, { target: { value: "New content" } })

      expect(onChange).toHaveBeenCalledWith("New content")
    })

    it("passes value to MarkdownPreview in preview mode", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditorWithPreview value="# Preview Test" onChange={onChange} />
      )

      fireEvent.click(screen.getByTitle("Preview"))

      expect(screen.getByTestId("markdown-preview")).toHaveTextContent(
        "# Preview Test"
      )
    })

    it("passes value to MarkdownPreview in split mode", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditorWithPreview value="# Split Test" onChange={onChange} />
      )

      fireEvent.click(screen.getByTitle("Split"))

      expect(screen.getByTestId("markdown-preview")).toHaveTextContent(
        "# Split Test"
      )
    })
  })

  describe("Props", () => {
    it("passes placeholder to MarkdownEditor", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditorWithPreview
          value=""
          onChange={onChange}
          placeholder="Write here..."
        />
      )

      const editor = screen.getByTestId("markdown-editor")
      expect(editor).toHaveAttribute("placeholder", "Write here...")
    })

    it("passes disabled to MarkdownEditor", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditorWithPreview value="" onChange={onChange} disabled />
      )

      const editor = screen.getByTestId("markdown-editor")
      expect(editor).toBeDisabled()
    })

    it("passes id to MarkdownEditor", () => {
      const onChange = vi.fn()

      render(
        <MarkdownEditorWithPreview
          value=""
          onChange={onChange}
          id="test-editor"
        />
      )

      const editor = screen.getByTestId("markdown-editor")
      expect(editor).toHaveAttribute("id", "test-editor")
    })

    it("applies custom className to container", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditorWithPreview
          value=""
          onChange={onChange}
          className="custom-class"
        />
      )

      expect(container.querySelector(".custom-class")).toBeInTheDocument()
    })

    it("applies minHeight style to content area", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditorWithPreview
          value=""
          onChange={onChange}
          minHeight="500px"
        />
      )

      const contentArea = container.querySelector(".flex-1.overflow-hidden")
      expect(contentArea).toHaveStyle({ minHeight: "500px" })
    })
  })

  describe("Styling", () => {
    it("has proper border styling on container", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditorWithPreview value="" onChange={onChange} />
      )

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass("border")
      expect(mainContainer).toHaveClass("border-gray-300")
      expect(mainContainer).toHaveClass("rounded-md")
    })

    it("has proper background on toolbar", () => {
      const onChange = vi.fn()

      const { container } = render(
        <MarkdownEditorWithPreview value="" onChange={onChange} />
      )

      const toolbar = container.querySelector(".bg-gray-50")
      expect(toolbar).toBeInTheDocument()
    })
  })
})
