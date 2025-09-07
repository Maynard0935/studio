import { type LucideIcon, Mountain, Building, Printer, Sofa, Laptop, Construction, FlaskConical, Sailboat, Car, FileCode, Dumbbell, Router } from 'lucide-react';
import { type Timestamp } from 'firebase/firestore';

export const CATEGORIES = [
  { name: 'LAND', icon: Mountain },
  { name: 'BUILDING', icon: Building },
  { name: 'OFFICE EQUIPMENT', icon: Printer },
  { name: 'FURNITURE & FIXTURES', icon: Sofa },
  { name: 'IT EQUIPMENT', icon: Laptop },
  { name: 'CONSTRUCTION AND HEAVY EQUIPMENT', icon: Construction },
  { name: 'TECHNICAL AND SCIENTIFIC EQUIPMENT', icon: FlaskConical },
  { name: 'WATERCRAFT', icon: Sailboat },
  { name: 'MOTOR VEHICLES', icon: Car },
  { name: 'SOFTWARE', icon: FileCode },
  { name: 'SPORTS EQUIPMENT', icon: Dumbbell },
  { name: 'COMMUNICATION EQUIPMENT', icon: Router },
] as const;

export type CategoryName = typeof CATEGORIES[number]['name'];

export type ItemStatus = 'Serviceable' | 'Unserviceable';

export interface InventoryPhoto {
  url: string; 
  part?: string;
}

export interface InventoryItem {
  id: string;
  moreDetails: string;
  photos: InventoryPhoto[];
  status: ItemStatus | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isUpdated?: boolean;
  category: CategoryName;
}

export type InventoryData = {
  [key in CategoryName]?: InventoryItem[];
};
