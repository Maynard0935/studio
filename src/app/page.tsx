"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.photoURL ?? ''} alt={user?.displayName ?? 'User'} />
            <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-screen flex-col items-center">
       <header className="w-full p-4 flex items-center justify-end sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : user ? (
          <UserMenu />
        ) : (
          <Button onClick={signInWithGoogle} variant="outline">
            Sign In with Google
          </Button>
        )}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center p-4 text-center animate-in fade-in zoom-in-95 duration-500 -mt-16">
        <Logo />
        <h1 className="text-4xl font-bold mt-6 mb-4">Physical Inventory App</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          A simple and efficient way to track your physical assets. Snap photos, add descriptions, and keep your inventory up-to-date.
        </p>
        <Link href="/categories">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg sm:text-xl px-8 py-6 sm:px-12 sm:py-8 rounded-full shadow-lg">
            Start Inventory
          </Button>
        </Link>
      </main>
      <footer className="w-full border-t border-border/40">
        <div className="container mx-auto flex items-center justify-center py-4">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Physical Inventory App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
