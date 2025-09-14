
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, MouseEvent, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Plus, Camera, Trash2, Images, X, ChevronLeft, ChevronRight, Edit, Save, RotateCw } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { CATEGORIES, type CategoryName, type InventoryItem, type InventoryPhoto, type ItemStatus } from '@/lib/constants';
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';


export default function InventoryPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryName = decodeURIComponent(params.category as string) as CategoryName;
  const category = CATEGORIES.find(c => c.name === categoryName);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedItemPhotos, setSelectedItemPhotos] = useState<InventoryPhoto[] | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [editedMoreDetails, setEditedMoreDetails] = useState('');
  const [editedStatus, setEditedStatus] = useState<ItemStatus | null>(null);
  
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [rotation, setRotation] = useState(0);

  const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  
  const formatTimestamp = (timestamp: Timestamp | Date) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleString(undefined, dateTimeFormatOptions);
  };

  const fetchItems = useCallback(async () => {
    if (!category) return;
    
    setIsLoading(true);
    try {
        const q = query(
            collection(db, "inventory"), 
            where("category", "==", categoryName),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        const fetchedItems = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            } as InventoryItem;
        });
        setItems(fetchedItems);
    } catch (error) {
        console.error("Failed to load inventory from Firestore", error);
        toast({
            title: "Load Failed",
            description: "There was an error loading your inventory.",
            variant: "destructive",
            duration: 3000,
        });
    } finally {
        setIsLoading(false);
    }
  }, [category, categoryName, toast]);

  useEffect(() => {
    if (!category) {
        toast({
            title: "Invalid Category",
            description: "The category does not exist.",
            variant: "destructive",
            duration: 3000,
        });
        router.push('/categories');
        return;
    }

    fetchItems();
  }, [category, router, toast, fetchItems]);

  useEffect(() => {
    if (!carouselApi) {
      return
    }

    const handleSelect = () => {
      setRotation(0);
      setIsZoomed(false);
    }
 
    carouselApi.on("select", handleSelect)
 
    return () => {
      carouselApi.off("select", handleSelect)
    }
  }, [carouselApi]);
  
  const openPreview = (photos: InventoryPhoto[]) => {
    if (editingItemId) return;
    setSelectedItemPhotos(photos);
    setIsZoomed(false);
    setTransform({ x: 0, y: 0 });
    setRotation(0);
  };
  
  const closePreview = () => {
    setSelectedItemPhotos(null);
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  const handleZoomToggle = () => {
    setIsZoomed(!isZoomed);
    setTransform({ x: 0, y: 0 });
  };
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = ((clientX - left) / width - 0.5) * 100;
    const y = ((clientY - top) / height - 0.5) * 100;
    setTransform({ x, y });
  };


  const handleDelete = async (itemId: string) => {
     try {
      await deleteDoc(doc(db, "inventory", itemId));
      
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));

      toast({
        title: "Item Deleted!",
        description: "The item has been removed from your inventory.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to delete item from Firestore", error);
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your item.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }

  const handleStatusChange = async (itemId: string, isChecked: boolean) => {
    try {
      const itemRef = doc(db, "inventory", itemId);
      await updateDoc(itemRef, { isUpdated: isChecked });

      setItems(prevItems => prevItems.map(item => 
        item.id === itemId ? { ...item, isUpdated: isChecked } : item
      ));
      
      toast({
        title: "Status Updated",
        description: `Item marked as ${isChecked ? 'Done' : 'Pending'}.`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to update item status", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the item status.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setEditedMoreDetails(item.moreDetails);
    setEditedStatus(item.status);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editedMoreDetails.trim()) {
        toast({
          title: "Incomplete Details",
          description: "Details cannot be empty.",
          variant: "destructive",
          duration: 3000
        });
        return;
    }
    if (!editedStatus) {
        toast({
          title: "Incomplete Details",
          description: "Please select a status.",
          variant: "destructive",
          duration: 3000
        });
        return;
    }

    try {
        const itemRef = doc(db, "inventory", itemId);
        const updatedData = {
            moreDetails: editedMoreDetails,
            status: editedStatus,
            updatedAt: serverTimestamp() 
        };
        await updateDoc(itemRef, updatedData);

        // We fetch again to get the server-generated timestamp
        fetchItems(); 
        
        setEditingItemId(null);
      
        toast({
            title: "Item Updated",
            description: `The item details have been saved.`,
            duration: 3000,
        });
    } catch (error) {
      console.error("Failed to update item", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the item.",
        variant: "destructive",
        duration: 3000,
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
          <Button className="bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground">
            <ArrowLeft className="sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <div className="text-center flex-1 mx-4 overflow-hidden">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{category.name}</h1>
           {!isLoading && <p className="text-muted-foreground text-sm sm:text-base">{items.length} items</p>}
        </div>
        <div className="w-24"></div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Tabs value={filter} onValueChange={setFilter} className="w-full mb-4">
            <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
                <TabsTrigger value="all">All ({items.length})</TabsTrigger>
                <TabsTrigger value="done">Done ({items.filter(i => i.isUpdated).length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({items.filter(i => !i.isUpdated).length})</TabsTrigger>
            </TabsList>
        </Tabs>
        
        {isLoading ? (
             <div className="text-center py-16">
                <Camera className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
                <p className="mt-2 text-sm text-muted-foreground">Loading items...</p>
            </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className={cn(item.isUpdated && "border-green-500")}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <CardDescription className="text-xs sm:text-sm">{formatTimestamp(item.createdAt)}</CardDescription>
                      {item.updatedAt && <CardDescription className="text-xs sm:text-sm mt-1">Updated: {formatTimestamp(item.updatedAt)}</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2">
                        {editingItemId !== item.id && (
                             <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit item</span>
                            </Button>
                        )}
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
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 gap-4">
                      {editingItemId === item.id ? (
                          <div className="space-y-4 md:col-span-2">
                            <div>
                                <Label htmlFor="editMoreDetails" className="font-semibold">More Details</Label>
                                <Textarea id="editMoreDetails" value={editedMoreDetails} onChange={(e) => setEditedMoreDetails(e.target.value)} rows={4} className="mt-1" />
                            </div>
                             <div>
                                <Label className="font-semibold">Status</Label>
                                <RadioGroup
                                    value={editedStatus ?? ""}
                                    onValueChange={(value) => setEditedStatus(value as ItemStatus)}
                                    className="mt-2 flex gap-4"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Serviceable" id="edit-serviceable" />
                                        <Label htmlFor="edit-serviceable">Serviceable</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Unserviceable" id="edit-unserviceable" />
                                        <Label htmlFor="edit-unserviceable">Unserviceable</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                          </div>
                      ) : (
                        <div className="space-y-2 text-sm sm:text-base">
                          {item.status && <p><strong className="font-semibold">Status:</strong> {item.status}</p>}
                          {item.moreDetails && <p><strong className="font-semibold">Details:</strong> <span className="whitespace-pre-wrap">{item.moreDetails}</span></p>}
                        </div>
                      )}
                      
                      {item.photos && item.photos.length > 0 && (
                          <div className={cn("relative w-full max-w-sm mx-auto group", editingItemId !== item.id && "cursor-pointer")} onClick={() => item.photos && openPreview(item.photos)}>
                              <Carousel className="w-full" opts={{ loop: item.photos.length > 1 }}>
                                  <CarouselContent>
                                  {item.photos.map((photo, index) => (
                                      <CarouselItem key={index}>
                                        <div className="relative aspect-video">
                                          {photo && photo.url ? (
                                              <Image src={photo.url} alt={`Inventory item ${index + 1}`} fill className="object-cover rounded-md" />
                                          ) : null}
                                          {photo && photo.part && (
                                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                                  {photo.part}
                                                </div>
                                              )}
                                        </div>
                                      </CarouselItem>
                                  ))}
                                  </CarouselContent>
                              </Carousel>
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs sm:text-base px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full flex items-center gap-1 sm:gap-1.5 pointer-events-none">
                                  <Images className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span>{item.photos.length}</span>
                              </div>
                          </div>
                      )}
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                     {editingItemId === item.id ? (
                        <div className="flex justify-end w-full gap-2">
                            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                            <Button className="bg-primary hover:bg-primary/90" onClick={() => handleSaveEdit(item.id)}>
                                <Save className="mr-2 h-4 w-4"/>
                                Save
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
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
                    )}
                </CardFooter>
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
                <Link href={`/add-item/${encodeURIComponent(categoryName)}`} passHref className="mt-6 inline-block">
                <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Add First Item
                </Button>
                </Link>
            )}
          </div>
        )}
      </main>

      <footer className="w-full border-t border-border/40 mt-auto bg-background/95 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="container p-4 mx-auto">
            <Link href={`/add-item/${encodeURIComponent(categoryName)}`} passHref className="w-full">
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold" size="lg">
                    <Plus className="mr-2 h-4 w-4" /> Add New Item
                </Button>
            </Link>
        </div>
      </footer>

        <Dialog open={!!selectedItemPhotos} onOpenChange={closePreview}>
            <DialogContent className="w-screen h-screen max-w-full max-h-full p-0 bg-black/90 flex flex-col items-center justify-center border-0">
                <DialogHeader className="absolute top-4 left-4 z-50">
                    <DialogTitle className="text-white">Image Preview</DialogTitle>
                </DialogHeader>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50">
                    <X className="h-8 w-8 text-white" />
                    <span className="sr-only">Close</span>
                </DialogClose>
                <div className="absolute top-4 right-16 z-50">
                    <Button variant="ghost" size="icon" onClick={handleRotate} className="text-white hover:text-white hover:bg-white/10 h-10 w-10">
                      <RotateCw className="h-6 w-6" />
                       <span className="sr-only">Rotate</span>
                    </Button>
                </div>


                {selectedItemPhotos && (
                    <Carousel setApi={setCarouselApi} className="w-full h-full flex items-center justify-center" opts={{ loop: selectedItemPhotos.length > 1, draggable: !isZoomed }}>
                        <CarouselContent className="h-full">
                            {selectedItemPhotos.map((photo, index) => (
                                <CarouselItem key={index} className="h-full flex items-center justify-center overflow-hidden">
                                   {photo && photo.url ? (
                                    <div 
                                        className="relative w-full h-full flex items-center justify-center"
                                        onMouseMove={handleMouseMove}
                                    >
                                        <Image
                                            src={photo.url}
                                            alt={`Enlarged inventory item ${index + 1}`}
                                            width={2000}
                                            height={2000}
                                            onClick={handleZoomToggle}
                                            className={cn(
                                                "object-contain h-auto w-auto max-h-full max-w-full transition-transform duration-300 ease-in-out",
                                                isZoomed ? "scale-[2.5] cursor-zoom-out" : "cursor-zoom-in"
                                            )}
                                            style={{
                                                transform: `${isZoomed ? `scale(2.5) translate(${transform.x}%, ${transform.y}%)` : 'scale(1)'} rotate(${rotation}deg)`,
                                                transformOrigin: 'center center'
                                            }}
                                        />
                                    </div>
                                   ) : null}
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        {selectedItemPhotos.length > 1 && !isZoomed && (
                        <>
                            <CarouselPrevious className="absolute left-4 z-50 text-white bg-black/50 hover:bg-black/70 h-12 w-12">
                                <ChevronLeft className="h-8 w-8" />
                            </CarouselPrevious>
                            <CarouselNext className="absolute right-4 z-50 text-white bg-black/50 hover:bg-black/70 h-12 w-12">
                                <ChevronRight className="h-8 w-8" />
                            </CarouselNext>
                        </>
                        )}
                    </Carousel>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}

    