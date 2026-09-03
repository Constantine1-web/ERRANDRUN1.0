'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface RunnerLogoProps {
  className?: string;
  animate?: boolean;
  loop?: boolean;
}

export function RunnerLogo({ className = 'w-16 h-16', animate = true, loop = false }: RunnerLogoProps) {
  // Motion variants for drawing the paths
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.2, ease: 'easeInOut' }
    }
  };

  const boxVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { delay: 0.6, type: 'spring', stiffness: 200 }
    }
  };

  const speedLineVariants = {
    hidden: { pathLength: 0, opacity: 0, x: -10 },
    visible: (custom: number) => ({
      pathLength: 1,
      opacity: [0.3, 1, 0.3],
      x: [-6, 6, -6],
      transition: {
        delay: 0.2 + custom * 0.15,
        duration: 1.4,
        ease: 'easeInOut',
        repeat: loop || animate ? Infinity : 0,
      }
    })
  };

  const runnerBobbing = {
    animate: {
      y: [0, -3, 0],
      transition: {
        duration: 0.8,
        repeat: loop || animate ? Infinity : 0,
        ease: 'easeInOut',
      }
    }
  };

  return (
    <motion.svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      initial={animate ? 'hidden' : 'visible'}
      animate="visible"
    >
      {/* --- SPEED LINES (Brand Sea Green / Emerald) --- */}
      <motion.path
        d="M 5 25 L 30 25"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
        custom={0}
        variants={speedLineVariants}
      />
      <motion.path
        d="M 15 40 L 35 40"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
        custom={1}
        variants={speedLineVariants}
      />
      <motion.path
        d="M 10 55 L 25 55"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
        custom={2}
        variants={speedLineVariants}
      />

      {/* --- RUNNER GROUP (With Bobbing Cadence) --- */}
      <motion.g variants={runnerBobbing} animate="animate">
        {/* Head (Leaning forward) */}
        <motion.circle
          cx="60"
          cy="20"
          r="8"
          stroke="#38BDF8"
          strokeWidth="8"
          variants={pathVariants}
        />

        {/* Torso (Leaning forward) */}
        <motion.path
          d="M 55 32 L 40 65"
          stroke="#38BDF8"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={pathVariants}
        />

        {/* Front Leg (High knee driving forward) */}
        <motion.path
          d="M 40 65 L 60 60 L 65 85"
          stroke="#38BDF8"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={pathVariants}
        />

        {/* Back Leg (Pushing off the ground) */}
        <motion.path
          d="M 40 65 L 25 75 L 10 90"
          stroke="#38BDF8"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={pathVariants}
        />

        {/* Arms (Holding box up) */}
        <motion.path
          d="M 50 40 L 60 55 L 75 55"
          stroke="#38BDF8"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={pathVariants}
        />

        {/* --- PACKAGE BOX (Brand Yellow / Amber) --- */}
        <motion.rect
          x="65"
          y="33"
          width="22"
          height="22"
          rx="4"
          stroke="#FBBF24"
          strokeWidth="6"
          variants={boxVariants}
        />
        {/* Box details / Tape */}
        <motion.path
          d="M 65 44 L 87 44"
          stroke="#FBBF24"
          strokeWidth="4"
          variants={boxVariants}
        />
      </motion.g>
    </motion.svg>
  );
}
