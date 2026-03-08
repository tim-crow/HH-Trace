"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"
import { getAuditLog } from "@/lib/audit-log"

export function AuditLogView() {
  const [filter, setFilter] = React.useState("")
  const entries = React.useMemo(() => getAuditLog().reverse(), [])

  const filtered = entries.filter(
    (e) =>
      e.userName.toLowerCase().includes(filter.toLowerCase()) ||
      e.action.toLowerCase().includes(filter.toLowerCase()) ||
      e.target.toLowerCase().includes(filter.toLowerCase()) ||
      e.details.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">Complete record of all system actions — who did what, when</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search actions, users, records..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-9"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>{entries.length} total entries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{entry.userName}</span>
                      <Badge variant={entry.userRole === "admin" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {entry.userRole}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      entry.action.includes("Deleted") ? "destructive" :
                      entry.action.includes("Created") || entry.action.includes("Added") ? "success" :
                      entry.action.includes("Updated") ? "warning" :
                      "secondary"
                    }>
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{entry.target}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">{entry.details}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {entries.length === 0 ? "No audit entries yet" : "No matching entries"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
