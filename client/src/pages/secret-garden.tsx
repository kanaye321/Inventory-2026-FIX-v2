
import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/page-header";

interface Butterfly {
  id: number;
  x: number;
  y: number;
  isDragging: boolean;
  color: string;
  rotation: number;
}

export default function SecretGarden() {
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const gardenRef = useRef<HTMLDivElement>(null);

  const butterflyColors = [
    "from-pink-400 to-purple-500",
    "from-blue-400 to-cyan-500",
    "from-yellow-400 to-orange-500",
    "from-green-400 to-emerald-500",
    "from-red-400 to-pink-500",
    "from-indigo-400 to-purple-500",
  ];

  useEffect(() => {
    // Initialize butterflies
    const initialButterflies: Butterfly[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 80 + 10,
      y: Math.random() * 70 + 10,
      isDragging: false,
      color: butterflyColors[Math.floor(Math.random() * butterflyColors.length)],
      rotation: Math.random() * 360,
    }));
    setButterflies(initialButterflies);
  }, []);

  const handleMouseDown = (e: React.MouseEvent, id: number) => {
    const butterfly = butterflies.find((b) => b.id === id);
    if (!butterfly || !gardenRef.current) return;

    const rect = gardenRef.current.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + (butterfly.x * rect.width) / 100);
    const offsetY = e.clientY - (rect.top + (butterfly.y * rect.height) / 100);

    setDraggedId(id);
    setOffset({ x: offsetX, y: offsetY });
    setButterflies((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isDragging: true } : b))
    );
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedId === null || !gardenRef.current) return;

    const rect = gardenRef.current.getBoundingClientRect();
    const newX = ((e.clientX - rect.left - offset.x) / rect.width) * 100;
    const newY = ((e.clientY - rect.top - offset.y) / rect.height) * 100;

    setButterflies((prev) =>
      prev.map((b) =>
        b.id === draggedId
          ? {
              ...b,
              x: Math.max(0, Math.min(95, newX)),
              y: Math.max(0, Math.min(90, newY)),
            }
          : b
      )
    );
  };

  const handleMouseUp = () => {
    setDraggedId(null);
    setButterflies((prev) =>
      prev.map((b) => ({ ...b, isDragging: false }))
    );
  };

  const addButterfly = () => {
    const newButterfly: Butterfly = {
      id: butterflies.length,
      x: Math.random() * 80 + 10,
      y: Math.random() * 70 + 10,
      isDragging: false,
      color: butterflyColors[Math.floor(Math.random() * butterflyColors.length)],
      rotation: Math.random() * 360,
    };
    setButterflies([...butterflies, newButterfly]);
  };

  return (
    <div className="space-y-6 h-screen flex flex-col">
      <PageHeader 
        title="🦋 Secret Butterfly Garden 🦋" 
        description="Drag the butterflies around the garden!"
      >
        <button
          onClick={addButterfly}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
        >
          Add Butterfly
        </button>
      </PageHeader>

      <div
        ref={gardenRef}
        className="flex-1 relative rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(to bottom, #87CEEB 0%, #98D8C8 50%, #90EE90 100%)",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Flowers */}
        <div className="absolute bottom-10 left-10 text-6xl animate-pulse">🌸</div>
        <div className="absolute bottom-5 left-32 text-7xl animate-pulse delay-100">🌺</div>
        <div className="absolute bottom-12 right-20 text-6xl animate-pulse delay-200">🌻</div>
        <div className="absolute bottom-8 right-48 text-5xl animate-pulse delay-300">🌼</div>
        <div className="absolute bottom-14 left-1/2 text-6xl animate-pulse delay-150">🌷</div>
        <div className="absolute bottom-6 left-1/3 text-5xl animate-pulse delay-250">🌹</div>

        {/* Trees */}
        <div className="absolute top-10 left-5 text-8xl">🌳</div>
        <div className="absolute top-5 right-10 text-8xl">🌲</div>

        {/* Sun */}
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-7xl animate-spin-slow">☀️</div>

        {/* Butterflies */}
        {butterflies.map((butterfly) => (
          <div
            key={butterfly.id}
            className={`absolute cursor-move transition-all ${
              butterfly.isDragging ? "scale-110 z-50" : "z-10"
            }`}
            style={{
              left: `${butterfly.x}%`,
              top: `${butterfly.y}%`,
              transform: `rotate(${butterfly.rotation}deg)`,
            }}
            onMouseDown={(e) => handleMouseDown(e, butterfly.id)}
          >
            <div className="relative group">
              {/* Butterfly wings */}
              <div className="flex gap-1">
                <div
                  className={`w-8 h-12 rounded-full bg-gradient-to-br ${butterfly.color} opacity-80 group-hover:opacity-100 transition-opacity shadow-lg animate-flutter`}
                  style={{
                    animationDelay: `${butterfly.id * 0.1}s`,
                  }}
                />
                <div
                  className={`w-8 h-12 rounded-full bg-gradient-to-bl ${butterfly.color} opacity-80 group-hover:opacity-100 transition-opacity shadow-lg animate-flutter`}
                  style={{
                    animationDelay: `${butterfly.id * 0.1}s`,
                  }}
                />
              </div>
              {/* Butterfly body */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-10 bg-gray-800 rounded-full" />
            </div>
          </div>
        ))}

        {/* Grass at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-green-600 to-transparent" />
      </div>

      <style>{`
        @keyframes flutter {
          0%, 100% {
            transform: scaleX(1);
          }
          50% {
            transform: scaleX(0.8);
          }
        }
        
        .animate-flutter {
          animation: flutter 0.5s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .delay-100 {
          animation-delay: 0.1s;
        }
        
        .delay-150 {
          animation-delay: 0.15s;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
        }
        
        .delay-250 {
          animation-delay: 0.25s;
        }
        
        .delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
}
