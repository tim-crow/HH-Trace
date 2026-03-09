"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, X, Send, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { InventoryItem, TransactionRecord } from "@/lib/types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AssistantChatProps {
  inventory: InventoryItem[]
  records: TransactionRecord[]
}

const SUGGESTIONS = [
  "What's my current inventory summary?",
  "Which batches are running low?",
  "Show me today's activity",
  "What product types do I have?",
]

export function AssistantChat({ inventory, records }: AssistantChatProps) {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [isTyping, setIsTyping] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const generateResponse = React.useCallback(
    (query: string): string => {
      const q = query.toLowerCase()

      // Inventory summary
      if (q.includes("inventory") && (q.includes("summary") || q.includes("overview") || q.includes("current"))) {
        const totalKg = inventory.reduce((sum, item) => sum + item.quantity, 0)
        const byType: Record<string, number> = {}
        inventory.forEach((item) => {
          byType[item.productType] = (byType[item.productType] || 0) + item.quantity
        })
        const breakdown = Object.entries(byType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, qty]) => `• **${type}**: ${qty.toLocaleString()} kg`)
          .join("\n")
        return `📦 **Inventory Summary**\n\nTotal: **${totalKg.toLocaleString()} kg** across **${inventory.length}** batches.\n\n${breakdown}`
      }

      // Low stock / running low
      if (q.includes("low") || q.includes("running low") || q.includes("depleted") || q.includes("empty")) {
        const lowItems = inventory.filter((item) => item.quantity < 50 && item.quantity > 0)
        const emptyItems = inventory.filter((item) => item.quantity === 0)
        if (lowItems.length === 0 && emptyItems.length === 0) {
          return "✅ All batches are above 50 kg — nothing running low right now."
        }
        let response = "⚠️ **Low Stock Alert**\n\n"
        if (lowItems.length > 0) {
          response += "**Below 50 kg:**\n" + lowItems.map((item) => `• ${item.productType} (${item.batchCode}): **${item.quantity} kg** — ${item.location}`).join("\n")
        }
        if (emptyItems.length > 0) {
          response += "\n\n**Depleted (0 kg):**\n" + emptyItems.map((item) => `• ${item.productType} (${item.batchCode}) — ${item.location}`).join("\n")
        }
        return response
      }

      // Today's activity
      if (q.includes("today") || q.includes("activity") || q.includes("recent")) {
        const today = new Date().toISOString().split("T")[0]
        const todaysRecords = records.filter((r) => r.date === today)
        const todaysInventory = inventory.filter((item) => item.lastUpdated.startsWith(today))
        if (todaysRecords.length === 0 && todaysInventory.length === 0) {
          return "📋 No activity recorded today yet. Start by adding a receival or processing record!"
        }
        let response = `📋 **Today's Activity** (${today})\n\n`
        if (todaysRecords.length > 0) {
          response += "**Records:**\n" + todaysRecords.map((r) => `• ${r.type}: ${r.productType} — ${r.batchCode} (${r.quantity} kg)`).join("\n")
        }
        if (todaysInventory.length > 0) {
          response += `\n\n**${todaysInventory.length}** inventory items updated today.`
        }
        return response
      }

      // Product types
      if (q.includes("product type") || q.includes("types") || q.includes("what products")) {
        const types = new Map<string, number>()
        inventory.forEach((item) => {
          types.set(item.productType, (types.get(item.productType) || 0) + 1)
        })
        const list = Array.from(types.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => `• **${type}** — ${count} batch${count > 1 ? "es" : ""}`)
          .join("\n")
        return `🌿 **Product Types in Inventory** (${types.size} unique)\n\n${list}`
      }

      // Specific product lookup
      const productKeywords = ["whole seeds", "hemp hearts", "hemp oil (raw)", "hemp oil (filtered)", "hemp protein cake", "hemp meal cake", "hemp protein powder", "hemp hulls", "hemp lights", "overs"]
      const matchedProduct = productKeywords.find((p) => q.includes(p))
      if (matchedProduct) {
        const displayName = matchedProduct.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        const items = inventory.filter((item) => item.productType.toLowerCase().includes(matchedProduct))
        if (items.length === 0) {
          return `No **${displayName}** found in current inventory.`
        }
        const totalKg = items.reduce((sum, item) => sum + item.quantity, 0)
        const list = items.map((item) => `• ${item.batchCode}: **${item.quantity} kg** — ${item.location}`).join("\n")
        return `🔍 **${displayName}** — ${totalKg.toLocaleString()} kg total across ${items.length} batch${items.length > 1 ? "es" : ""}\n\n${list}`
      }

      // Batch lookup
      if (q.includes("batch") && !q.includes("batches")) {
        const batchMatch = query.match(/\b([A-Z]{2,}\d{4,}[\w-]*)\b/i)
        if (batchMatch) {
          const code = batchMatch[1]
          const item = inventory.find((i) => i.batchCode.toLowerCase() === code.toLowerCase())
          if (item) {
            return `🔍 **Batch ${item.batchCode}**\n\n• Product: ${item.productType}\n• Quantity: **${item.quantity} kg**\n• Location: ${item.location}\n• Last Updated: ${new Date(item.lastUpdated).toLocaleString()}`
          }
          return `No batch matching "${code}" found in inventory.`
        }
      }

      // Location query
      if (q.includes("location") || q.includes("where") || q.includes("storage") || q.includes("factory") || q.includes("warehouse") || q.includes("cold storage")) {
        const byLocation: Record<string, { count: number; totalKg: number }> = {}
        inventory.forEach((item) => {
          if (!byLocation[item.location]) byLocation[item.location] = { count: 0, totalKg: 0 }
          byLocation[item.location].count++
          byLocation[item.location].totalKg += item.quantity
        })
        const list = Object.entries(byLocation)
          .sort((a, b) => b[1].totalKg - a[1].totalKg)
          .map(([loc, data]) => `• **${loc}**: ${data.count} batches, ${data.totalKg.toLocaleString()} kg`)
          .join("\n")
        return `📍 **Inventory by Location**\n\n${list}`
      }

      // Records / history
      if (q.includes("record") || q.includes("history") || q.includes("transaction")) {
        const byType: Record<string, number> = {}
        records.forEach((r) => {
          byType[r.type] = (byType[r.type] || 0) + 1
        })
        const list = Object.entries(byType)
          .map(([type, count]) => `• **${type}**: ${count}`)
          .join("\n")
        return `📜 **Transaction Records** (${records.length} total)\n\n${list}\n\nMost recent: **${records[records.length - 1]?.type}** — ${records[records.length - 1]?.batchCode} on ${records[records.length - 1]?.date}`
      }

      // Help
      if (q.includes("help") || q.includes("what can you")) {
        return `🤖 I can help you with:\n\n• **Inventory summary** — overview of all stock\n• **Low stock alerts** — batches below 50 kg\n• **Today's activity** — recent records and updates\n• **Product lookups** — ask about specific products (e.g., "hemp oil")\n• **Batch lookups** — find details for a specific batch code\n• **Location breakdown** — where stock is stored\n• **Transaction history** — record summaries\n\nJust ask in plain language!`
      }

      return `I'm not sure how to answer that yet. Try asking about:\n\n• Inventory summary\n• Low stock / running low\n• Today's activity\n• Specific products (e.g., "hemp oil")\n• Batch details\n• Storage locations\n\nOr type **help** for a full list of what I can do.`
    },
    [inventory, records]
  )

  const sendMessage = React.useCallback(
    (content: string) => {
      if (!content.trim()) return

      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsTyping(true)

      // Simulate typing delay
      setTimeout(() => {
        const response = generateResponse(content)
        const assistantMsg: Message = {
          id: `msg-${Date.now()}-r`,
          role: "assistant",
          content: response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setIsTyping(false)
      }, 400 + Math.random() * 600)
    },
    [generateResponse]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all",
          open && "scale-0 opacity-0"
        )}
        size="icon"
      >
        <Sparkles className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[400px] max-w-[90vw] bg-background border-l shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">HH Assistant</p>
              <p className="text-[11px] text-muted-foreground">Ask about your inventory & data</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="font-semibold text-sm mb-1">Hemp Harvests Assistant</p>
              <p className="text-xs text-muted-foreground mb-6">
                Ask questions about your inventory, batches, and processing data.
              </p>
              <div className="w-full space-y-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}
              >
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Ask about inventory, batches..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button size="icon" onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering for bold text and line breaks
  const parts = content.split("\n").map((line, i) => {
    const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    return (
      <span key={i}>
        {i > 0 && <br />}
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
      </span>
    )
  })
  return <>{parts}</>
}
