import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { ThemeProvider } from "./components/ThemeProvider"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { Toaster } from "./components/ui/Toaster"
import "./styles/globals.css"

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="athreei-theme">
      <ErrorBoundary>
        <App />
        <Toaster />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>
)
