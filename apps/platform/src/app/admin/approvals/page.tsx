"use client"

import { CheckCircle, Clock, Eye, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useMarketplaceAdminPermissions } from "@/hooks/use-marketplace-admin-permissions"

interface PendingApproval {
  id: string
  name: string
  description: string
  submitter: {
    name: string
    submittedAt: Date
  }
  components: {
    skills: number
    commands: number
    agents: number
    hooks: number
  }
}

interface ApprovalCardProps {
  approval: PendingApproval
  canApprove: boolean
}

function ApprovalCard({ approval, canApprove }: ApprovalCardProps) {
  const componentSummary = [
    approval.components.skills > 0 && `${approval.components.skills} skills`,
    approval.components.commands > 0 &&
      `${approval.components.commands} commands`,
    approval.components.agents > 0 && `${approval.components.agents} agents`,
    approval.components.hooks > 0 && `${approval.components.hooks} hooks`,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{approval.name}</CardTitle>
            <CardDescription className="mt-1">
              {approval.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <span>Submitted by </span>
          <span className="font-medium text-foreground">
            {approval.submitter.name}
          </span>
          <span> on </span>
          <span className="font-medium text-foreground">
            {approval.submitter.submittedAt.toLocaleDateString()}
          </span>
        </div>

        {componentSummary && (
          <div className="text-sm">
            <span className="text-muted-foreground">Includes: </span>
            <span>{componentSummary}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          {canApprove && (
            <>
              <Button size="sm" className="gap-1">
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="gap-1">
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="gap-1">
            <Eye className="h-4 w-4" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/20">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">All caught up!</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          There are no plugins pending approval. New submissions will appear
          here for review.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Plugin approval workflow will be available in a future release.
        </p>
      </CardContent>
    </Card>
  )
}

export default function AdminApprovalsPage() {
  const { canApprovePlugins } = useMarketplaceAdminPermissions()

  const pendingApprovals: PendingApproval[] = []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pending Approvals</h1>
        <Badge variant="outline">{pendingApprovals.length} pending</Badge>
      </div>

      {pendingApprovals.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              canApprove={canApprovePlugins}
            />
          ))}
        </div>
      )}
    </div>
  )
}
