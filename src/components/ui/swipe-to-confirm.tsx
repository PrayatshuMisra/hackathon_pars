import { useState, useRef, useEffect } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { ChevronRight, Check } from "lucide-react";

interface SwipeToConfirmProps {
  onConfirm: () => void;
  text?: string;
  completedText?: string;
  themeColor?: string;
}

export function SwipeToConfirm({ 
  onConfirm, 
  text = "SWIPE TO CONFIRM", 
  completedText = "CONFIRMED", 
  themeColor = "#ef4444" 
}: SwipeToConfirmProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useAnimation();
  const x = useMotionValue(0);
  
  // Calculate drag boundaries
  const [dragConstraint, setDragConstraint] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      // Container width minus the knob width (approx 48px) and some padding
      setDragConstraint(containerRef.current.offsetWidth - 56);
    }
  }, []);

  // Map the drag position (x) to an opacity value for the background text
  const textOpacity = useTransform(x, [0, dragConstraint / 2], [1, 0]);
  const progressWidth = useTransform(x, [0, dragConstraint], [48, dragConstraint + 56]);

  const handleDragEnd = async (event: any, info: any) => {
    if (isConfirmed) return;
    
    // If dragged past 80% of the container, trigger confirm
    if (info.offset.x > dragConstraint * 0.8) {
      setIsConfirmed(true);
      await dragControls.start({ x: dragConstraint });
      onConfirm();
    } else {
      // Otherwise, snap back to start
      dragControls.start({ x: 0 });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex h-14 w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/80 shadow-inner"
    >
      {/* Background Fill (follows the thumb) */}
      <motion.div 
        className="absolute left-0 top-0 h-full opacity-20"
        style={{ 
          width: progressWidth,
          backgroundColor: themeColor
        }}
      />

      {/* Background Text */}
      <motion.span 
        className="pointer-events-none absolute z-10 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500"
        style={{ opacity: isConfirmed ? 0 : textOpacity }}
      >
        {text}
      </motion.span>

      {/* Confirmed Text */}
      {isConfirmed && (
        <motion.span 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pointer-events-none absolute z-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: themeColor }}
        >
          <Check size={16} />
          {completedText}
        </motion.span>
      )}

      {/* Draggable Knob */}
      {!isConfirmed && (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: dragConstraint }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          animate={dragControls}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute left-1 z-20 flex h-12 w-12 cursor-grab items-center justify-center rounded-md active:cursor-grabbing"
          style={{ x, backgroundColor: themeColor }}
        >
          <ChevronRight className="h-6 w-6 text-black" />
          <ChevronRight className="absolute ml-3 h-6 w-6 text-black opacity-50" />
        </motion.div>
      )}
    </div>
  );
}
