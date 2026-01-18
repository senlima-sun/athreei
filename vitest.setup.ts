/**
 * Vitest setup file
 *
 * This file is run before each test file and sets up:
 * - jest-dom matchers for DOM assertions (toBeInTheDocument, etc.)
 * - Any global test utilities
 */
import * as matchers from "@testing-library/jest-dom/matchers"
import { expect } from "vitest"

expect.extend(matchers)
