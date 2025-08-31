"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Camera, Check, RefreshCw, Trash2, X } from 'lucide-react';
import { CATEGORIES, INVENTORY_STORAGE_KEY, type CategoryName, type InventoryData, type InventoryItem } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from '@/components/ui/card';

export default function AddItemPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const categoryName = decodeURIComponent(params.category as string) as CategoryName;
  const category = CATEGORIES.find(c => c.name === categoryName);

  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!category) {
        toast({
            title: "Invalid Category",
            description: "The category does not exist.",
            variant: "destructive"
        });
        router.push('/categories');
    }
  }, [category, router, toast]);

  const handleTakePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
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


  const confirmPhoto = async () => {
    if (previewImage) {
        try {
            const compressedImage = await compressImage(previewImage);
            setPhotos((prev) => [...prev, compressedImage]);
            setPreviewImage(null);
        } catch (error) {
            console.error("Failed to compress image", error);
            toast({
                title: "Processing Failed",
                description: "Could not process the image. Please try again.",
                variant: "destructive",
            });
            // Still add the original image if compression fails
            setPhotos((prev) => [...prev, previewImage]);
            setPreviewImage(null);
        }
    }
};

  const retakePhoto = () => {
    setPreviewImage(null);
    handleTakePhotoClick();
  };

  const cancelPhoto = () => {
    setPreviewImage(null);
  };

  const deletePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const saveItem = () => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please add at least one photo.",
        variant: "destructive",
      });
      return;
    }
    if (!description.trim()) {
        toast({
          title: "No Description",
          description: "Please add a description.",
          variant: "destructive",
        });
        return;
    }

    try {
      const storedData = localStorage.getItem(INVENTORY_STORAGE_KEY);
      const inventory: InventoryData = storedData ? JSON.parse(storedData) : {};

      const newItem: InventoryItem = {
        id: new Date().toISOString() + Math.random(),
        description,
        photos,
        createdAt: new Date().toISOString(),
      };
      
      const categoryItems = inventory[categoryName] || [];
      categoryItems.unshift(newItem);
      inventory[categoryName] = categoryItems;

      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
      
      toast({
        title: "Item Saved!",
        description: `Your item has been saved to ${categoryName}.`,
      });

      router.push('/categories');
    } catch (error) {
      console.error("Failed to save item to localStorage", error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
         toast({
            title: "Storage Full",
            description: "Cannot save item. Your device storage for this app is full.",
            variant: "destructive",
        });
      } else {
        toast({
            title: "Save Failed",
            description: "There was an error saving your item.",
            variant: "destructive",
        });
      }
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
          <h1 className="text-2xl font-bold">Add Item</h1>
          <p className="text-muted-foreground">{category.name}</p>
        </div>
        <div className="w-10"></div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <Card>
            <CardContent className="p-4">
                <Label htmlFor="description" className="font-semibold">Item Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Enter details for the item in ${category.name}...`}
                    className="mt-2"
                    rows={4}
                />
            </CardContent>
        </Card>
        
        <Card>
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <Label className="font-semibold">Photos ({photos.length})</Label>
                    <Button onClick={handleTakePhotoClick} className="bg-primary hover:bg-primary/90">
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
                    />
                </div>
                
                {photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {photos.map((photo, index) => (
                        <div key={index} className="relative group aspect-square">
                            <Image src={photo} alt={`Inventory item ${index + 1}`} fill className="object-cover rounded-md" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                            <Button variant="destructive" size="icon" onClick={() => deletePhoto(index)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete photo</span>
                            </Button>
                            </div>
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

      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t">
        <Button onClick={saveItem} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold" size="lg">
          Save Item
        </Button>
      </footer>

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && cancelPhoto()}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Confirm Photo</DialogTitle>
          </DialogHeader>
          {previewImage && <Image src={previewImage} alt="Preview" width={400} height={400} className="rounded-md object-contain max-h-[60vh] w-full" />}
          <DialogFooter className="grid grid-cols-3 gap-2 mt-4">
            <Button variant="outline" onClick={cancelPhoto}>
                <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button variant="outline" onClick={retakePhoto}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button onClick={confirmPhoto} className="bg-primary hover:bg-primary/90">
                <Check className="mr-2 h-4 w-4" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
