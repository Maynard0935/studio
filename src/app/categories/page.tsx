
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus, FileArchive } from 'lucide-react';
import { CATEGORIES, type CategoryName, type InventoryItem } from '@/lib/constants';
import { useEffect, useState, useRef, useCallback } from 'react';
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
} from "@/components/ui/alert-dialog";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function CategoriesPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [inventoryCounts, setInventoryCounts] = useState<Record<CategoryName, number>>(() =>
    Object.fromEntries(CATEGORIES.map(c => [c.name, 0])) as Record<CategoryName, number>
  );
  const [showZipConfirm, setShowZipConfirm] = useState(false);

  const fetchInventoryCounts = useCallback(async () => {
    try {
        const inventoryRef = collection(db, "inventory");
        const querySnapshot = await getDocs(inventoryRef);
        const counts = Object.fromEntries(
            CATEGORIES.map(c => [c.name, 0])
        ) as Record<CategoryName, number>;

        querySnapshot.forEach((doc) => {
            const item = doc.data() as InventoryItem;
            if (item.category && counts.hasOwnProperty(item.category)) {
                counts[item.category]++;
            }
        });
        setInventoryCounts(counts);
    } catch (error) {
        console.error("Failed to load inventory counts from Firestore", error);
        toast({
            title: "Error",
            description: "Could not load inventory counts.",
            variant: "destructive",
        });
    }
  }, [toast]);

  useEffect(() => {
    fetchInventoryCounts();
  }, [fetchInventoryCounts]);

  const downloadAllAsZip = async () => {
    setShowZipConfirm(false);
    toast({ title: "Zipping...", description: "Your download will begin shortly." });

    try {
      const querySnapshot = await getDocs(collection(db, "inventory"));
       if(querySnapshot.empty) {
         toast({ title: "No Data", description: "There is no inventory to export.", variant: "destructive", duration: 3000 });
        return;
      }

      const zip = new JSZip();

      // Group items by category
      const inventoryByCategory: Record<string, any[]> = {};
      querySnapshot.forEach(doc => {
          const item = doc.data();
          const category = item.category || 'Uncategorized';
          if(!inventoryByCategory[category]) {
              inventoryByCategory[category] = [];
          }
          inventoryByCategory[category].push({ id: doc.id, ...item });
      });

      for (const categoryName in inventoryByCategory) {
        const categoryFolder = zip.folder(categoryName.replace(/[^a-zA-Z0-9]/g, '_'));
        const items = inventoryByCategory[categoryName] || [];

        if (categoryFolder && items.length > 0) {
          for (const [itemIndex, item] of items.entries()) {
            const itemFolderName = `item_${itemIndex + 1}_${item.id}`;
            const itemFolder = categoryFolder.folder(itemFolderName);

            if (itemFolder) {
              const descriptionText = `More Details: ${item.moreDetails}\nStatus: ${item.status}`;
              itemFolder.file("description.txt", descriptionText);

              if (item.photos && item.photos.length > 0) {
                  for (const [photoIndex, photo] of item.photos.entries()) {
                      try {
                        const response = await fetch(photo.url);
                        const blob = await response.blob();
                        itemFolder.file(`photo_${photoIndex + 1}.jpg`, blob);
                      } catch(e) {
                          console.error('Could not fetch photo for zipping', e);
                          itemFolder.file(`photo_${photoIndex + 1}_FETCH_ERROR.txt`, `URL: ${photo.url}`);
                      }
                  }
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
      toast({ title: "Zip Failed", description: "Could not create the zip file. Please try again.", variant: "destructive", duration: 3000 });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="w-full p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <Link href="/" passHref>
          <Button className="bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground">
            <ArrowLeft className="sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold">Categories</h1>
        <div className="flex items-center gap-2">
             <Button size="sm" onClick={() => setShowZipConfirm(true)} className="bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground">
                <FileArchive className="sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Zip</span>
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

      <AlertDialog open={showZipConfirm} onOpenChange={setShowZipConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Zip Export</AlertDialogTitle>
            <AlertDialogDescription>
              This will download a ZIP file of your entire inventory, including all photos from Firebase Storage. This may take a moment. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={downloadAllAsZip}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
