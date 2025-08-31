"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, Camera, Trash2, Download } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function InventoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryName = decodeURIComponent(params.category as string) as CategoryName;
  const category = CATEGORIES.find(c => c.name === categoryName);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [thumbnailCarouselApi, setThumbnailCarouselApi] = useState<CarouselApi>()
  const [mainCarouselApi, setMainCarouselApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

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

    useEffect(() => {
    if (!thumbnailCarouselApi || !mainCarouselApi) {
      return
    }

    thumbnailCarouselApi.on("select", () => {
        mainCarouselApi.scrollTo(thumbnailCarouselApi.selectedScrollSnap())
    })

    mainCarouselApi.on("select", () => {
        thumbnailCarouselApi.scrollTo(mainCarouselApi.selectedScrollSnap())
    })

  }, [thumbnailCarouselApi, mainCarouselApi])


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
  
  const exportToCSV = () => {
    if (items.length === 0) {
      toast({
        title: "No Data",
        description: "There is no inventory data in this category to export.",
        variant: "destructive",
        duration: 4000
      });
      return;
    }

    try {
      let csvContent = "Category,Description,Date Created,Photo Count\n";
      
      items.forEach(item => {
        const row = [
          `"${categoryName}"`,
          `"${item.description.replace(/"/g, '""')}"`,
          `"${new Date(item.createdAt).toLocaleString()}"`,
          item.photos.length
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
                     <Dialog>
                        <DialogTrigger asChild>
                            <Carousel
                                setApi={setThumbnailCarouselApi}
                                className="w-full max-w-sm mx-auto cursor-pointer"
                            >
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
                                    <CarouselPrevious className="left-2" />
                                    <CarouselNext className="right-2" />
                                </>
                                )}
                            </Carousel>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl w-full h-[80vh] flex flex-col p-4 bg-white dark:bg-neutral-900">
                            <DialogHeader>
                            <DialogTitle>Image Preview</DialogTitle>
                            </DialogHeader>
                            <div className='flex-1 relative'>
                                <Carousel className="w-full h-full" setApi={setMainCarouselApi}>
                                    <CarouselContent className="h-full">
                                    {item.photos.map((photo, index) => (
                                        <CarouselItem key={index} className="h-full">
                                            <div className="relative w-full h-full">
                                            <Image src={photo} alt={`Enlarged inventory item ${index + 1}`} fill className="object-contain" />
                                            </div>
                                        </CarouselItem>
                                    ))}
                                    </CarouselContent>
                                    {item.photos.length > 1 && (
                                    <>
                                        <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2" />
                                        <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2" />
                                    </>
                                    )}
                                </Carousel>
                            </div>
                        </DialogContent>
                    </Dialog>
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
