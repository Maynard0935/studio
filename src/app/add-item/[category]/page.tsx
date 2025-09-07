
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
import { CATEGORIES, type CategoryName, type InventoryItem, type InventoryPhoto, type ItemStatus } from '@/lib/constants';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

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

  const [moreDetails, setMoreDetails] = useState('');
  const [status, setStatus] = useState<ItemStatus | null>(null);
  const [photos, setPhotos] = useState<InventoryPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [photoToDeleteIndex, setPhotoToDeleteIndex] = useState<number | null>(null);
  const [partSelectionImage, setPartSelectionImage] = useState<string | null>(null);
  const [imageForConfirmation, setImageForConfirmation] = useState<string | null>(null);

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
        addPhoto(result);
      };
      reader.readAsDataURL(file);
    }
    if(event.target) {
        event.target.value = "";
    }
  };

  const compressImage = (dataUrl: string, maxSize = 800): Promise<string> => {
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
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (error) => {
            console.error("Image load error", error);
            reject(new Error('Failed to load image for compression.'));
        };
        img.src = dataUrl;
    });
  };

  const addPhoto = async (imageData: string, part?: string) => {
    if (categoryName === 'IT EQUIPMENT' && !part) {
        setPartSelectionImage(imageData);
        return;
    }

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
    setImageForConfirmation(null);
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
    if (!moreDetails.trim()) {
        toast({
          title: "Incomplete Details",
          description: "Please fill out the Details field.",
          variant: "destructive",
          duration: 3000,
        });
        return;
    }
     if (!status) {
      toast({
        title: "Incomplete Details",
        description: "Please select a status (Serviceable/Unserviceable).",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    setIsSaving(true);

    try {
      // 1. Generate a new document reference with a unique ID
      const newDocRef = doc(collection(db, "inventory"));

      // 2. Upload photos to Firebase Storage first
      const uploadPromises = photos.map(async (photo, index) => {
        const storageRef = ref(storage, `inventory/${categoryName}/${newDocRef.id}/${Date.now()}_${index}.jpg`);
        const uploadResult = await uploadString(storageRef, photo.url, 'data_url');
        const downloadURL = await getDownloadURL(uploadResult.ref);
        return { url: downloadURL, part: photo.part || '' };
      });
      
      const uploadedPhotos = await Promise.all(uploadPromises);

      // 3. Now, create the document in Firestore with the photo URLs
      await setDoc(newDocRef, {
        id: newDocRef.id,
        category: categoryName,
        moreDetails: moreDetails || '',
        status: status || null,
        photos: uploadedPhotos,
        createdAt: serverTimestamp(),
        isUpdated: false,
      });
      
      toast({
        title: "Item Saved!",
        description: `Your item has been saved to ${categoryName}.`,
        duration: 3000,
      });

      router.push(`/inventory/${encodeURIComponent(categoryName)}`);
    } catch (error) {
      console.error("Failed to save item", error);
      toast({
          title: "Save Failed",
          description: "There was an error saving your item. Please try again.",
          variant: "destructive",
          duration: 3000,
      });
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
        <Link href={`/inventory/${encodeURIComponent(categoryName)}`} passHref>
          <Button className="bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground" disabled={isSaving}>
            <ArrowLeft className="sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </Link>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold">Add Item</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{category.name}</p>
        </div>
        <div className="w-24"></div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <Card>
            <CardContent className="p-4 space-y-4">
                <div>
                    <Label htmlFor="moreDetails" className="font-semibold">More Details</Label>
                    <Textarea
                        id="moreDetails"
                        value={moreDetails}
                        onChange={(e) => setMoreDetails(e.target.value)}
                        placeholder={`Enter all details for the item in ${category.name} here... (e.g., accountable officer, end-user, location, etc.)`}
                        className="mt-2"
                        rows={6}
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <Label className="font-semibold">Status</Label>
                    <RadioGroup
                        value={status ?? ""}
                        onValueChange={(value) => setStatus(value as ItemStatus)}
                        className="mt-2 flex gap-4"
                        disabled={isSaving}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Serviceable" id="serviceable" />
                            <Label htmlFor="serviceable">Serviceable</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Unserviceable" id="unserviceable" />
                            <Label htmlFor="unserviceable">Unserviceable</Label>
                        </div>
                    </RadioGroup>
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
