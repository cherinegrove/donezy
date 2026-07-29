import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function ConfettiCelebration() {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    // Generate random confetti pieces
    const pieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 2 + Math.random() * 1,
      size: 4 + Math.random() * 8,
    }));
    setConfetti(pieces);

    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      setConfetti([]);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Celebration message */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="text-center animate-bounce">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            🎉 Nice work! 🎉
          </p>
        </div>
      </div>

      {/* Confetti pieces */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: [
              '#FF6B6B',
              '#4ECDC4',
              '#FFE66D',
              '#95E1D3',
              '#F38181',
              '#AA96DA',
              '#FCBAD3',
              '#A8D8EA',
            ][Math.floor(Math.random() * 8)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s forwards`,
            opacity: 0.8,
          }}
        />
      ))}

      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotateZ(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
