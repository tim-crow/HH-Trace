"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Leaf, Shield, User } from "lucide-react"
import { useAuth, getAdminPin } from "@/lib/auth"
import type { UserRole } from "@/lib/auth"

export function LoginScreen() {
  const { login } = useAuth()
  const [name, setName] = React.useState("")
  const [pin, setPin] = React.useState("")
  const [selectedRole, setSelectedRole] = React.useState<UserRole | null>(null)
  const [error, setError] = React.useState("")

  const handleLogin = () => {
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }
    if (selectedRole === "admin") {
      if (pin !== getAdminPin()) {
        setError("Incorrect admin PIN")
        return
      }
    }
    login(name.trim(), selectedRole!)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm mx-auto mb-4">
            <Leaf className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Hemp Harvests</h1>
          <p className="text-muted-foreground text-sm">Traceability System</p>
        </div>

        {!selectedRole ? (
          <div className="grid grid-cols-2 gap-4">
            <Card
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => setSelectedRole("admin")}
            >
              <CardContent className="p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-3">
                  <Shield className="h-6 w-6" />
                </div>
                <p className="font-semibold">Admin</p>
                <p className="text-xs text-muted-foreground mt-1">Full access</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => setSelectedRole("operator")}
            >
              <CardContent className="p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-3">
                  <User className="h-6 w-6" />
                </div>
                <p className="font-semibold">Operator</p>
                <p className="text-xs text-muted-foreground mt-1">Data entry</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedRole === "admin" ? <Shield className="h-5 w-5" /> : <User className="h-5 w-5" />}
                Sign in as {selectedRole === "admin" ? "Admin" : "Operator"}
              </CardTitle>
              <CardDescription>
                {selectedRole === "admin"
                  ? "Full access — edit, delete, and manage all records"
                  : "Log receivals, processing, and update statuses"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError("") }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
              {selectedRole === "admin" && (
                <div className="space-y-2">
                  <Label>Admin PIN</Label>
                  <Input
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError("") }}
                    onKeyDown={handleKeyDown}
                    maxLength={8}
                  />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSelectedRole(null); setError(""); setPin("") }} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleLogin} className="flex-1">
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
