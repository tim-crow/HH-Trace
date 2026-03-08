"use client"

import * as React from "react"

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
const ADMIN_PIN_KEY = "hh-admin-pin"
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

export function getAdminPin(): string {
  if (typeof window === "undefined") return DEFAULT_PIN
  return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN
}

export function setAdminPin(pin: string) {
  localStorage.setItem(ADMIN_PIN_KEY, pin)
}
