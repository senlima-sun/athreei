# @athreei/ui

Shared UI component library for athreei, built with shadcn/ui patterns using Radix UI primitives and Tailwind CSS v4.

## Tech Stack

- **Radix UI** - Accessible, unstyled primitives for building high-quality design systems
- **Tailwind CSS v4** - Utility-first CSS framework with OKLCH color space
- **class-variance-authority (CVA)** - Type-safe component variants
- **lucide-react** - Icon library
- **@tanstack/react-table** - Headless table utilities

## Installation

This package is internal to the athreei monorepo. It's automatically available to other packages.

```typescript
// In consuming packages, add to package.json dependencies:
{
  "dependencies": {
    "@athreei/ui": "workspace:*"
  }
}
```

### Styles Setup

Import the global styles in your app's entry point:

```typescript
import "@athreei/ui/styles"
```

## Available Components

### Form Components

| Component     | Description                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `Button`      | Primary button with variants: default, primary, destructive, danger, outline, secondary, ghost, link |
| `Input`       | Text input field                                                                                     |
| `Label`       | Form label                                                                                           |
| `Select`      | Dropdown select with `SelectTrigger`, `SelectContent`, `SelectItem`, etc.                            |
| `Switch`      | Toggle switch                                                                                        |
| `SearchInput` | Search input with debounce and clear button                                                          |

### Layout Components

| Component    | Description                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `Card`       | Container with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction` |
| `LegacyCard` | Simplified card with title and actions props                                                           |
| `Separator`  | Visual divider                                                                                         |
| `Tabs`       | Tab navigation with `TabsList`, `TabsTrigger`, `TabsContent`                                           |
| `LegacyTabs` | Simplified tabs with array-based API                                                                   |

### Feedback Components

| Component         | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `Badge`           | Status badge with variants: default, secondary, destructive, outline |
| `Spinner`         | Loading spinner (sm, md, lg sizes)                                   |
| `LoadingState`    | Centered loading spinner with message                                |
| `Toast`           | Toast notification                                                   |
| `Toaster`         | Toast container                                                      |
| `StatusIndicator` | Status dot (online, offline, warning, error)                         |
| `PermissionBadge` | Permission level badge (allowed, denied, ask)                        |
| `EmptyState`      | Empty state placeholder with icon, title, description, action        |

### Data Display

| Component   | Description                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| `Table`     | HTML table with `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableFooter`, `TableCaption` |
| `DataTable` | Feature-rich table with sorting, pagination (powered by TanStack Table)                                         |

### Overlay Components

| Component | Description                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `Dialog`  | Modal dialog with `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose` |
| `Modal`   | Simplified modal wrapper with isOpen/onClose API                                                                                      |

### Icons (Empty State)

| Icon           | Usage               |
| -------------- | ------------------- |
| `EmptyIcon`    | Generic empty state |
| `NoDataIcon`   | No data available   |
| `SearchIcon`   | No search results   |
| `LockIcon`     | Access denied       |
| `ActivityIcon` | No activity         |

### Utilities

| Export           | Description                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `cn`             | Class name merge utility (clsx + tailwind-merge)                                                     |
| `useToast`       | Toast hook for managing toasts                                                                       |
| `toast`          | Imperative toast function with `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()` |
| `buttonVariants` | CVA variants for Button                                                                              |
| `badgeVariants`  | CVA variants for Badge                                                                               |

## Usage Examples

### Button

```tsx
import { Button } from "@athreei/ui"

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// Loading state
<Button loading>Saving...</Button>

// As child (renders as anchor, etc.)
<Button asChild>
  <a href="/dashboard">Go to Dashboard</a>
</Button>
```

### Card

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@athreei/ui"
;<Card>
  <CardHeader>
    <CardTitle>Settings</CardTitle>
    <CardDescription>Manage your account settings</CardDescription>
    <CardAction>
      <Button variant="outline" size="sm">
        Edit
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>
    <Button>Save Changes</Button>
  </CardFooter>
</Card>

// Or use LegacyCard for simpler cases
import { LegacyCard } from "@athreei/ui"
;<LegacyCard title="Settings" actions={<Button size="sm">Edit</Button>}>
  {/* Content */}
</LegacyCard>
```

### Dialog / Modal

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@athreei/ui"
;<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure you want to proceed?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Or use Modal for controlled dialogs
import { Modal, Button } from "@athreei/ui"
;<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={
    <>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </>
  }
>
  Are you sure you want to proceed?
</Modal>
```

### DataTable

```tsx
import { DataTable, type Column } from "@athreei/ui"

interface User {
  id: string
  name: string
  email: string
  status: "active" | "inactive"
}

const columns: Column<User>[] = [
  { accessor: "name", header: "Name" },
  { accessor: "email", header: "Email" },
  {
    accessor: "status",
    header: "Status",
    cell: (value) => (
      <Badge variant={value === "active" ? "default" : "secondary"}>
        {value}
      </Badge>
    ),
  },
]

<DataTable
  columns={columns}
  data={users}
  loading={isLoading}
  emptyMessage="No users found"
  page={page}
  pageSize={10}
  total={totalUsers}
  onPageChange={setPage}
/>
```

### Toast

```tsx
import { useToast, toast, Toaster } from "@athreei/ui"

// Add Toaster to your app root
function App() {
  return (
    <>
      <MainContent />
      <Toaster />
    </>
  )
}

// Use imperatively
function handleSave() {
  toast.success({ title: "Saved!", description: "Your changes were saved." })
}

function handleError() {
  toast.error({ title: "Error", description: "Something went wrong." })
}

// Or use the hook
function Component() {
  const { toast } = useToast()

  return <Button onClick={() => toast({ title: "Hello" })}>Show Toast</Button>
}
```

### StatusIndicator

```tsx
import { StatusIndicator } from "@athreei/ui"

<StatusIndicator status="online" label="Connected" />
<StatusIndicator status="offline" label="Disconnected" />
<StatusIndicator status="warning" label="Degraded" />
<StatusIndicator status="error" label="Failed" />
```

### EmptyState

```tsx
import { EmptyState, SearchIcon } from "@athreei/ui"
;<EmptyState
  icon={<SearchIcon />}
  title="No results found"
  description="Try adjusting your search or filter criteria"
  action={{
    label: "Clear filters",
    onClick: handleClearFilters,
  }}
/>
```

### SearchInput

```tsx
import { SearchInput } from "@athreei/ui"
;<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Search users..."
  debounceMs={300}
/>
```

## Theming

The library uses CSS custom properties with OKLCH color space for theming. Colors are defined in `globals.css` and support light/dark modes.

### Color Tokens

| Token                | Usage                  |
| -------------------- | ---------------------- |
| `--background`       | Page background        |
| `--foreground`       | Primary text           |
| `--primary`          | Primary actions, links |
| `--secondary`        | Secondary elements     |
| `--muted`            | Muted backgrounds      |
| `--muted-foreground` | Secondary text         |
| `--accent`           | Hover states           |
| `--destructive`      | Destructive actions    |
| `--success`          | Success states         |
| `--warning`          | Warning states         |
| `--error`            | Error states           |
| `--info`             | Informational states   |
| `--border`           | Borders                |
| `--input`            | Input backgrounds      |
| `--ring`             | Focus rings            |

### Dark Mode

Add the `dark` class to your root element to enable dark mode:

```html
<html class="dark"></html>
```

### Customizing Colors

Override CSS variables in your app:

```css
:root {
  --primary: oklch(0.6 0.2 250);
  --primary-foreground: oklch(1 0 0);
}

.dark {
  --primary: oklch(0.7 0.18 250);
}
```

## Development

```bash
# Type check
bun run typecheck

# From monorepo root
bun run typecheck:all
```

## Adding New Components

1. Create component file in `src/components/`:

```tsx
// src/components/my-component.tsx
"use client"

import { cn } from "../lib/utils"

export interface MyComponentProps {
  // props
}

export function MyComponent({ className, ...props }: MyComponentProps) {
  return <div className={cn("base-classes", className)} {...props} />
}
```

2. Export from `src/index.ts`:

```typescript
// Components
export { MyComponent } from "./components/my-component"
export type { MyComponentProps } from "./components/my-component"
```

3. Follow these conventions:
   - Use `"use client"` directive for client components
   - Use `cn()` for class name merging
   - Accept `className` prop for customization
   - Use `data-slot` attributes for styling hooks
   - Export types alongside components
