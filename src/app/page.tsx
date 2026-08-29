'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, MapPin, TrendingUp } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Get your errands done in minutes, not hours. Our smart matching ensures quick pickups.',
    },
    {
      icon: Shield,
      title: 'Secure & Insured',
      description: 'Comprehensive insurance coverage protects both runners and requesters on every task.',
    },
    {
      icon: MapPin,
      title: 'Campus-Wide',
      description: 'From the registrar to the hostel, we cover every corner of your university.',
    },
    {
      icon: TrendingUp,
      title: 'Fair Pricing',
      description: 'Transparent, dynamic pricing based on distance, priority, and real-time demand.',
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-dark-base">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4 glass-card border-b border-white/10 mx-auto max-w-full">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-purple bg-clip-text text-transparent">
            ⚡ ErrandRun
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="text-white/60 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h1
            className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Your Campus Stress,
            <br />
            <span className="text-gradient">Outsourced</span>
          </motion.h1>

          <motion.p
            className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Premium peer-to-peer campus logistics. Stand in clearance queues, pick up food, submit documents, or run
            urgent errands. Trusted by students across Nigeria.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/signup?role=user"
              className="btn-primary group inline-flex items-center justify-center gap-2"
            >
              Need Something Done
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/signup?role=runner" className="btn-secondary inline-flex items-center justify-center gap-2">
              Become a Runner
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">Why Choose ErrandRun?</h2>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  className="glass-card rounded-2xl p-6 hover:bg-white/[0.05] transition-all duration-300"
                  variants={item}
                >
                  <Icon className="w-12 h-12 text-primary-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { num: '01', title: 'Post Your Errand', desc: 'Tell us what needs to be done and when' },
              { num: '02', title: 'We Find a Runner', desc: 'Our AI matches you with the best available runner' },
              { num: '03', title: 'Sit Back & Relax', desc: 'Track progress in real-time, get notified when done' },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
              >
                <div className="text-6xl font-bold text-white/10 mb-4">{step.num}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-white/60">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 text-center">
          {[
            { stat: '50K+', label: 'Happy Users' },
            { stat: '₦100M+', label: 'Paid Out to Runners' },
            { stat: '98%', label: 'Task Completion' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
            >
              <div className="text-5xl font-bold text-gradient mb-2">{item.stat}</div>
              <p className="text-white/60">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-xl text-white/60 mb-8">Join thousands of students already using ErrandRun</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?role=user" className="btn-primary">
              Request an Errand
            </Link>
            <Link href="/signup?role=runner" className="btn-secondary">
              Become a Runner
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 text-white/40 text-center text-sm">
        <p>&copy; 2024 ErrandRun. All rights reserved. Premium campus logistics for Nigerian universities.</p>
      </footer>
    </div>
  );
}
