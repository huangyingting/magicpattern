'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewMagicOSCanvasRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/canvases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled MagicOS Canvas' }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.canvas) {
          router.replace(`/os/${d.canvas.id}`);
        } else {
          router.replace('/os/bVtYnuouBP1paP91KjgwML');
        }
      })
      .catch(() => router.replace('/os/bVtYnuouBP1paP91KjgwML'));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-xs text-slate-500">
      Initializing MagicOS Infinite Canvas...
    </div>
  );
}
