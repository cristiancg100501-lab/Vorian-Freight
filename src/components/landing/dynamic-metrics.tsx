"use client";

import { motion, useInView } from "motion/react";
import { useRef, useEffect, useState } from "react";

function Counter({ from = 0, to, duration = 2, suffix = "" }: { from?: number, to: number, duration?: number, suffix?: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(nodeRef, { once: true, margin: "-100px" });
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (!isInView) return;
    
    let startTimestamp: number;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeProgress * (to - from) + from));
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setCount(to);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isInView, from, to, duration]);

  return <span ref={nodeRef}>{count}{suffix}</span>;
}

export function DynamicMetrics() {
  return (
    <section className="w-full py-16 md:py-24 bg-background border-b border-border">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-border">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center pt-8 md:pt-0"
          >
            <div className="text-5xl md:text-6xl font-black text-foreground mb-2 font-quicksand flex items-center justify-center gap-1">
              <Counter to={99} />.<Counter to={9} suffix="%" duration={1.5} />
            </div>
            <div className="text-sm uppercase tracking-widest font-bold text-muted-foreground">Entregas a Tiempo</div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center justify-center pt-8 md:pt-0"
          >
            <div className="text-5xl md:text-6xl font-black text-foreground mb-2 font-quicksand">
              +<Counter to={5000} />
            </div>
            <div className="text-sm uppercase tracking-widest font-bold text-muted-foreground">TEUs Transportados</div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center justify-center pt-8 md:pt-0"
          >
            <div className="text-5xl md:text-6xl font-black text-foreground mb-2 font-quicksand">
              24/7
            </div>
            <div className="text-sm uppercase tracking-widest font-bold text-muted-foreground">Monitoreo Activo</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
