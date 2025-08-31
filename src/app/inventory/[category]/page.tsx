
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, Camera, Trash2, Download, Images, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';


export default function InventoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryName = decodeURIComponent(params.category as string) as CategoryName;
  const category = CATEGORIES.find(c => c.name === categoryName);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!category) {
        toast({
            title: "Invalid Category",
            description: "The category does not exist.",
            variant: "destructive",
            duration: 4000,
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
        duration: 4000,
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

      toast({
        title: "Item Deleted!",
        description: "The item has been removed from your inventory.",
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to delete item from localStorage", error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your item.",
        variant: "destructive",
        duration: 4000,
      });
    }
  }

  const handleStatusChange = (itemId: string, isChecked: boolean) => {
    try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      const inventory: InventoryData = storedData ? JSON.parse(storedData) : {};
      
      const categoryItems = inventory[categoryName] || [];
      const updatedItems = categoryItems.map(item => 
        item.id === itemId ? { ...item, isUpdated: isChecked } : item
      );
      inventory[categoryName] = updatedItems;

      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
      setItems(updatedItems);
      
      toast({
        title: "Status Updated",
        description: `Item marked as ${isChecked ? 'Done' : 'Pending'}.`,
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to update item status", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the item status.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };


  const exportToCSV = () => {
    const itemsToExport = filteredItems;
    if (itemsToExport.length === 0) {
      toast({
        title: "No Data",
        description: "There are no items in the current filter to export.",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    try {
      let csvContent = "Category,Description,Date Created,Photo Count,Status\n";
      
      itemsToExport.forEach(item => {
        const row = [
          `"${categoryName}"`,
          `"${item.description.replace(/"/g, '""')}"`,
          `"${new Date(item.createdAt).toLocaleString()}"`,
          item.photos.length,
          `"${item.isUpdated ? 'Done Update' : 'Pending'}"`
        ].join(',');
        csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute("href", url);
        link.setAttribute("download", `${categoryName}_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
       toast({
        title: "Export Successful",
        description: `Your inventory for ${categoryName} has been downloaded as a CSV file.`,
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to export data", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting your data.",
        variant: "destructive",
        duration: 4000,
      });
    }
  };


  if (!category) {
    return null;
  }
  
  const filteredItems = items.filter(item => {
    if (filter === 'done') return item.isUpdated;
    if (filter === 'pending') return !item.isUpdated;
    return true; // 'all'
  });

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
        <div className='flex items-center gap-2'>
            <Button variant="outline" size="icon" onClick={exportToCSV}>
                <Download />
                <span className="sr-only">Export to CSV</span>
            </Button>
            <Link href={`/add-item/${encodeURIComponent(category.name)}`} passHref>
                <Button variant="outline" size="icon" className="bg-accent hover:bg-accent/90">
                    <Plus />
                    <span className="sr-only">Add New Item</span>
                </Button>
            </Link>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Tabs value={filter} onValueChange={setFilter} className="w-full mb-4">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                <TabsTrigger value="done">Done ({items.filter(i => i.isUpdated).length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({items.filter(i => !i.isUpdated).length})</TabsTrigger>
            </TabsList>
        </Tabs>
        
        {filteredItems.length > 0 ? (
          <div className="space-y-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className={cn(item.isUpdated && "border-green-500")}>
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
                      <Dialog>
                        <DialogTrigger asChild>
                           <div className="relative w-full max-w-sm mx-auto group cursor-pointer">
                               <Carousel className="w-full" opts={{ loop: item.photos.length > 1 }}>
                                   <CarouselContent>
                                   {item.photos.map((photo, index) => (
                                       <CarouselItem key={index}>
                                           <div className="relative aspect-video">
                                               <Image src={photo} alt={`Inventory item ${index + 1}`} fill className="object-cover rounded-md border-2 border-white" />
                                           </div>
                                       </CarouselItem>
                                   ))}
                                   </CarouselContent>
                               </Carousel>
                               <div className="absolute bottom-2 right-2 bg-black/60 text-white text-base px-2.5 py-1.5 rounded-full flex items-center gap-1.5 pointer-events-none">
                                   <Images className="h-4 w-4" />
                                   <span>{item.photos.length}</span>
                               </div>
                           </div>
                        </DialogTrigger>
                        <DialogContent className="w-screen h-screen max-w-full max-h-full p-0 bg-black/80 flex items-center justify-center">
                           <DialogHeader className="absolute top-4 left-4 z-20">
                                <DialogTitle className="text-white">Image Preview</DialogTitle>
                           </DialogHeader>
                           <DialogClose className="absolute top-4 right-4 z-20 text-white rounded-full bg-black/50 p-2">
                               <X className="h-8 w-8" />
                           </DialogClose>
                           <Carousel className="w-full h-full" opts={{ loop: item.photos.length > 1 }}>
                               <CarouselContent className="h-full">
                                   {item.photos.map((photo, index) => (
                                       <CarouselItem key={index} className="h-full flex items-center justify-center">
                                            <div className="relative w-full h-5/6">
                                               <Image
                                                   src={photo}
                                                   alt={`Enlarged inventory item ${index + 1}`}
                                                   fill
                                                   className="object-contain"
                                               />
                                           </div>
                                       </CarouselItem>
                                   ))}
                               </CarouselContent>
                               {item.photos.length > 1 && (
                                   <>
                                       <CarouselPrevious className="absolute left-4 z-20 text-white bg-black/50 hover:bg-black/70 h-12 w-12">
                                           <ChevronLeft className="h-8 w-8" />
                                       </CarouselPrevious>
                                       <CarouselNext className="absolute right-4 z-20 text-white bg-black/50 hover:bg-black/70 h-12 w-12">
                                           <ChevronRight className="h-8 w-8" />
                                       </CarouselNext>
                                   </>
                               )}
                           </Carousel>
                        </DialogContent>
                      </Dialog>
                  )}
                </CardContent>
                <div className="p-4 flex items-center space-x-2">
                    <Checkbox
                        id={`done-update-${item.id}`}
                        checked={!!item.isUpdated}
                        onCheckedChange={(checked) => {
                            handleStatusChange(item.id, !!checked);
                        }}
                    />
                    <Label htmlFor={`done-update-${item.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Done Update
                    </Label>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No Items Found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {filter === 'all' && items.length === 0 ? 'Get started by adding an item to this category.' : `No items match the filter "${filter}".`}
            </p>
            {filter === 'all' && items.length === 0 && (
                <Link href={`/add-item/${encodeURIComponent(category.name)}`} passHref className="mt-6 inline-block">
                <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Add First Item
                </Button>
                </Link>
            )}
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
