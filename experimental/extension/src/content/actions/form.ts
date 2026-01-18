/**
 * Form action executor
 */

import type { AiiiFormArgs } from "@athreei/shared"

export interface FormResult {
  success: boolean
  action: string
  values?: Record<string, unknown>
  formSelector?: string
}

/**
 * Executes form actions: submit, reset, get-values, set-values
 */
export async function executeForm(args: AiiiFormArgs): Promise<FormResult> {
  const form = findForm(args.selector)
  if (!form) {
    throw new Error(`Form not found: ${args.selector}`)
  }

  switch (args.action) {
    case "submit":
      return submitForm(form, args.selector)

    case "reset":
      return resetForm(form, args.selector)

    case "get-values":
      return getFormValues(form, args.selector)

    case "set-values":
      if (!args.values) {
        throw new Error("set-values action requires values parameter")
      }
      return setFormValues(form, args.values, args.selector)

    default:
      throw new Error(`Unknown form action: ${args.action}`)
  }
}

/**
 * Find form element
 */
function findForm(selector: string): HTMLFormElement | null {
  const element = document.querySelector(selector)

  if (!element) {
    return null
  }

  if (element instanceof HTMLFormElement) {
    return element
  }

  // If selector points to an element inside a form, find the parent form
  const form = element.closest("form")
  return form
}

/**
 * Submit form
 */
function submitForm(form: HTMLFormElement, selector: string): FormResult {
  // Dispatch submit event (cancelable)
  const event = new Event("submit", { bubbles: true, cancelable: true })
  const prevented = !form.dispatchEvent(event)

  if (!prevented) {
    // If not prevented by event handler, submit the form
    form.submit()
  }

  return {
    success: true,
    action: "submit",
    formSelector: selector,
  }
}

/**
 * Reset form
 */
function resetForm(form: HTMLFormElement, selector: string): FormResult {
  form.reset()
  return {
    success: true,
    action: "reset",
    formSelector: selector,
  }
}

/**
 * Get form values
 */
function getFormValues(form: HTMLFormElement, selector: string): FormResult {
  const values: Record<string, unknown> = {}

  // Get all form elements
  const elements = form.elements

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement

    // Skip elements without name
    if (!element.name) continue

    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") {
        // Checkbox: return checked state
        values[element.name] = element.checked
      } else if (element.type === "radio") {
        // Radio: only include if checked
        if (element.checked) {
          values[element.name] = element.value
        }
      } else if (element.type === "file") {
        // File: return file names
        const files = Array.from(element.files || []).map((f) => f.name)
        values[element.name] = files
      } else {
        // Other inputs: return value
        values[element.name] = element.value
      }
    } else if (element instanceof HTMLSelectElement) {
      if (element.multiple) {
        // Multi-select: return array of selected values
        const selected = Array.from(element.selectedOptions).map(
          (opt) => opt.value
        )
        values[element.name] = selected
      } else {
        // Single select: return selected value
        values[element.name] = element.value
      }
    } else if (element instanceof HTMLTextAreaElement) {
      // Textarea: return value
      values[element.name] = element.value
    }
  }

  return {
    success: true,
    action: "get-values",
    values,
    formSelector: selector,
  }
}

/**
 * Set form values
 */
function setFormValues(
  form: HTMLFormElement,
  values: Record<string, unknown>,
  selector: string
): FormResult {
  const elements = form.elements

  for (const name in values) {
    const value = values[name]
    const element = elements.namedItem(name)

    if (!element) continue

    if (element instanceof RadioNodeList) {
      // Multiple elements with same name (radio buttons)
      for (let i = 0; i < element.length; i++) {
        const radio = element[i] as HTMLInputElement
        if (radio.type === "radio") {
          radio.checked = radio.value === value
          if (radio.checked) {
            radio.dispatchEvent(new Event("change", { bubbles: true }))
          }
        }
      }
    } else if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") {
        element.checked = Boolean(value)
        element.dispatchEvent(new Event("change", { bubbles: true }))
      } else if (element.type === "radio") {
        element.checked = element.value === value
        if (element.checked) {
          element.dispatchEvent(new Event("change", { bubbles: true }))
        }
      } else if (element.type === "file") {
        // File inputs cannot be set programmatically for security reasons
        console.warn(`Cannot set file input value for: ${name}`)
      } else {
        element.value = String(value)
        element.dispatchEvent(new Event("input", { bubbles: true }))
        element.dispatchEvent(new Event("change", { bubbles: true }))
      }
    } else if (element instanceof HTMLSelectElement) {
      if (element.multiple && Array.isArray(value)) {
        // Multi-select
        for (let i = 0; i < element.options.length; i++) {
          const option = element.options[i]!
          option.selected = value.includes(option.value)
        }
      } else {
        // Single select
        element.value = String(value)
      }
      element.dispatchEvent(new Event("change", { bubbles: true }))
    } else if (element instanceof HTMLTextAreaElement) {
      element.value = String(value)
      element.dispatchEvent(new Event("input", { bubbles: true }))
      element.dispatchEvent(new Event("change", { bubbles: true }))
    }
  }

  return {
    success: true,
    action: "set-values",
    values,
    formSelector: selector,
  }
}

/**
 * Select option from dropdown (standalone function for backward compatibility)
 */
export async function executeSelect(args: {
  selector: string
  value: string | string[]
}): Promise<{ selected: string | string[] }> {
  const element = document.querySelector(args.selector)
  if (!element || !(element instanceof HTMLSelectElement)) {
    throw new Error(`Select element not found: ${args.selector}`)
  }

  const values = Array.isArray(args.value) ? args.value : [args.value]

  for (const option of element.options) {
    option.selected = values.includes(option.value)
  }

  element.dispatchEvent(new Event("change", { bubbles: true }))

  return { selected: args.value }
}
