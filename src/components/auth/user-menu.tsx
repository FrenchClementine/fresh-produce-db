'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { LogOut, User, Loader2 } from 'lucide-react'

export function UserMenu() {
  const { user, staff, signOut } = useAuth()
  const { toast } = useToast()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign out',
        variant: 'destructive',
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  if (!user) return null

  const displayName = staff?.name || user.email?.split('@')[0] || 'User'
  const userInitials = staff?.name
    ? staff.name.split(' ').map(name => name.charAt(0).toUpperCase()).join('').slice(0, 2)
    : user.email?.split('@')[0]?.split('.').map(name => name.charAt(0).toUpperCase()).join('').slice(0, 2) || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-green-100 text-green-700">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {displayName}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {staff && (
              <>
                {staff.role && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {staff.role}
                  </p>
                )}
                {staff.department && (
                  <p className="text-xs leading-none text-muted-foreground">
                    {staff.department}
                  </p>
                )}
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}