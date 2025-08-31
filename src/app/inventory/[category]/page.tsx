"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, Camera, Trash2 } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { CATEGORIES, INVENTORY_STORAGE_KEY, type CategoryName, type InventoryData, type InventoryItem } from '@/lib/constants';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function InventoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryName = decodeURIComponent(params.category as string) as CategoryName;
  const category = CATEGORIES.find(c => c.name === categoryName);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!category) {
        toast({
            title: "Invalid Category",
            description: "The category does not exist.",
            variant: "destructive"
        });
        router.push('/categories');
        return;
    }

    try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (storedData) {
        const inventory: InventoryData = JSON.parse(storedData);
        setItems(inventory[categoryName] || []);
      }
    } catch (error) {
      console.error("Failed to load inventory from localStorage", error);
       toast({
        title: "Load Failed",
        description: "There was an error loading your inventory.",
        variant: "destructive",
      });
    }
  }, [category, categoryName, router, toast]);

  const handleDelete = (itemId: string) => {
     try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      const inventory: InventoryData = storedData ? JSON.parse(storedData) : {};
      
      const categoryItems = inventory[categoryName] || [];
      const updatedItems = categoryItems.filter(item => item.id !== itemId);
      inventory[categoryName] = updatedItems;

      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
      setItems(updatedItems);
      setItemToDelete(null);

      toast({
        title: "Item Deleted!",
        description: "The item has been removed from your inventory.",
      });
    } catch (error) {
      console.error("Failed to delete item from localStorage", error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your item.",
        variant: "destructive",
      });
    }
  }

  if (!category) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="w-full p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <Link href="/categories" passHref>
          <Button variant="ghost" size="icon">
            <ArrowLeft />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{category.name}</h1>
          <p className="text-muted-foreground">{items.length} items</p>
        </div>
        <Link href={`/add-item/${encodeURIComponent(category.name)}`} passHref>
            <Button variant="outline" size="icon" className="bg-accent hover:bg-accent/90">
                <Plus />
                <span className="sr-only">Add New Item</span>
            </Button>
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-6">
        {items.length > 0 ? (
          <div className="space-y-6">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardDescription>{new Date(item.createdAt).toLocaleString()}</CardDescription>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete item</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this inventory item.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>{item.description}</p>
                  {item.photos.length > 0 && (
                    <Carousel className="w-full max-w-xs mx-auto">
                      <CarouselContent>
                        {item.photos.map((photo, index) => (
                          <CarouselItem key={index}>
                             <div className="relative aspect-video">
                                <Image src={photo} alt={`Inventory item ${index + 1}`} fill className="object-cover rounded-md" />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {item.photos.length > 1 && (
                        <>
                            <CarouselPrevious />
                            <CarouselNext />
                        </>
                      )}
                    </Carousel>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No Items Found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by adding an item to this category.
            </p>
            <Link href={`/add-item/${encodeURIComponent(category.name)}`} passHref className="mt-6 inline-block">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Add First Item
              </Button>
            </Link>
          </div>
        )}
      </main>

       <footer className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t">
         <Link href={`/add-item/${encodeURIComponent(category.name)}`} passHref className="w-full">
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold" size="lg">
                 <Plus className="mr-2 h-4 w-4" /> Add New Item
            </Button>
        </Link>
      </footer>
    </div>
  );
}
