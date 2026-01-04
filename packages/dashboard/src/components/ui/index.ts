/**
 * Shared UI components for athreei dashboard
 */

export { Button, buttonVariants } from "./Button"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  LegacyCard,
} from "./Card"

export { DataTable } from "./DataTable"
export type { DataTableProps, Column } from "./DataTable"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Modal,
} from "./Modal"
export type { ModalProps } from "./Modal"

export { PermissionBadge } from "./PermissionBadge"
export type { PermissionBadgeProps, PermissionLevel } from "./PermissionBadge"

export { SearchInput } from "./SearchInput"
export type { SearchInputProps } from "./SearchInput"

export { StatusIndicator } from "./StatusIndicator"
export type { StatusIndicatorProps, StatusType } from "./StatusIndicator"

export {
  RadixTabs,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  LegacyTabs,
} from "./Tabs"
export type { TabsProps, Tab } from "./Tabs"

export { Badge, badgeVariants } from "./badge"
export { Input } from "./input"
export { Label } from "./label"
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
} from "./select"
export { Separator } from "./separator"
export { Switch } from "./switch"
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

// New components for Task 5.8
export { Toast, ToastViewport } from "./toast"
export type { ToastProps, ToastViewportProps } from "./toast"
export { Toaster } from "./Toaster"
export { Spinner, LoadingState } from "./Spinner"
export {
  EmptyState,
  EmptyIcon,
  NoDataIcon,
  SearchIcon,
  LockIcon,
  ActivityIcon,
} from "./EmptyState"
export type { EmptyStateProps } from "./EmptyState"
