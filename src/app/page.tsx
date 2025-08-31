import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <main className="flex flex-1 flex-col items-center justify-center">
        <Link href="/categories">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xl px-12 py-8 rounded-full shadow-lg transform transition-transform duration-200 hover:scale-105">
            Start Inventory
          </Button>
        </Link>
      </main>
      <footer className="py-6 text-center text-muted-foreground">
        <p>PHYSICAL INVENTORY APP</p>
      </footer>
    </div>
  );
}
