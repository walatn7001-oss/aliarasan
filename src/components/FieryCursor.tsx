import React, { useEffect, useRef } from "react";

export default function FieryCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Only run on desktop/pointing devices that are fine (prevent touchscreen lag)
    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
    }

    const particles: Particle[] = [];

    let mouseX = -100;
    let mouseY = -100;
    let isMoving = false;
    let idleTimer = 0;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMoving = true;
      idleTimer = 0;

      // Spawn fiery particles when cursor moves
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: mouseX,
          y: mouseY,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 2 - 0.5, // move upward
          life: 0,
          maxLife: 20 + Math.random() * 20,
          size: 3 + Math.random() * 5,
          color: getRandomFlameColor(),
        });
      }
    };

    const getRandomFlameColor = () => {
      // Check document classes
      const isCosmic = document.documentElement.classList.contains("theme-cosmic");
      const isEmerald = document.documentElement.classList.contains("theme-emerald");
      const isGold = document.documentElement.classList.contains("theme-gold");
      
      if (isCosmic) {
        const colors = [
          "rgba(168, 85, 247, 0.85)", // Purple
          "rgba(59, 130, 246, 0.9)", // Cosmic Blue
          "rgba(6, 182, 212, 0.95)", // Cyan
          "rgba(192, 132, 252, 0.8)"  // Light Purple
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      } else if (isEmerald) {
        const colors = [
          "rgba(16, 185, 129, 0.85)", // Matrix Green
          "rgba(20, 184, 166, 0.9)", // Teal
          "rgba(6, 182, 212, 0.95)", // Cyan
          "rgba(52, 211, 153, 0.8)"  // Light Emerald
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      } else if (isGold) {
        const colors = [
          "rgba(245, 158, 11, 0.85)", // Amber
          "rgba(234, 179, 8, 0.9)",  // Yellow Gold
          "rgba(251, 191, 36, 0.95)", // Gold Accent
          "rgba(249, 115, 22, 0.8)"   // Light Orange
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      } else {
        // Magma
        const colors = [
          "rgba(239, 68, 68, 0.8)",  // Red (rose-500)
          "rgba(254, 115, 22, 0.9)", // Intense Volcanic Orange
          "rgba(252, 211, 77, 0.95)", // Yellow (amber-200)
          "rgba(249, 115, 22, 0.85)"  // Deep Orange (orange-500)
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, width, height);

      // Spark some idle embers if mouse is stationary
      if (!isMoving && mouseX > 0 && mouseY > 0) {
        idleTimer++;
        if (idleTimer % 4 === 0) {
          particles.push({
            x: mouseX + (Math.random() - 0.5) * 6,
            y: mouseY + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 1,
            vy: -Math.random() * 1.2 - 0.3,
            life: 0,
            maxLife: 25 + Math.random() * 25,
            size: 2 + Math.random() * 3,
            color: getRandomFlameColor(),
          });
        }
      } else {
        isMoving = false;
      }

      // Draw shiny core at the cursor point
      if (mouseX > 0 && mouseY > 0) {
        ctx.save();
        ctx.shadowBlur = 12;
        
        const isCosmic = document.documentElement.classList.contains("theme-cosmic");
        const isEmerald = document.documentElement.classList.contains("theme-emerald");
        const isGold = document.documentElement.classList.contains("theme-gold");

        if (isCosmic) {
          ctx.shadowColor = "rgba(168, 85, 247, 0.9)";
        } else if (isEmerald) {
          ctx.shadowColor = "rgba(16, 185, 129, 0.9)";
        } else if (isGold) {
          ctx.shadowColor = "rgba(245, 158, 11, 0.9)";
        } else {
          ctx.shadowColor = "rgba(254, 115, 22, 0.95)";
        }
        
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 4.5, 0, Math.PI * 2);
        
        // Inner gradient
        const innerGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 4.5);
        innerGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
        if (isCosmic) {
          innerGrad.addColorStop(0.5, "rgba(168, 85, 247, 1)");
          innerGrad.addColorStop(1, "rgba(59, 130, 246, 0.8)");
        } else if (isEmerald) {
          innerGrad.addColorStop(0.5, "rgba(16, 185, 129, 1)");
          innerGrad.addColorStop(1, "rgba(6, 182, 212, 0.8)");
        } else if (isGold) {
          innerGrad.addColorStop(0.5, "rgba(251, 191, 36, 1)");
          innerGrad.addColorStop(1, "rgba(245, 158, 11, 0.8)");
        } else {
          innerGrad.addColorStop(0.5, "rgba(251, 146, 60, 1)");
          innerGrad.addColorStop(1, "rgba(239, 68, 68, 0.8)");
        }
        
        ctx.fillStyle = innerGrad;
        ctx.fill();
        ctx.restore();
      }

      // Process and render flame particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;

        // Physics update
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.04; // pull upward gently
        p.size *= 0.96; // size decay

        if (p.life >= p.maxLife || p.size <= 0.3) {
          particles.splice(i, 1);
          continue;
        }

        const opacity = 1 - p.life / p.maxLife;

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.shadowBlur = p.size * 2;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, "rgba(255, 255, 255, " + opacity + ")");
        grad.addColorStop(0.3, p.color);
        grad.addColorStop(1, "rgba(239, 68, 68, 0)");

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[999999] hidden md:block" 
      style={{ mixBlendMode: "screen" }}
    />
  );
}
