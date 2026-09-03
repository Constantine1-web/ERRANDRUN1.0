'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RunnerLogo } from '@/components/RunnerLogo';

interface CenteredPageLoaderProps {
  text?: string;
  subtext?: string;
}

export function CenteredPageLoader({
  text = 'ERRANDRUN',
  subtext = 'Connecting to campus grid…',
}: CenteredPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center p-4 bg-slate-50/90 dark:bg-[#0B0F17]/90 backdrop-blur-md transition-colors">
      <div className="relative flex flex-col items-center justify-center">
        {/* Animated Concentric Glowing Radar Rings */}
        <motion.div
          className="absolute w-44 h-44 rounded-full border border-blue-500/20 dark:border-blue-400/20 pointer-events-none"
          animate={{
            scale: [0.8, 1.4, 0.8],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute w-32 h-32 rounded-full border border-emerald-500/25 dark:border-emerald-400/25 pointer-events-none"
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.3,
          }}
        />

        {/* Bouncing Centered Runner Logo with Glow */}
        <motion.div
          className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <RunnerLogo
            animate={true}
            className="w-full h-full drop-shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
          />
        </motion.div>

        {/* Brand Name with Ambient Pulse */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mt-5 space-y-1.5"
        >
          <h2 className="text-xl sm:text-2xl font-black tracking-wider text-slate-900 dark:text-white uppercase">
            {text}
          </h2>

          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {subtext}
            </span>
            <span className="flex gap-1 items-center ml-1">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
              />
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
