"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Package,
  PackageCheck,
  PackageX,
  Warehouse,
  FileText,
  ClipboardList,
  Home,
  Leaf,
  ScrollText,
} from "lucide-react"
import type { NavigationSection } from "@/lib/types"

const navigationItems: NavigationSection[] = [
  {
    title: "Data Entry",
    items: [
      { title: "Receival", icon: Package, href: "receival" },
      { title: "Processing", icon: PackageCheck, href: "processing" },
      { title: "Outgoing", icon: PackageX, href: "outgoing" },
    ],
  },
  {
    title: "Data Display",
    items: [
      { title: "Orders", icon: ClipboardList, href: "orders" },
      { title: "Live Inventory", icon: Warehouse, href: "inventory" },
      { title: "Records", icon: FileText, href: "records" },
    ],
  },
]

const adminItems: NavigationSection = {
  title: "Admin",
  items: [
    { title: "Audit Log", icon: ScrollText, href: "audit" },
  ],
}

interface SidebarProps {
  activeSection: string
  onNavigate: (section: string) => void
  isOpen: boolean
  isAdmin: boolean
}

export function Sidebar({ activeSection, onNavigate, isOpen, isAdmin }: SidebarProps) {
  const sections = isAdmin ? [...navigationItems, adminItems] : navigationItems

  return (
    <aside
      className={cn(
        "bg-background border-r transition-all duration-300 overflow-hidden flex flex-col",
        isOpen ? "w-64" : "w-0"
      )}
    >
      <div className="p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">Hemp Harvests</p>
            <p className="text-xs text-muted-foreground">Traceability System</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-auto p-3 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Overview</p>
          <Button
            variant={activeSection === "dashboard" ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-3 h-9", activeSection === "dashboard" && "font-medium")}
            onClick={() => onNavigate("dashboard")}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Button
                  key={item.title}
                  variant={activeSection === item.href ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-3 h-9", activeSection === item.href && "font-medium")}
                  onClick={() => onNavigate(item.href)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
