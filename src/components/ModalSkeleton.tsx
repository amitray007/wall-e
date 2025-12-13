import { Loader2 } from 'lucide-react';

export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-white" />
        <p className="mt-2 text-white/70 text-sm">Loading...</p>
      </div>
    </div>
  );
}
