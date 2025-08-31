import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <main className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <Logo />
        <h1 className="text-4xl font-bold mt-6 mb-4">Physical Inventory App</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">
          A simple and efficient way to track your physical assets. Snap photos, add descriptions, and keep your inventory up-to-date.
        </p>
        <Link href="/categories">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg sm:text-xl px-8 py-6 sm:px-12 sm:py-8 rounded-full shadow-lg transform transition-transform duration-200 hover:scale-105">
            Start Inventory
          </Button>
        </Link>
      </main>
      <footer className="py-6 text-center text-muted-foreground">
        <p>Physical Inventory App</p>
      </footer>
    </div>
  );
}
