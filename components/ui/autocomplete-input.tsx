"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onSelect"> {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  onSelect?: (value: string) => void
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  onSelect,
  className,
  ...props
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    if (!value.trim()) return suggestions
    const lower = value.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(lower))
  }, [value, suggestions])

  React.useEffect(() => {
    setActiveIndex(-1)
  }, [filtered])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectItem = (item: string) => {
    onChange(item)
    onSelect?.(item)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1))
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault()
      selectItem(filtered[activeIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.map((item, i) => (
            <button
              key={item}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                i === activeIndex && "bg-accent text-accent-foreground"
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                selectItem(item)
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
