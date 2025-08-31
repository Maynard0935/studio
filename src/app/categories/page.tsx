"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { CATEGORIES, type CategoryName, INVENTORY_STORAGE_KEY, type InventoryData } from '@/lib/constants';
import { useEffect, useState } from 'react';

export default function CategoriesPage() {
    const [inventoryCounts, setInventoryCounts] = useState<Record<CategoryName, number>>(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.name, 0])) as Record<CategoryName, number>
  );

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (storedData) {
        const inventory: InventoryData = JSON.parse(storedData);
        const counts = Object.fromEntries(
          CATEGORIES.map(c => [c.name, inventory[c.name]?.length ?? 0])
        ) as Record<CategoryName, number>;
        setInventoryCounts(counts);
      }
    } catch (error) {
      console.error("Failed to load inventory from localStorage", error);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="w-full p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <Link href="/" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="w-10"></div>
      </header>

      <main className="w-full max-w-2xl flex-1 p-4 md:p-6">
        <div className="space-y-4">
          {CATEGORIES.map((category) => (
            <Card key={category.name} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <category.icon className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold text-lg">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{inventoryCounts[category.name]} items</p>
                  </div>
                </div>
                <Link href={`/add-item/${encodeURIComponent(category.name)}`} passHref>
                  <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-muted-foreground">
        <p>PHYSICAL INVENTORY APP</p>
      </footer>
    </div>
  );
}
