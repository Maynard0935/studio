
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, Upload, Download, FileArchive } from 'lucide-react';
import { CATEGORIES, type CategoryName, INVENTORY_STORAGE_KEY, type InventoryData, type InventoryItem } from '@/lib/constants';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function CategoriesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [inventoryCounts, setInventoryCounts] = useState<Record<CategoryName, number>>(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.name, 0])) as Record<CategoryName, number>
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = () => {
    try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (!storedData || storedData === '{}') {
        toast({
          title: "No Data to Export",
          description: "Your inventory is empty.",
          variant: "destructive",
          duration: 4000,
        });
        return;
      }

      const blob = new Blob([storedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'snapstock_data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Your inventory data has been downloaded.",
        duration: 4000,
      });

    } catch (error) {
      console.error("Export failed", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting your data.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };
  
  const downloadAllAsZip = async () => {
    const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!storedData || storedData === '{}') {
      toast({ title: "No Data", description: "There is no inventory to export.", variant: "destructive", duration: 4000 });
      return;
    }

    toast({ title: "Zipping...", description: "Your download will begin shortly." });

    try {
      const inventory: InventoryData = JSON.parse(storedData);
      const zip = new JSZip();

      for (const categoryName in inventory) {
        const categoryFolder = zip.folder(categoryName);
        const items = inventory[categoryName as CategoryName] || [];

        if (categoryFolder && items.length > 0) {
          for (const [itemIndex, item] of items.entries()) {
            const itemFolderName = `item_${itemIndex + 1}`;
            const itemFolder = categoryFolder.folder(itemFolderName);

            if (itemFolder) {
              itemFolder.file("description.txt", item.description);
              for (const [photoIndex, photoDataUrl] of item.photos.entries()) {
                const base64Data = photoDataUrl.split(',')[1];
                itemFolder.file(`photo_${photoIndex + 1}.jpg`, base64Data, { base64: true });
              }
            }
          }
        }
      }

      const zipContent = await zip.generateAsync({ type: "blob" });
      const date = new Date().toISOString().split('T')[0];
      saveAs(zipContent, `inventory_backup_${date}.zip`);

    } catch (error) {
      console.error("Failed to create zip file", error);
      toast({ title: "Zip Failed", description: "Could not create the zip file. Please try again.", variant: "destructive", duration: 4000 });
    }
  };


  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          // Basic validation to check if it's a valid JSON
          JSON.parse(content);
          setImportData(content);
        } catch (error) {
          toast({
            title: "Invalid File",
            description: "The selected file is not a valid JSON backup file.",
            variant: "destructive",
            duration: 4000,
          });
          setImportData(null);
        }
      };
      reader.readAsText(file);
    }
    // Reset file input to allow selecting the same file again
    if(event.target) {
        event.target.value = "";
    }
  };

  const confirmImport = () => {
    if (importData) {
      try {
        const localDataString = localStorage.getItem(INVENTORY_STORAGE_KEY);
        const localData: InventoryData = localDataString ? JSON.parse(localDataString) : {};
        const importedData: InventoryData = JSON.parse(importData);

        const mergedData: InventoryData = { ...localData };

        for (const category in importedData) {
            const catName = category as CategoryName;
            if (!mergedData[catName]) {
                mergedData[catName] = [];
            }

            const localItems = new Map((mergedData[catName] ?? []).map(item => [item.id, item]));
            
            importedData[catName]?.forEach((importedItem: InventoryItem) => {
                const localItem = localItems.get(importedItem.id);
                if (!localItem) {
                    // Item is new, add it
                    localItems.set(importedItem.id, importedItem);
                } else {
                    // Item exists, keep the newest one
                    const localDate = new Date(localItem.createdAt);
                    const importedDate = new Date(importedItem.createdAt);
                    if (importedDate > localDate) {
                        localItems.set(importedItem.id, importedItem);
                    }
                }
            });
            mergedData[catName] = Array.from(localItems.values());
            // Sort by creation date descending
            mergedData[catName]?.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(mergedData));
        setImportData(null);
        toast({
          title: "Import Successful",
          description: "Inventory data has been merged. The page will now reload.",
          duration: 4000,
        });
        // Reload to reflect the new data
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error("Import failed", error);
        toast({
          title: "Import Failed",
          description: "An error occurred while merging the data.",
          variant: "destructive",
          duration: 4000,
        });
      }
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
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImportClick} className="bg-primary/10 hover:bg-primary/20">
                <Download className="mr-2 h-4 w-4" />
                Import
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept=".json" className="hidden" />
            <Button variant="outline" size="sm" onClick={handleExport} className="bg-primary/10 hover:bg-primary/20">
                <Upload className="mr-2 h-4 w-4" />
                Export
            </Button>
             <Button variant="outline" size="sm" onClick={downloadAllAsZip} className="bg-primary/10 hover:bg-primary/20">
                <FileArchive className="mr-2 h-4 w-4" />
                Zip
            </Button>
        </div>
      </header>

      <main className="w-full max-w-2xl flex-1 p-4 md:p-6">
        <div className="space-y-4">
          {CATEGORIES.map((category) => (
            <Link key={category.name} href={`/inventory/${encodeURIComponent(category.name)}`} passHref>
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <category.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                    <div className='flex-1'>
                      <p className="font-semibold text-base sm:text-lg">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{inventoryCounts[category.name]} items</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground whitespace-nowrap sm:size-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      router.push(`/add-item/${encodeURIComponent(category.name)}`);
                    }}
                  >
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <footer className="w-full border-t border-border/40 mt-auto bg-background/95 backdrop-blur-sm py-4">
        <div className="container mx-auto flex items-center justify-center">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Physical Inventory App. All rights reserved.</p>
        </div>
      </footer>
      
      <AlertDialog open={!!importData} onOpenChange={(open) => !open && setImportData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Merge</AlertDialogTitle>
            <AlertDialogDescription>
              This will merge the data from the imported file with your current inventory. New items will be added and existing items will be updated. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImportData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Merge Data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
