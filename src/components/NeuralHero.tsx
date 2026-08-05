'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { SITE_PATHS } from '@/lib/site-links';
import { ArrowRight, Terminal, Zap } from 'lucide-react';

export function NeuralHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const nodeCount = Math.min(35, Math.floor(width / 30));
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }> = [];

    const colors = ['#7C5CFF', '#C6F24E', '#3B82F6', '#9333EA'];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(124, 92, 255, ${0.25 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-neural border-b border-line py-20 lg:py-28">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="eyebrow shadow-lg shadow-lime/10">
              <Terminal className="w-3.5 h-3.5" />
              IA DÉCODÉE • ESPACE LATENT & INFERENCE
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink leading-[1.1]">
            Comprendre et maîtriser{' '}
            <span className="text-gradient block mt-1">
              l&apos;Intelligence Artificielle
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted leading-relaxed max-w-2xl">
            Analyses indépendantes des modèles LLM, comparatifs chiffrés (GPT-4, Claude 3.7, Gemini, Mistral), guides de prompt engineering et actualités de l&apos;écosystème IA francophone.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={SITE_PATHS.blog}
              className="px-6 py-3.5 rounded-xl bg-accent hover:bg-accent-hover text-ink font-bold text-sm shadow-xl shadow-accent/25 transition-all hover:scale-105 flex items-center gap-2"
            >
              Explorer nos guides et articles
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href={SITE_PATHS.category('comparatifs')}
              className="px-6 py-3.5 rounded-xl surface-panel hover:bg-elevated border border-lime/40 text-lime font-bold text-sm transition-all hover:scale-105 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-lime" />
              Comparatifs Modèles 2026
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-line/80 max-w-xl">
            <div>
              <span className="block font-mono font-bold text-lg sm:text-xl text-ink">100%</span>
              <span className="text-xs text-muted">Francophone & Indépendant</span>
            </div>
            <div>
              <span className="block font-mono font-bold text-lg sm:text-xl text-lime">LLM & RAG</span>
              <span className="text-xs text-muted">Tutoriels Pratiques</span>
            </div>
            <div>
              <span className="block font-mono font-bold text-lg sm:text-xl text-accent">Benchmarks</span>
              <span className="text-xs text-muted">Mises à jour quotidiennes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
