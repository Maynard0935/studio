import { Camera } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Camera className="h-10 w-10" />
      <h1 className="text-4xl font-bold tracking-tight">SnapStock</h1>
    </div>
  );
}
