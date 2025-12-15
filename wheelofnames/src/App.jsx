import React, { useState, useEffect, useRef } from 'react';
import { Trash2, RotateCw, Settings, X, Trophy, RefreshCcw, UserPlus } from 'lucide-react';

// --- Utility: Colors for the wheel ---
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#F1948A', '#85C1E9', '#D2B4DE'
];

// --- CHEAT CONFIGURATION ---
// Define specific ranks. Rank 1 = The Survivor (Last Man Standing).
// Rank N = The person eliminated when N people are left.
const RANKED_WINNERS = [
  { name: "Tate, Michelle", rank: 1 },              // Grand Winner
  { name: "Valerio, Richard Kian", rank: 2 },       // Top 2
  { name: "Barro, Kimverly", rank: 3 },             // Top 3
  { name: "Dela cruz, Kimberlie L.", rank: 4 },     // Top 4
  { name: "Tolentino, Vincent", rank: 9 }           // Top 9
];

// Specific rule: If this person exists, they go first regardless of rank math.
const FIRST_TO_GO = "Vinas Juan, Josephine";

// --- Utility: Simple Confetti Effect ---
const fireConfetti = () => {
  const count = 100;
  // ... (confetti logic)
  const createParticle = (x, y) => {
    const particle = document.createElement('div');
    const size = Math.random() * 8 + 4;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    particle.style.position = 'fixed';
    particle.style.left = `${x}vw`;
    particle.style.top = `${y}vh`;
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 5 + 2;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity - 4; 

    document.body.appendChild(particle);

    let opacity = 1;
    let posY = y;
    let posX = x;
    let velY = -5 - Math.random() * 5; 
    let velX = (Math.random() - 0.5) * 10;

    const animate = () => {
      velY += 0.2; 
      posY += velY; 
      posX += velX;
      opacity -= 0.01;
      
      particle.style.transform = `translate(${posX * 5}px, ${posY * 5}px)`;
      particle.style.opacity = opacity;

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };
    requestAnimationFrame(animate);
  };

  for(let i = 0; i < 50; i++) {
    createParticle(50, 50);
  }
};

export default function WheelOfNames() {
  // --- State ---
  // Start empty so you can add names manually to test the cheat logic
  const [names, setNames] = useState([]);
  const [newName, setNewName] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  
  // Settings (Hidden but active)
  const [cheatEnabled, setCheatEnabled] = useState(true);

  // Wheel Rendering Logic
  const canvasRef = useRef(null);
  const wheelSize = 500; 
  const center = wheelSize / 2;
  const radius = wheelSize / 2 - 20;

  useEffect(() => {
    drawWheel();
  }, [names, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, wheelSize, wheelSize);

    if (names.length === 0) return;

    const sliceAngle = (2 * Math.PI) / names.length;

    names.forEach((name, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = (i + 1) * sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(name, radius - 20, 10);
      ctx.restore();
    });
  };

  const handleSpin = () => {
    if (spinning || names.length === 0) return;
    
    // Instant win logic if only 1 person remains
    if (names.length === 1) {
      setWinner(names[0]);
      setShowWinnerModal(true);
      fireConfetti();
      return;
    }

    setSpinning(true);
    setWinner(null);
    setShowWinnerModal(false);

    // --- NEW CHEAT LOGIC ---
    let selectedIndex;
    const currentCount = names.length;

    if (cheatEnabled) {
      let candidateIndices = [];

      // 1. Check for "First to Go" (Vinas Juan, Josephine)
      const firstGoIndex = names.findIndex(n => n.trim().toLowerCase() === FIRST_TO_GO.toLowerCase());
      
      if (firstGoIndex !== -1) {
        // If she is here, she is the ONLY candidate.
        console.log("Cheat: Eliminating First-To-Go Target");
        candidateIndices = [firstGoIndex];
      } else {
        // 2. Rank Logic
        // Strategy:
        // A. Is there anyone whose Rank == CurrentCount? If so, they MUST go now to secure their rank.
        // B. If not, filter out anyone whose Rank < CurrentCount (they are saved for later).
        
        // Find Exact Rank Matches
        const exactMatches = names.map((n, i) => {
          const rankData = RANKED_WINNERS.find(r => r.name.toLowerCase() === n.toLowerCase());
          return (rankData && rankData.rank === currentCount) ? i : -1;
        }).filter(i => i !== -1);

        if (exactMatches.length > 0) {
           console.log("Cheat: Forced Elimination for Rank", currentCount);
           candidateIndices = exactMatches;
        } else {
           // No exact match, so just normal elimination.
           // Filter out protected people.
           // A person is protected if their Assigned Rank < Current Count.
           // e.g. Rank 1 (Michelle) is protected if Count (2) > 1.
           const validIndices = names.map((n, i) => {
              const rankData = RANKED_WINNERS.find(r => r.name.toLowerCase() === n.toLowerCase());
              // If no rank data, they are fair game.
              if (!rankData) return i;
              // If they have a rank, are they protected?
              // Protected if we haven't reached their rank yet.
              if (currentCount > rankData.rank) return -1; // Protected
              return i; // Not protected (or somehow missed their rank, so valid to die)
           }).filter(i => i !== -1);

           candidateIndices = validIndices;
           console.log("Cheat: Standard Pool", candidateIndices);
        }
      }
      
      // Fallback if logic somehow results in 0 candidates (shouldn't happen)
      if (candidateIndices.length === 0) {
        candidateIndices = names.map((_, i) => i);
      }

      const randomIdx = Math.floor(Math.random() * candidateIndices.length);
      selectedIndex = candidateIndices[randomIdx];

    } else {
      // Fair spin
      selectedIndex = Math.floor(Math.random() * names.length);
    }

    // --- ROTATION LOGIC ---
    const sliceDeg = 360 / names.length;
    const offsetToTop = -90; 
    const targetAngle = -(selectedIndex * sliceDeg + sliceDeg / 2) + offsetToTop;
    const jitter = (Math.random() - 0.5) * (sliceDeg * 0.8);
    const currentMod = rotation % 360;
    const targetRotationMod = (targetAngle + jitter) % 360; 
    let distance = targetRotationMod - currentMod;
    if (distance < 0) distance += 360; 
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 5)); 
    const totalNewRotation = rotation + distance + extraSpins;
    
    setRotation(totalNewRotation);

    setTimeout(() => {
      setSpinning(false);
      setWinner(names[selectedIndex]);
      setShowWinnerModal(true);
      fireConfetti();
    }, 5000); 
  };

  const removeWinner = () => {
    if (!winner) return;
    setNames(names.filter(n => n !== winner));
    setWinner(null);
    setShowWinnerModal(false);
  };

  const closeModal = () => {
    setShowWinnerModal(false);
  };

  const addName = (e) => {
    e.preventDefault();
    if (newName.trim()) {
      setNames([...names, newName.trim()]);
      setNewName('');
    }
  };

  const resetGame = () => {
    setNames([]);
    setWinner(null);
    setRotation(0);
    setShowWinnerModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-pink-500 selection:text-white overflow-hidden flex flex-col">
      
      {/* Header */}
      <header className="p-4 border-b border-slate-700 bg-slate-800 shadow-md flex justify-center items-center z-10 select-none">
        <div className="flex items-center gap-2">
          <RotateCw className="text-pink-500 animate-spin-slow" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
            Wheel of Names
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Panel: Controls */}
        <div className="w-full md:w-1/3 lg:w-1/4 p-6 bg-slate-800/50 border-r border-slate-700 flex flex-col gap-6 z-10 overflow-y-auto">
          
          {/* Side Panel Winner Display */}
          <div className={`p-6 rounded-2xl text-center transition-all duration-500 ${winner ? 'bg-gradient-to-br from-pink-600 to-purple-700 scale-105 shadow-xl ring-4 ring-pink-500/20' : 'bg-slate-800 border border-slate-700'}`}>
            <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-2">
              {names.length === 1 && winner ? 'Survivor' : 'Last Result'}
            </h2>
            <div className="text-3xl font-black text-white break-words">
              {spinning ? 'Spinning...' : (winner || 'Ready?')}
            </div>
            
            {winner && names.length > 1 && (
              <button 
                onClick={removeWinner}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-slate-900/50 hover:bg-slate-900 text-pink-300 rounded-lg text-sm font-bold transition-colors"
              >
                <Trash2 size={16} /> Remove {winner}
              </button>
            )}
          </div>

          {/* Name List Manager */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <label className="text-sm font-semibold text-slate-400">Participants ({names.length})</label>
              <button onClick={resetGame} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                <RefreshCcw size={12} /> Reset
              </button>
            </div>

            <form onSubmit={addName} className="flex gap-2">
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add a name..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
              />
              <button type="submit" className="bg-slate-700 hover:bg-slate-600 px-3 rounded-lg text-white transition-colors">
                <UserPlus size={18} />
              </button>
            </form>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[40vh] md:max-h-none scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
              {names.map((name, idx) => (
                <div key={idx} className="group flex justify-between items-center p-2 rounded bg-slate-800/80 border border-slate-700/50 hover:border-pink-500/50 transition-colors">
                  <span className="truncate">{name}</span>
                  <button 
                    onClick={() => setNames(names.filter((_, i) => i !== idx))}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {names.length === 0 && (
                <div className="text-center text-slate-600 py-8 italic">Add names to start</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: The Wheel */}
        <div className="flex-1 bg-slate-900 relative flex flex-col items-center justify-center p-8 overflow-hidden">
          
          {/* Wheel Container */}
          <div className="relative group mt-10">
            {/* Pointer (TOP POSITION) */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
              <div 
                className="w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-t-[50px] border-t-white drop-shadow-xl filter"
              ></div>
            </div>

            {/* Canvas Wheel */}
            <div 
              className="rounded-full shadow-2xl border-4 border-slate-700 relative overflow-hidden transition-transform cubic-bezier(0.2, 0.8, 0.2, 1)"
              style={{ 
                width: 'min(80vw, 500px)', 
                height: 'min(80vw, 500px)',
                transform: `rotate(${rotation}deg)`,
                transitionDuration: '5s'
              }}
            >
              <canvas 
                ref={canvasRef} 
                width={wheelSize} 
                height={wheelSize}
                className="w-full h-full"
              />
            </div>
            
            {/* Center Button (Spin Trigger) */}
            <button 
              onClick={handleSpin}
              disabled={spinning || names.length === 0}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-slate-200 z-30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 group"
            >
              <span className="font-black text-slate-800 text-lg uppercase tracking-widest group-hover:text-pink-600 transition-colors">
                {spinning ? '...' : 'Spin'}
              </span>
            </button>
          </div>

          <div className="mt-8 text-slate-500 text-sm font-medium">
             {names.length > 1 
               ? "Spin to select the next person to eliminate!" 
               : ""}
          </div>

        </div>
      </main>

      {/* Winner Popup Modal */}
      {showWinnerModal && winner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-1 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 transform border border-slate-700">
            <div className="bg-slate-900/90 rounded-[22px] p-8 text-center relative overflow-hidden">
              
              {/* Decorative Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-20 bg-pink-500/20 blur-3xl rounded-full pointer-events-none" />

              <button onClick={closeModal} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="mb-4 flex justify-center">
                {names.length === 1 ? (
                   <Trophy size={64} className="text-yellow-400 animate-bounce" />
                ) : (
                   <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500">
                     <UserPlus size={32} />
                   </div>
                )}
              </div>
              
              <h2 className={`text-xl font-bold mb-2 uppercase tracking-wide ${names.length === 1 ? 'text-yellow-400' : 'text-slate-400'}`}>
                {names.length === 1 ? 'The Grand Winner' : 'Selected'}
              </h2>
              
              <div className="text-4xl font-black text-white mb-8 break-words drop-shadow-md">
                {winner}
              </div>

              <div className="flex gap-3 justify-center">
                <button 
                  onClick={closeModal}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
                >
                  Close
                </button>
                {names.length > 1 && (
                  <button 
                    onClick={removeWinner}
                    className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-pink-900/20 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={18} /> Remove
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}