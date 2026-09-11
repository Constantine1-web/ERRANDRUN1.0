'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { calculatePricing, formatCurrency } from '@/utils/pricing';
import {
  Compass,
  Radio,
  ArrowRight,
  ShieldCheck,
  Utensils,
  Printer,
  Package,
  Users,
  Lock,
  Menu,
  X,
  MapPin,
  Banknote,
  Mail,
  MoreHorizontal,
  CheckCircle2,
  Zap,
  TrendingUp,
  Map,
  ChevronDown
} from 'lucide-react';
import { RunnerLogo } from '@/components/RunnerLogo';
import { supabase } from '@/lib/supabaseClient';
import { ThemeToggle } from '@/components/ThemeToggle';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Estimator State
  const [calcCategory, setCalcCategory] = useState<'academic' | 'food_delivery' | 'campus_errand' | 'other'>('food_delivery');
  const [calcDistance, setCalcDistance] = useState(1.0);
  const [calcQueue, setCalcQueue] = useState(false);
  const dynamicDemoPrice = calculatePricing(calcCategory as any, 'normal', calcDistance, calcQueue, false);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { id: 'food_delivery', label: 'Food & Drinks', icon: Utensils, desc: 'Pick up meals, snacks and drinks.' },
    { id: 'academic', label: 'Documents', icon: Printer, desc: 'Move papers, assignments and materials.' },
    { id: 'campus_errand', label: 'Queue Stand-in', icon: Users, desc: 'Bank & Clearance lines.' },
    { id: 'personal', label: 'Pickups', icon: Package, desc: 'Collect items from around campus.' },
    { id: 'shopping', label: 'Shopping', icon: Banknote, desc: 'Get something from a campus vendor.' },
    { id: 'other', label: 'Custom Errand', icon: MoreHorizontal, desc: 'Something else? Tell your Runner.' },
  ];

  const faqs = [
    { q: "What is ERRANDRUN?", a: "ERRANDRUN is a campus-centric delivery and logistics network connecting students who need things done with verified students already moving around campus." },
    { q: "Who can become a Runner?", a: "Any currently enrolled student with a valid Matriculation number and University ID can apply. All runners go through a verification process." },
    { q: "How much does an errand cost?", a: "Pricing is transparent and calculated upfront based on campus distance, task category, and queue times." },
    { q: "Are my payments safe?", a: "Absolutely. Funds are held in a secure Paystack escrow vault. The runner only gets paid after you provide them with your secret 4-digit Delivery PIN upon arrival." }
  ];

  return (
    <div className="min-h-screen font-sans selection:bg-blue-900 selection:text-blue-100 overflow-x-hidden bg-slate-50 dark:bg-[#0B0F19]">
      
      {/* ── 1. GLOBAL NAV ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${
        isScrolled ? 'bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-slate-200 dark:border-slate-800 shadow-xl' : 'bg-transparent border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 relative"><RunnerLogo className="w-8 h-8 text-blue-600 dark:text-blue-500 transition-transform group-hover:scale-110" animate={true} /></div>
            <span className="font-black text-slate-900 dark:text-white text-lg tracking-tight">ERRANDRUN</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link href="#how-it-works" className="hover:text-blue-600 dark:hover:text-white transition-colors">How It Works</Link>
              <Link href="#services" className="hover:text-blue-600 dark:hover:text-white transition-colors">Services</Link>
              <Link href="#faq" className="hover:text-blue-600 dark:hover:text-white transition-colors">FAQ</Link>
            </div>
            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-700 pl-6">
              <ThemeToggle variant="icon" />
              <Link href="/login" className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</Link>
              <Link href="/request-errand" className="bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-5 py-2 rounded-full text-xs font-bold transition-all shadow-lg">
                Request an Errand
              </Link>
            </div>
          </div>
          <div className="flex md:hidden items-center gap-3">
            <ThemeToggle variant="icon" />
            <button className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden absolute top-16 inset-x-0 bg-white dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-3">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 font-bold text-slate-600 dark:text-slate-300">Sign In</Link>
            <Link href="/request-errand" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 bg-blue-600 text-white font-bold rounded-xl">Request an Errand</Link>
            <Link href="/become-a-runner" onClick={() => setMobileMenuOpen(false)} className="text-center py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl">Become a Runner</Link>
          </motion.div>
        )}
      </header>

      {/* ── 2. HERO SECTION ── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 bg-slate-50 dark:bg-[#040810] text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Abstract Campus Map Background */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="absolute top-1/4 right-0 w-[800px] h-[600px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-emerald-400/20 dark:bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center relative z-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-black tracking-tight leading-[1.05] pb-2 text-slate-900 dark:text-white">
              Your campus errands,<br/>
              handled in minutes.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              ERRANDRUN is your dedicated campus logistics network. Whether you need <span className="text-blue-600 dark:text-blue-400">food picked up</span>, documents delivered from the faculty, items bought, or <span className="text-emerald-600 dark:text-emerald-400">someone to stand-in for clearance queues</span>, simply request a verified student Runner and get it done without leaving your room.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full justify-center lg:justify-start">
              <Link href="/request-errand" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-2 group">
                Request an Errand <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/become-a-runner" className="w-full sm:w-auto bg-transparent border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-white px-8 py-3.5 rounded-full font-bold text-sm transition-all flex items-center justify-center">
                Become a Runner
              </Link>
            </div>
          </div>

          <div className="w-full max-w-lg mx-auto lg:mr-0 z-10 mt-8 lg:mt-0 relative">
            <div className="relative rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl aspect-[4/3]">
              <img 
                src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1000" 
                alt="University Campus Building" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live on Campus</span>
                </div>
                <h3 className="text-xl font-bold">Connecting students daily.</h3>
                <p className="text-sm text-slate-300 mt-1">Hundreds of successful runs and counting.</p>
              </div>
            </div>
            
            {/* Decorative Floating Card */}
            <div className="absolute -bottom-6 -left-6 bg-white dark:bg-[#121824] p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Errand Completed</p>
                <p className="text-[10px] text-slate-500">Delivered to Hall 6 in 12 mins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Bar */}
        <div className="max-w-6xl mx-auto mt-24 border-t border-slate-200 dark:border-slate-800/50 pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center lg:text-left">
          {[
            { icon: ShieldCheck, t1: 'Verified Runners', t2: 'Students you can trust' },
            { icon: Zap, t1: 'Fast Dispatch', t2: 'Get matched quickly' },
            { icon: MapPin, t1: 'Campus-wide', t2: 'Hostels • Faculties • Cafeterias' },
            { icon: Lock, t1: 'Secure Requests', t2: 'Your money stays protected' }
          ].map((f, i) => (
            <div key={i} className="flex flex-col lg:flex-row items-center lg:items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{f.t1}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{f.t2}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-4 bg-white dark:bg-[#0B0F19] text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center lg:text-left">
            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Simple. Fast. Reliable.</span>
            <h2 className="text-3xl sm:text-4xl font-black mt-4">How It Works</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Getting things done on campus has never been easier. Just a few simple steps.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Desktop Connectors */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-[2px] bg-slate-100 dark:bg-slate-800 -z-10"></div>
            
            {[
              { num: '01', title: 'Request', desc: 'Tell us what you need and where it needs to go.', icon: MapPin },
              { num: '02', title: 'Get Matched', desc: 'A nearby verified Runner accepts your errand.', icon: Users },
              { num: '03', title: 'Get It Done', desc: 'Track the progress until your errand reaches you.', icon: CheckCircle2 }
            ].map((step, i) => (
              <div key={i} className="bg-slate-50 dark:bg-[#121824] rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30 font-bold text-lg relative">
                  <step.icon className="w-5 h-5" />
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full flex items-center justify-center text-[10px] font-black">{step.num}</div>
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. CATEGORIES GRID ── */}
      <section id="services" className="py-24 px-4 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-center sm:text-left">
            <div>
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Everything you need. One platform.</span>
              <h2 className="text-3xl sm:text-4xl font-black mt-2">Errands You Can Run</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">From food to documents, we've got you covered.</p>
            </div>
            <Link href="/signup" className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center sm:justify-start gap-1 hover:underline">
              View all services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <div key={i} className="bg-white dark:bg-[#121824] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow text-center sm:text-left flex flex-col items-center sm:items-start group">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">{cat.label}</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed hidden sm:block">{cat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. SPLIT AUDIENCE CARDS ── */}
      <section className="py-24 px-4 bg-white dark:bg-[#0B0F19]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Card */}
          <div className="bg-blue-50 dark:bg-[#0A192F] rounded-[2rem] p-10 sm:p-12 relative overflow-hidden text-slate-900 dark:text-white flex flex-col justify-center min-h-[400px]">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4"></div>
            <div className="relative z-10 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold mb-6">
                <Users className="w-3 h-3" /> For Students
              </div>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4">Too busy to run it?<br/><span className="text-blue-600 dark:text-blue-400">Let someone else run it.</span></h2>
              <ul className="space-y-3 mb-8">
                {['Create an errand', 'Set pickup/drop-off', 'Track your Runner', 'Receive your delivery'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> {item}</li>
                ))}
              </ul>
              <Link href="/request-errand" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 px-6 py-3 rounded-full text-sm font-bold transition-colors text-white">
                Request an Errand <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Runner Card */}
          <div className="bg-emerald-50 dark:bg-[#0D1F16] rounded-[2rem] p-10 sm:p-12 relative overflow-hidden text-slate-900 dark:text-white flex flex-col justify-center min-h-[400px]">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-400/20 dark:bg-emerald-600/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4"></div>
            <div className="relative z-10 max-w-sm">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold mb-6">
                <TrendingUp className="w-3 h-3" /> For Runners
              </div>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4">Got places to be?<br/><span className="text-emerald-600 dark:text-emerald-400">Make money getting there.</span></h2>
              <ul className="space-y-3 mb-8">
                {['Choose when you are available', 'Accept nearby errands', 'Complete tasks', 'Earn money on campus'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {item}</li>
                ))}
              </ul>
              <Link href="/become-a-runner" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 px-6 py-3 rounded-full text-sm font-bold transition-colors text-white">
                Become a Runner <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. INTERACTIVE ESTIMATOR ── */}
      <section className="py-24 px-4 bg-slate-100 dark:bg-[#0B0F19] text-slate-900 dark:text-white border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider mb-6">
              <Map className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Live Campus Network
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-4">
              The campus is always moving.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
              Check out real-time upfront pricing. Distance is calculated instantly, giving you absolute transparency before you ever request a runner.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white dark:bg-[#121824] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0"><Lock className="w-4 h-4 text-blue-600 dark:text-blue-400"/></div>
                <div><h4 className="font-bold text-sm">Escrow Protection</h4><p className="text-xs text-slate-500 dark:text-slate-400">4-Digit PIN release</p></div>
              </div>
              <div className="flex items-center gap-4 bg-white dark:bg-[#121824] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0"><Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/></div>
                <div><h4 className="font-bold text-sm">Instant Payouts</h4><p className="text-xs text-slate-500 dark:text-slate-400">Runners withdraw to bank</p></div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-[#121824]/90 backdrop-blur-xl rounded-[2rem] p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl relative">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Transparent Pricing</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                {[{ id: 'food_delivery', label: 'Cafeteria' }, { id: 'academic', label: 'Print/Handout' }, { id: 'campus_errand', label: 'Queue Wait' }, { id: 'other', label: 'Others' }].map(cat => (
                  <button key={cat.id} onClick={() => setCalcCategory(cat.id as any)} className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${calcCategory === cat.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{cat.label}</button>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-xs mb-3"><span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Campus Distance</span><span className="font-mono font-bold text-blue-600 dark:text-blue-400">{calcDistance.toFixed(1)} km</span></div>
                <input type="range" min="0.5" max="5" step="0.5" value={calcDistance} onChange={e => setCalcDistance(Number(e.target.value))} className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500" />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <input type="checkbox" checked={calcQueue} onChange={e => setCalcQueue(e.target.checked)} className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-blue-600" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Includes Waiting in Line (Queue)</span>
              </label>
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Fee Locked</p>
                <p className="text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight">{formatCurrency(dynamicDemoPrice.totalFee)}</p>
                <div className="flex justify-center gap-4 mt-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Runner: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(dynamicDemoPrice.runnerAmount)}</strong></span>
                  <span className="text-slate-500 dark:text-slate-400">Platform: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(dynamicDemoPrice.platformFee)}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ── */}
      <section id="faq" className="py-24 px-4 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl font-black mt-2">Got questions?</h2>
            <p className="text-slate-500 mt-2 text-sm">We've got you covered.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-[#121824] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-slate-900 dark:text-white">
                  {faq.q}
                  <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="p-5 pt-0 text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 mt-2">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. BIG CTA FOOTER ── */}
      <footer className="bg-white dark:bg-[#0B0F19] text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800">
        <div className="py-24 text-center px-4 relative overflow-hidden border-b border-slate-200 dark:border-slate-800/50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[200px] bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">Got an errand? <span className="text-blue-600 dark:text-blue-400">Let's run it.</span></h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto text-sm">Stop wasting time on the queue. Send it to a Runner.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/request-errand" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white px-8 py-3.5 rounded-full font-bold text-sm transition-colors shadow-lg flex items-center justify-center">Request an Errand</Link>
            <Link href="/become-a-runner" className="w-full sm:w-auto bg-slate-100 dark:bg-[#121824] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-900 dark:text-white px-8 py-3.5 rounded-full font-bold text-sm border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center">Become a Runner</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <RunnerLogo className="w-5 h-5 text-slate-400" animate={false} />
            <span className="font-black text-slate-400">ERRANDRUN</span>
          </div>
          <div className="flex gap-6">
            <Link href="#how-it-works" className="hover:text-slate-900 dark:hover:text-slate-300">How it works</Link>
            <Link href="/login" className="hover:text-slate-900 dark:hover:text-slate-300">Sign In</Link>
            <Link href="/dashboard/admin" className="hover:text-slate-900 dark:hover:text-slate-300">Admin</Link>
          </div>
          <div>© {new Date().getFullYear()} ERRANDRUN. Powered by UniUyo Students.</div>
        </div>
      </footer>

    </div>
  );
}
