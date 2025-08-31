"use client";
import { ScanLine } from 'lucide-react';

export function Logo() {
  return (
    <div className="p-4 bg-accent rounded-full">
      <ScanLine className="h-16 w-16 text-accent-foreground" />
    </div>
  );
}
