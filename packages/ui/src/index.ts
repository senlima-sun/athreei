/**
 * @athreei/ui - Shared UI components for athreei
 */

export { cn } from "./lib/utils"

// Button
export { Button, buttonVariants } from "./components/button"

// Card
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  LegacyCard,
} from "./components/card"

// Badge
export { Badge, badgeVariants } from "./components/badge"

// Input
export { Input } from "./components/input"

// Label
export { Label } from "./components/label"

// Select
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select"

// Dialog
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Modal,
} from "./components/dialog"
export type { ModalProps } from "./components/dialog"

// Tabs
export {
  RadixTabs,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  LegacyTabs,
} from "./components/tabs"
export type { TabsProps, Tab } from "./components/tabs"

// Switch
export { Switch } from "./components/switch"

// Separator
export { Separator } from "./components/separator"

// Spinner
export { Spinner, LoadingState } from "./components/spinner"

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/table"

// DataTable
export { DataTable } from "./components/data-table"
export type { DataTableProps, Column } from "./components/data-table"

// EmptyState
export {
  EmptyState,
  EmptyIcon,
  NoDataIcon,
  SearchIcon,
  LockIcon,
  ActivityIcon,
} from "./components/empty-state"
export type { EmptyStateProps } from "./components/empty-state"

// StatusIndicator
export { StatusIndicator } from "./components/status-indicator"
export type {
  StatusIndicatorProps,
  StatusType,
} from "./components/status-indicator"

// Toast
export { Toast, ToastViewport } from "./components/toast"
export type { ToastProps, ToastViewportProps } from "./components/toast"

// Toaster
export { Toaster } from "./components/toaster"

// Toast hook
export { useToast, toast } from "./hooks/use-toast"
export type { ToastVariant, ToastData, ToastInput } from "./hooks/use-toast"

// SearchInput
export { SearchInput } from "./components/search-input"
export type { SearchInputProps } from "./components/search-input"

// PermissionBadge
export { PermissionBadge } from "./components/permission-badge"
export type {
  PermissionBadgeProps,
  PermissionLevel,
} from "./components/permission-badge"
