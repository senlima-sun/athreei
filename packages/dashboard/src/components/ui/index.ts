/**
 * Shared UI components for athreei dashboard
 */

export { Button, buttonVariants } from "./Button"
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, LegacyCard } from "./Card"
export type { CardProps } from "./Card"

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

export { RadixTabs, TabsList, TabsTrigger, TabsContent, Tabs } from "./Tabs"
export type { TabsProps, Tab } from "./Tabs"
