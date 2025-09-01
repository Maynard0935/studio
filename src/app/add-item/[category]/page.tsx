
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Camera, Check, RefreshCw, Trash2, X, Loader2, Cpu, Monitor, Keyboard, Mouse, Speaker } from 'lucide-react';
import { CATEGORIES, INVENTORY_STORAGE_KEY, type CategoryName, type InventoryData, type InventoryItem, type InventoryPhoto } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';

// Define UPS and Camera as inline SVGs
const UpsIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M7 2h10v2H7zM5 4h14v14H5zM12 8v6m-3-3h6"/></svg>
);
const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);

const IT_PARTS = [
    { name: 'CPU', icon: Cpu },
    { name: 'Monitor', icon: Monitor },
    { name: 'Keyboard', icon: Keyboard },
    { name: 'Mouse', icon: Mouse },
    { name: 'UPS', icon: UpsIcon },
    { name: 'Speaker', icon: Speaker },
    { name: 'Camera', icon: CameraIcon },
] as const;

export default function AddItemPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryName = decodeURIComponent(params.category as string) as CategoryName;
  const category = CATEGORIES.find(c => c.name === categoryName);

  const [accountableOfficer, setAccountableOfficer] = useState('');
  const [endUser, setEndUser] = useState('');
  const [location, setLocation] = useState('');
  const [moreDetails, setMoreDetails] = useState('');
  const [photos, setPhotos] = useState<InventoryPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [photoToDeleteIndex, setPhotoToDeleteIndex] = useState<number | null>(null);
  const [partSelectionImage, setPartSelectionImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!category) {
        toast({
            title: "Invalid Category",
            description: "The category does not exist.",
            variant: "destructive",
            duration: 3000,
        });
        router.push('/categories');
    }
  }, [category, router, toast]);

  const handleTakePhotoClick = () => {
    if (isSaving) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (categoryName === 'IT EQUIPMENT') {
            setPartSelectionImage(result);
        } else {
            addPhoto(result);
        }
      };
      reader.readAsDataURL(file);
    }
    if(event.target) {
        event.target.value = "";
    }
  };

  const compressImage = (dataUrl: string, maxSize = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Failed to get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (error) => {
            console.error("Image load error", error);
            reject(new Error('Failed to load image for compression.'));
        };
        img.src = dataUrl;
    });
  };

  const addPhoto = async (imageData: string, part?: string) => {
    try {
        const compressedImage = await compressImage(imageData);
        const newPhoto: InventoryPhoto = { url: compressedImage };
        if (part) {
            newPhoto.part = part;
        }
        setPhotos((prev) => [...prev, newPhoto]);
    } catch (error) {
        console.error("Failed to compress image", error);
        toast({
            title: "Processing Failed",
            description: "Could not process the image. Please try again.",
            variant: "destructive",
            duration: 3000,
        });
        const newPhoto: InventoryPhoto = { url: imageData };
         if (part) {
            newPhoto.part = part;
        }
        setPhotos((prev) => [...prev, newPhoto]);
    }
  }


  const handlePartSelection = (partName: typeof IT_PARTS[number]['name']) => {
    if (partSelectionImage) {
        addPhoto(partSelectionImage, partName);
        setPartSelectionImage(null);
    }
  };

  const cancelPartSelection = () => {
    setPartSelectionImage(null);
  };
  
  const handleDeleteRequest = (index: number) => {
    setPhotoToDeleteIndex(index);
  };
  
  const confirmDeletePhoto = () => {
    if (photoToDeleteIndex !== null) {
      setPhotos((prev) => prev.filter((_, i) => i !== photoToDeleteIndex));
      setPhotoToDeleteIndex(null);
    }
  };


  const saveItem = async () => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please add at least one photo.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (!accountableOfficer.trim()) {
        toast({
          title: "Incomplete Details",
          description: "Please fill out the Accountable Officer field.",
          variant: "destructive",
          duration: 3000,
        });
        return;
    }
    
    setIsSaving(true);

    try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      const inventory: InventoryData = storedData ? JSON.parse(storedData) : {};

      const newItem: InventoryItem = {
        id: new Date().toISOString() + Math.random(),
        accountableOfficer,
        endUser,
        location,
        moreDetails,
        photos: photos,
        createdAt: new Date().toISOString(),
        isUpdated: false,
      };
      
      const categoryItems = inventory[categoryName] || [];
      categoryItems.unshift(newItem);
      inventory[categoryName] = categoryItems;

      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
      
      toast({
        title: "Item Saved!",
        description: `Your item has been saved to ${categoryName}.`,
        duration: 3000,
      });

      router.push(`/inventory/${encodeURIComponent(categoryName)}`);
    } catch (error) {
      console.error("Failed to save item", error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
         toast({
            title: "Storage Full",
            description: "Cannot save item. Your device storage for this app is full.",
            variant: "destructive",
            duration: 3000,
        });
      } else {
        toast({
            title: "Save Failed",
            description: "There was an error saving your item. Please try again.",
            variant: "destructive",
            duration: 3000,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!category) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="w-full p-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10 border-b">
        <Link href="/categories" passHref>
          <Button variant="ghost" size="icon" disabled={isSaving}>
            <ArrowLeft />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold">Add Item</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{category.name}</p>
        </div>
        <div className="w-10"></div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <Card>
            <CardContent className="p-4 space-y-4">
                <div>
                    <Label htmlFor="accountableOfficer" className="font-semibold">Accountable Officer</Label>
                    <Input
                        id="accountableOfficer"
                        value={accountableOfficer}
                        onChange={(e) => setAccountableOfficer(e.target.value)}
                        placeholder="Enter name of accountable officer"
                        className="mt-2"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <Label htmlFor="endUser" className="font-semibold">End-user</Label>
                    <Input
                        id="endUser"
                        value={endUser}
                        onChange={(e) => setEndUser(e.target.value)}
                        placeholder="Enter name of end-user"
                        className="mt-2"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <Label htmlFor="location" className="font-semibold">Location</Label>
                    <Input
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter location of the item"
                        className="mt-2"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <Label htmlFor="moreDetails" className="font-semibold">More Details</Label>
                    <Textarea
                        id="moreDetails"
                        value={moreDetails}
                        onChange={(e) => setMoreDetails(e.target.value)}
                        placeholder={`Enter any other details for the item in ${category.name}...`}
                        className="mt-2"
                        rows={4}
                        disabled={isSaving}
                    />
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <Label className="font-semibold">Photos ({photos.length})</Label>
                    <Button onClick={handleTakePhotoClick} className="bg-primary hover:bg-primary/90" disabled={isSaving}>
                        <Camera className="mr-2 h-4 w-4" />
                        Add Photo
                    </Button>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isSaving}
                    />
                </div>
                
                {photos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
                        {photos.map((photo, index) => (
                        <div key={index} className="relative group aspect-square">
                            <Image src={photo.url} alt={`Inventory item ${index + 1}`} fill className="object-cover rounded-md" />
                            {photo.part && (
                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                    {photo.part}
                                </div>
                            )}
                            {!isSaving && (
                              <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute top-1 right-1 h-7 w-7"
                                onClick={() => handleDeleteRequest(index)}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete photo</span>
                                </Button>
                            )}
                        </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                        <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">No photos added yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>

      <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm z-10 p-4 border-t">
        <Button onClick={saveItem} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold" size="lg" disabled={isSaving}>
           {isSaving ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : 'Save Item'}
        </Button>
      </footer>
      
      <AlertDialog open={photoToDeleteIndex !== null} onOpenChange={(open) => !open && setPhotoToDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPhotoToDeleteIndex(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePhoto}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!partSelectionImage} onOpenChange={(open) => !open && cancelPartSelection()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Part</DialogTitle>
          </DialogHeader>
          {partSelectionImage && <Image src={partSelectionImage} alt="Selected part preview" width={400} height={400} className="rounded-md object-contain max-h-[50vh] w-full" />}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {IT_PARTS.map(part => (
              <Button key={part.name} variant="outline" onClick={() => handlePartSelection(part.name)}>
                <part.icon className="mr-2 h-4 w-4" />
                {part.name}
              </Button>
            ))}
          </div>
           <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={cancelPartSelection}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    