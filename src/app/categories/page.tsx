"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Download } from 'lucide-react';
import { CATEGORIES, type CategoryName, INVENTORY_STORAGE_KEY, type InventoryData, type InventoryItem } from '@/lib/constants';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

export default function CategoriesPage() {
    const router = useRouter();
    const { toast } = useToast();
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

  const exportToCSV = () => {
    try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (!storedData) {
        toast({
          title: "No Data",
          description: "There is no inventory data to export.",
          variant: "destructive"
        });
        return;
      }

      const inventory: InventoryData = JSON.parse(storedData);
      
      let csvContent = "Category,Description,Date Created,Photo Count\n";
      
      for (const categoryName in inventory) {
        const items = inventory[categoryName as CategoryName] || [];
        items.forEach(item => {
          const row = [
            `"${categoryName}"`,
            `"${item.description.replace(/"/g, '""')}"`,
            `"${new Date(item.createdAt).toLocaleString()}"`,
            item.photos.length
          ].join(',');
          csvContent += row + "\n";
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-t;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory_export_${new Date().toISOString()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
       toast({
        title: "Export Successful",
        description: "Your inventory data has been downloaded as a CSV file.",
      });
    } catch (error) {
      console.error("Failed to export data", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting your data.",
        variant: "destructive"
      });
    }
  };

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
         <Button variant="outline" size="icon" onClick={exportToCSV}>
            <Download />
            <span className="sr-only">Export to CSV</span>
        </Button>
      </header>

      <main className="w-full max-w-2xl flex-1 p-4 md:p-6">
        <div className="space-y-4">
          {CATEGORIES.map((category) => (
            <Link key={category.name} href={`/inventory/${encodeURIComponent(category.name)}`} passHref>
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <category.icon className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold text-lg">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{inventoryCounts[category.name]} items</p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      router.push(`/add-item/${encodeURIComponent(category.name)}`);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center text-muted-foreground">
        <p>PHYSICAL INVENTORY APP</p>
      </footer>
    </div>
  );
}
