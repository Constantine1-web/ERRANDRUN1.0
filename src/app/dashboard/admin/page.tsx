'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Admin Panel</h1>

      <motion.div
        className="glass-card rounded-3xl p-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Zap className="w-16 h-16 text-white/20 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-white mb-3">Admin features coming soon</h2>
        <p className="text-white/60 mb-8 max-w-sm mx-auto">
          Comprehensive admin panel for managing the platform
        </p>
      </motion.div>

      {/* TODO: Implement features
       * - Runner application vetting system
       * - Application grid with status badges
       * - Side drawer with verification details
       * - File preview component
       * - Approve/Reject buttons
       * - Admin notes field
       * - Batch operations
       * - User management
       * - Dispute resolution
       * - Platform statistics
       * - Revenue tracking
       */}
    </div>
  );
}
