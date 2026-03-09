"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"

export type UserRole = "admin" | "operator"

export interface User {
  name: string
  role: UserRole
}

interface AuthContextValue {
  user: User | null
  login: (name: string, role: UserRole) => void
  logout: () => void
  isAdmin: boolean
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  isAdmin: false,
})

const STORAGE_KEY = "hh-auth"
const DEFAULT_PIN = "1234"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setUser(JSON.parse(stored))
    } catch {}
  }, [])

  const login = React.useCallback((name: string, role: UserRole) => {
    const u: User = { name, role }
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }, [])

  const logout = React.useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const isAdmin = user?.role === "admin"

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}

export async function getAdminPin(): Promise<string> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_pin")
    .single()

  if (error || !data) return DEFAULT_PIN
  return data.value || DEFAULT_PIN
}

export async function setAdminPin(pin: string) {
  await supabase
    .from("settings")
    .upsert({ key: "admin_pin", value: pin })
}
