import Router from 'preact-router'
import { HomePage } from './pages/HomePage'
import { DocsPage } from './pages/DocsPage'

export function App() {
  return (
    <Router>
      <HomePage path="/" />
      <DocsPage path="/docs" />
      <DocsPage path="/docs/*" />
    </Router>
  )
}
