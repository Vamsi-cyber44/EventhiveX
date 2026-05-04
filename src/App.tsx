/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AuthScreen from '@/src/components/AuthScreen';
import VenueExplorer from '@/src/components/VenueExplorer';
import { 
  Sparkles, 
  Calendar, 
  DollarSign, 
  Users, 
  MapPin, 
  Loader2, 
  ArrowRight,
  Download,
  Share2,
  CheckCircle2,
  Bookmark,
  History,
  Trash2,
  Search,
  PieChart as PieChartIcon,
  Utensils,
  Palette,
  ClipboardList,
  Lightbulb,
  Store,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
  Timer,
  Target,
  Heart,
  Home,
  LayoutDashboard,
  User,
  LogOut,
  Bell,
  Settings,
  CircleDashed,
  Zap,
  ShieldCheck,
  Globe,
  Cpu,
  Star,
  Quote,
  Building,
  MessageCircle,
  Send,
  X,
  MessagesSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateEventPlan, chatAboutPlan, type EventInputs, type EventPlan } from '@/src/services/geminiService';
import { cn } from '@/src/lib/utils';
import { onAuthUpdate, logout, type User as FirebaseUser } from '@/src/lib/firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet icon fix for Vite/React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to update map view when center changes
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const FEATURES_LIST = [
  { icon: Cpu, title: "AI Event Planning", description: "Our neural engine orchestrates every detail, from vendor selection to guest flow." },
  { icon: DollarSign, title: "Budget Optimization", description: "Maximize your resources with our smart cost-reduction algorithms." },
  { icon: Timer, title: "Timeline Generator", description: "Stunningly accurate minute-by-minute schedules for flawles execution." },
  { icon: Users, title: "Vendor Suggestions", description: "Curated partner matches based on your specific theme and hospitality needs." },
  { icon: ClipboardList, title: "Smart Checklist", description: "Dynamic task tracking that adapts as your event requirements evolve." },
  { icon: Zap, title: "Real-time Sync", description: "Instant updates across all your planning modules for total visibility." }
];

const HOW_IT_WORKS = [
  { step: "01", title: "Enter Details", description: "Share your vision, guest count, and budget parameters with our AI." },
  { step: "02", title: "AI Orchestration", description: "EventHivex processes millions of variables to build your blueprint." },
  { step: "03", title: "Execute Flawlessly", description: "Receive a professional execution deck and start your countdown." }
];

const EVENT_TYPES = [
  { title: "Weddings", image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop", count: "1.2k+ Planned" },
  { title: "Corporate Galas", image: "https://images.unsplash.com/photo-1540575861501-7ce058a877c3?q=80&w=800&auto=format&fit=crop", count: "800+ Hosted" },
  { title: "Privacy Lux", image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop", count: "400+ Secured" },
  { title: "Global Summits", image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=800&auto=format&fit=crop", count: "200+ Organized" }
];

const TESTIMONIALS = [
  { name: "Siddharth Verma", role: "Venture Partner", text: "EventHivex didn't just plan my daughter's wedding; they engineered an experience that felt impossible in such a short window." },
  { name: "Ananya Iyer", role: "Creative Director", text: "The budget optimization alone saved us 22%. The AI's intuition for theme consistency is truly remarkable." }
];

const THEMES = [
  { id: 'minimalist', label: 'Simple & Clean', description: 'Plain colors and simple style.' },
  { id: 'luxury', label: 'Grand & Royal', description: 'Gold colors, big lights, and fancy feel.' },
  { id: 'traditional', label: 'Heritage Indian', description: 'Old style, bright colors, and local art.' },
  { id: 'modern', label: 'New & Trendy', description: 'Fresh ideas with new styles and lights.' },
];

interface SavedPlan {
  id: string;
  inputs: EventInputs;
  content: EventPlan;
  date: string;
  completedTasks?: string[];
  locationNotes?: Record<string, string>;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [inputs, setInputs] = useState<EventInputs>({
    eventType: '',
    purpose: '',
    date: '',
    duration: '',
    budget: '',
    guests: '',
    location: '',
    audience: '',
    theme: 'Simple & Clean'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isVendorsLoading, setIsVendorsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = useMemo(() => [
    { label: "Checking your needs", icon: Sparkles },
    { label: `Looking for venues in ${inputs.location || 'your area'}`, icon: MapPin },
    { label: `Finding ${inputs.theme} styles`, icon: Palette },
    { label: "Calculating total costs", icon: DollarSign },
    { label: "Creating the schedule", icon: Calendar },
    { label: "Finishing your plan", icon: CheckCircle2 }
  ], [inputs.location, inputs.theme]);
  const [isExporting, setIsExporting] = useState(false);
  const [plan, setPlan] = useState<EventPlan | null>(null);
  const [locationView, setLocationView] = useState<'grid' | 'map'>('grid');
  const [locationFilters, setLocationFilters] = useState({
    minCapacity: 0,
    minCost: 0,
    maxCost: 0,
    searchAmenity: ''
  });

  const [locationNotes, setLocationNotes] = useState<Record<string, string>>({});
  const allAvailableAmenities = useMemo(() => {
    if (!plan) return [];
    const amenities = new Set<string>();
    plan.recommended_locations.forEach(loc => {
      loc.amenities.forEach(a => amenities.add(a));
    });
    return Array.from(amenities).sort();
  }, [plan]);

  const filteredLocations = useMemo(() => {
    if (!plan) return [];
    return plan.recommended_locations.filter(loc => {
      // Extract numeric capacity
      const locCap = parseInt(loc.capacity.replace(/[^0-9]/g, '')) || 0;
      const minCapMatch = locationFilters.minCapacity === 0 || locCap >= locationFilters.minCapacity;
      
      // Cost comparison
      const locCost = parseInt(loc.estimated_cost.replace(/[^0-9]/g, '')) || 0;
      const minCostMatch = locationFilters.minCost === 0 || locCost >= locationFilters.minCost;
      const maxCostMatch = locationFilters.maxCost === 0 || locCost <= locationFilters.maxCost;

      const amenityMatch = locationFilters.searchAmenity === '' || 
        loc.amenities.some(a => a.toLowerCase().includes(locationFilters.searchAmenity.toLowerCase()));

      return minCapMatch && minCostMatch && maxCostMatch && amenityMatch;
    });
  }, [plan, locationFilters]);

  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  
  const filteredSavedPlans = useMemo(() => {
    if (!savedSearchQuery.trim()) return savedPlans;
    const query = savedSearchQuery.toLowerCase();
    return savedPlans.filter(plan => 
      plan.inputs.eventType.toLowerCase().includes(query) ||
      plan.inputs.purpose.toLowerCase().includes(query) ||
      plan.inputs.location.toLowerCase().includes(query)
    );
  }, [savedPlans, savedSearchQuery]);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const getHeroImage = (type: string, query?: string) => {
    return `https://loremflickr.com/800/600/${encodeURIComponent(query || type)},india,event?lock=${Math.abs(hashString(query || type)) % 1000}`;
  };

  function hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  const getEventImage = (query: string, type: string) => {
    // Simplify query for loremflickr (max 3-4 keywords)
    const cleanQuery = (query || type).split(/[\s,]+/).slice(0, 3).join(',');
    return `https://loremflickr.com/800/600/${encodeURIComponent(cleanQuery)},india,event?lock=${Math.abs(hashString(cleanQuery)) % 1000}`;
  };
  const [showSaved, setShowSaved] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'profile' | 'venues'>('home');

  const profileInfo = user ? {
    id: user.uid,
    name: user.displayName || 'Event Organizer',
    email: user.email || ''
  } : {
    name: 'New Planner',
    email: ''
  };

  const deleteSavedPlan = (id: string) => {
    const updated = savedPlans.filter(p => p.id !== id);
    setSavedPlans(updated);
    localStorage.setItem('eventpro_plans', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentView('home');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthUpdate((firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderNavbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-primary/80 backdrop-blur-xl border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-accent/20">
            <Cpu className="w-6 h-6" />
          </div>
          <span className="text-xl font-display font-bold text-brand-text tracking-tight italic">EventHivex<span className="text-brand-accent">.</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          {['Home', 'Features', 'How It Works', 'Contact'].map(item => (
            <button 
              key={item}
              onClick={() => {
                if (currentView !== 'home') {
                  setCurrentView('home');
                  setTimeout(() => {
                    const id = item.toLowerCase().replace(/\s/g, '-');
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                } else {
                  const id = item.toLowerCase().replace(/\s/g, '-');
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-xs font-bold uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors"
            >
              {item}
            </button>
          ))}
          {user && (
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors",
                currentView === 'dashboard' ? "text-brand-accent" : "text-brand-muted hover:text-brand-text"
              )}
            >
              Dashboard
            </button>
          )}
          <button 
            onClick={() => setCurrentView('venues')}
            className={cn(
              "text-xs font-bold uppercase tracking-widest transition-colors",
              currentView === 'venues' ? "text-brand-accent" : "text-brand-muted hover:text-brand-text"
            )}
          >
            Venues
          </button>
          {!user ? (
            <button 
              onClick={() => {
                setCurrentView('dashboard'); // Trigger auth screen
              }} 
              className="px-6 py-2.5 bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-lg hover:shadow-brand-accent/20 transition-all active:scale-95"
            >
              Login
            </button>
          ) : (
            <div className="flex items-center gap-3">
               <button 
                onClick={() => setCurrentView('profile')}
                className={cn(
                  "flex items-center gap-3 pl-4 pr-2 py-1.5 border rounded-full transition-all",
                  currentView === 'profile' ? "bg-brand-accent/10 border-brand-accent/30" : "bg-brand-surface border-brand-border hover:border-brand-accent/30"
                )}
              >
                <span className="text-xs font-bold text-brand-text">{user.displayName?.split(' ')[0] || 'Member'}</span>
                <div className="w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center text-white">
                  <User className="w-4 h-4" />
                </div>
              </button>
               <button 
                onClick={() => setShowSaved(!showSaved)}
                className="w-10 h-10 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-center text-brand-muted hover:text-brand-accent transition-all relative"
              >
                <Bookmark className="w-5 h-5 transition-transform group-hover:scale-110" />
                {savedPlans.length > 0 && (
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-accent rounded-full border-2 border-white" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );

  const renderFooter = () => (
    <footer className="py-20 bg-brand-surface border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Cpu className="w-6 h-6 text-brand-accent" />
              <span className="text-xl font-display font-bold text-brand-text tracking-tight">EventHivex<span className="text-brand-accent">.</span></span>
            </div>
            <p className="text-brand-muted text-sm max-w-sm font-medium leading-relaxed">
              The world's most advanced AI platform for premium event orchestration. We bridge the gap between creative vision and flawless technical execution.
            </p>
            <div className="flex gap-4">
              {[Globe, Share2, ShieldCheck].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-xl bg-brand-primary border border-brand-border flex items-center justify-center text-brand-muted hover:text-brand-accent hover:border-brand-accent/30 transition-all">
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-[10px] uppercase font-black text-brand-text tracking-[0.3em] mb-6">Navigation</h4>
            <ul className="space-y-4">
              {['Features', 'Marketplace', 'API Docs', 'Enterprise'].map(link => (
                <li key={link}><button className="text-sm font-bold text-brand-muted hover:text-brand-accent transition-colors">{link}</button></li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-[10px] uppercase font-black text-brand-text tracking-[0.3em] mb-6">Company</h4>
            <ul className="space-y-4">
              {['About Us', 'Careers', 'Privacy', 'Contact'].map(link => (
                <li key={link}><button className="text-sm font-bold text-brand-muted hover:text-brand-accent transition-colors">{link}</button></li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase font-black text-brand-muted tracking-widest">© 2026 EventHivex AI Orchestration. All Rights Reserved.</p>
          <div className="flex items-center gap-8">
            <button className="text-[10px] font-black uppercase text-brand-muted hover:text-brand-text tracking-widest">Privacy Policy</button>
            <button className="text-[10px] font-black uppercase text-brand-muted hover:text-brand-text tracking-widest">Terms of Service</button>
          </div>
        </div>
      </div>
    </footer>
  );
  const renderDashboard = () => (
    <div className="pt-32 pb-20 px-8 max-w-7xl mx-auto soft-bg min-h-screen">
      <div className="space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-[1px] bg-brand-accent/20" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-muted">Management Dashboard</span>
          </div>
          <h1 className="text-6xl font-display font-bold text-brand-text leading-[1.1] tracking-tight">
            My Event <br />
            <span className="text-brand-accent font-medium">Collection.</span>
          </h1>
          <div className="flex items-center gap-4 mt-8">
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-400 rounded-full uppercase tracking-wider">System Online</span>
            <span className="px-3 py-1 bg-brand-surface border border-brand-border text-[10px] font-bold text-brand-muted rounded-full uppercase tracking-wider">Secure Connection</span>
          </div>
          <p className="text-brand-muted text-lg max-w-xl font-normal mt-8 leading-relaxed">
            Manage all your {savedPlans.length} saved event plans and local venues in one place.
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full xl:w-auto">
          {[
            { label: "Saved Plans", value: savedPlans.length, icon: ClipboardList },
            { label: "Tasks Done", value: savedPlans.reduce((acc, p) => acc + (p.completedTasks?.length || 0), 0), icon: CheckCircle2 },
            { label: "Top Locations", value: new Set(savedPlans.map(p => p.inputs.location)).size, icon: MapPin },
            { label: "Ready to Go", value: "100%", icon: Target }
          ].map((stat, i) => (
            <div key={i} className="p-6 clean-card min-w-[180px] group transition-all">
              <stat.icon className="w-5 h-5 text-brand-accent/40 mb-4 group-hover:text-brand-accent transition-colors" />
              <p className="text-3xl font-display font-bold text-brand-text mb-1">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid xl:grid-cols-12 gap-8 mb-20">
        <div className="xl:col-span-8 p-8 clean-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-brand-accent/10 flex items-center justify-center text-brand-accent rounded-xl">
                <PieChartIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-brand-text">Style Summary</h3>
                <p className="text-xs text-brand-muted font-medium mt-1">Breakdown of your event types</p>
              </div>
            </div>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Traditional', value: 45 },
                    { name: 'Minimalist', value: 30 },
                    { name: 'Luxury', value: 15 },
                    { name: 'Modern', value: 10 },
                  ]}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {['#2563eb', '#94a3b8', '#cbd5e1', '#f1f5f9'].map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121214', border: '1px solid #27272a', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#fafafa', fontSize: '12px', fontWeight: 600 }}
                />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-brand-muted font-medium ml-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-4 p-8 clean-card flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <Timer className="w-12 h-12 text-brand-accent mb-6" />
            <h3 className="text-2xl font-display font-bold text-brand-text mb-2">Generation Speed</h3>
            <p className="text-brand-muted text-base mb-8 leading-relaxed">It takes about <span className="text-brand-accent font-bold">2.4 seconds</span> for our AI to create your full event plan.</p>
            <div className="p-4 bg-brand-surface border border-brand-border rounded-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider mb-1">Status</span>
                <span className="text-brand-text font-bold text-sm tracking-tight">Fast & Reliable</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-brand-accent font-display font-bold text-xl">-15% Faster</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {savedPlans.length === 0 ? (
        <div className="py-24 text-center clean-card relative overflow-hidden group">
          <div className="relative z-10">
            <div className="w-20 h-20 bg-brand-surface border border-brand-border flex items-center justify-center mx-auto mb-8 rounded-full">
              <History className="w-8 h-8 text-brand-muted" />
            </div>
            <h3 className="text-4xl font-display font-bold text-brand-text mb-4">No Plans Yet</h3>
            <p className="text-brand-muted mb-10 max-w-md mx-auto font-normal text-lg leading-relaxed">
              Start planning your first event to see it here in your collection.
            </p>
            <button 
              onClick={() => setCurrentView('home')}
              className="glow-btn font-black uppercase tracking-widest text-xs"
            >
              Start Your First Plan
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h3 className="text-2xl font-display font-bold text-brand-text">Recent Blueprints</h3>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input 
                type="text"
                placeholder="Search by event, purpose or location..."
                value={savedSearchQuery}
                onChange={(e) => setSavedSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-brand-surface border border-brand-border text-sm text-brand-text rounded-2xl focus:outline-none focus:border-brand-accent transition-all placeholder:text-brand-muted/50"
              />
            </div>
          </div>

          {filteredSavedPlans.length === 0 ? (
             <div className="py-24 text-center clean-card bg-brand-surface border-brand-border border-dashed">
                <p className="text-brand-muted font-medium">No plans match your search query.</p>
                <button 
                  onClick={() => setSavedSearchQuery('')}
                  className="mt-4 text-brand-accent text-xs font-black uppercase tracking-widest hover:underline"
                >
                  Clear Search
                </button>
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSavedPlans.map(item => (
                <motion.div 
                  key={item.id}
                  layoutId={item.id}
                  className="clean-card group flex flex-col h-full relative overflow-hidden transition-all duration-300"
                >
              <div className="h-56 relative overflow-hidden border-b border-brand-border">
                <img 
                  src={getEventImage(item.content.image_queries.venue, 'venue')}
                  alt="Venue"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4">
                   <span className="px-3 py-1 bg-brand-surface border border-brand-border text-[10px] font-bold text-brand-accent rounded-full uppercase tracking-wider">{item.inputs.eventType} Plan</span>
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h3 className="text-xl font-display font-bold text-brand-text truncate">{item.inputs.purpose || 'My Special Event'}</h3>
                    <p className="text-brand-muted text-xs font-medium flex items-center gap-2">
                       <MapPin className="w-3.5 h-3.5 text-brand-accent/60" /> {item.inputs.location}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteSavedPlan(item.id); }}
                    className="w-8 h-8 bg-brand-primary text-brand-muted hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all flex items-center justify-center border border-brand-border"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mb-8 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                    <span className="text-brand-muted">Tasks Completed</span>
                    <span className="text-brand-accent">{Math.round(((item.completedTasks?.length || 0) / item.content.checklist.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden border border-brand-border">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${((item.completedTasks?.length || 0) / item.content.checklist.length) * 100}%` }}
                      className="h-full bg-brand-accent rounded-full"
                    />
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-brand-border flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-brand-muted tracking-tight">Saved On</span>
                      <span className="text-xs text-brand-text font-semibold">{item.date}</span>
                   </div>
                   <button 
                    onClick={() => loadSavedPlan(item)}
                    className="flex items-center gap-2 text-brand-accent font-bold text-sm hover:underline"
                  >
                    View Plan <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);

  const renderProfile = () => (
    <div className="pt-32 pb-20 px-8 max-w-6xl mx-auto soft-bg min-h-screen">
      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-8">
          <div className="clean-card p-8 text-center relative overflow-hidden group">
            <div className="w-32 h-32 bg-brand-surface border-4 border-brand-border shadow-xl mx-auto mb-6 rounded-full overflow-hidden flex items-center justify-center">
              <div className="w-full h-full bg-brand-accent/5 flex items-center justify-center text-4xl font-display font-bold text-brand-accent">
                {profileInfo.email ? profileInfo.email.charAt(0).toUpperCase() : <User className="w-12 h-12 opacity-20" />}
              </div>
            </div>
            <h2 className="text-3xl font-display font-bold text-brand-text mb-1 uppercase tracking-tight">{profileInfo.name}</h2>
            <p className="text-brand-muted text-xs font-semibold uppercase tracking-widest mb-8">Event Organizer</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-brand-surface p-4 rounded-xl border border-brand-border">
                <p className="text-xl font-display font-bold text-brand-text">{savedPlans.length}</p>
                <p className="text-[10px] uppercase font-bold text-brand-muted">Plans</p>
              </div>
              <div className="bg-brand-surface p-4 rounded-xl border border-brand-border">
                <p className="text-xl font-display font-bold text-brand-accent">Active</p>
                <p className="text-[10px] uppercase font-bold text-brand-muted">Status</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className="text-brand-muted">Profile Completion</span>
                <span className="text-brand-accent">80%</span>
              </div>
              <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden border border-brand-border">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "80%" }}
                  className="h-full bg-brand-accent rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="p-6 clean-card">
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand-text mb-6 flex items-center gap-3">
              <Globe className="w-4 h-4 text-brand-accent" /> App Connect
            </h4>
            <div className="space-y-3">
              {[
                { label: "Google Calendar", active: true, icon: Calendar },
                { label: "Stripe Payments", active: false, icon: DollarSign },
                { label: "Cloud Drive", active: true, icon: ShieldCheck }
              ].map((acc, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-brand-primary rounded-xl border border-brand-border hover:border-brand-accent/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <acc.icon className="w-4 h-4 text-brand-muted group-hover:text-brand-accent transition-colors" />
                    <span className="text-xs text-brand-text font-semibold">{acc.label}</span>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight",
                    acc.active ? "bg-green-500/20 text-green-400" : "bg-slate-500/10 text-slate-500"
                  )}>
                    {acc.active ? 'Linked' : 'Off'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="p-8 clean-card relative overflow-hidden">
            <h3 className="text-2xl font-display font-bold text-brand-text mb-8">Account Settings</h3>
            
            <div className="space-y-4">
              {[
                { icon: Bell, title: "Notification Settings", desc: "Choose when and how you want to be notified.", active: true },
                { icon: Cpu, title: "AI Intelligence Level", desc: "Adjust how much detail our AI provides in plans.", active: false },
                { icon: Users, title: "Privacy Controls", desc: "Manage your data and who can see your plans.", active: false },
                { icon: Target, title: "Your Preferences", desc: "Set your default event styles and favorite colors.", active: true }
              ].map((setting, idx) => (
                          <div key={idx} className="flex items-center justify-between p-6 bg-brand-primary rounded-xl border border-brand-border hover:border-brand-accent/20 transition-all cursor-pointer group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-brand-surface rounded-lg border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-brand-accent transition-all">
                      <setting.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-brand-text group-hover:text-brand-accent transition-colors">{setting.title}</h4>
                      <p className="text-brand-muted text-xs font-medium">{setting.desc}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full p-1 transition-colors duration-300 relative",
                    setting.active ? "bg-brand-accent" : "bg-brand-border"
                  )}>
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm",
                      setting.active ? "translate-x-6" : "translate-x-0"
                    )} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center gap-6">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-8 py-4 bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
              >
                <LogOut className="w-4 h-4" /> Logout from Account
              </button>
              <div className="text-right">
                 <p className="text-[10px] text-brand-muted uppercase font-bold tracking-tight">App Version 2.4.0</p>
                 <p className="text-[10px] text-brand-text font-bold uppercase mt-1">Status: Fully Operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlanResult = () => {
    if (!plan) return null;
    return (
      <motion.div
        ref={resultRef}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-8 pb-40"
      >
        <div ref={contentRef} className="clean-card overflow-hidden shadow-2xl">
          <div className="p-12 relative">
             <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-12 mb-16 relative z-10">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-[2px] bg-brand-accent rounded-full" />
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-accent">Custom Event Blueprint</span>
                  </div>
                  <h2 className="text-6xl font-display font-bold text-brand-text tracking-tight">
                    Your event plan <br />
                    <span className="text-brand-accent">is ready.</span>
                  </h2>
               </div>
               <div className="flex gap-4">
                  <button 
                    onClick={saveToLibrary}
                    className="w-14 h-14 bg-brand-surface border border-brand-border flex items-center justify-center text-brand-accent hover:bg-brand-accent hover:text-white transition-all rounded-xl shadow-sm"
                    title="Save to My Library"
                  >
                    <Bookmark className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={downloadPDF}
                    disabled={isExporting}
                    className="w-14 h-14 bg-brand-surface border border-brand-border flex items-center justify-center text-brand-accent hover:bg-brand-accent hover:text-white transition-all rounded-xl shadow-sm disabled:opacity-50"
                    title="Download as PDF"
                  >
                    {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                  </button>
               </div>
             </div>

             <div className="relative h-[500px] mb-16 rounded-3xl overflow-hidden border border-brand-border shadow-inner">
                <img 
                  src={getEventImage(plan.image_queries.venue, 'event,venue')}
                  alt="Event Concept"
                  className="w-full h-full object-cover transition-all duration-1000"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes('nature')) {
                      img.src = `https://loremflickr.com/800/600/event,luxury?lock=${Math.floor(Math.random() * 1000)}`;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-text/80 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="px-5 py-2 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-lg border border-white/30">
                      {inputs.guests} Guests
                    </div>
                    <div className="px-5 py-2 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-lg border border-white/30">
                      Location: {inputs.location}
                    </div>
                  </div>
                  <h1 className="text-5xl font-display font-bold text-white tracking-tight leading-none mb-4">
                    {inputs.theme} <span className="text-brand-accent">Style</span>
                  </h1>
                </div>
             </div>

             <div className="grid xl:grid-cols-12 gap-16">
               <div className="xl:col-span-8 space-y-20">
                  {/* AI Design Logic */}
                  <div className="p-8 bg-brand-accent/5 rounded-[40px] border border-brand-accent/20 relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-accent/10 rounded-full blur-3xl group-hover:bg-brand-accent/20 transition-all" />
                    <div className="relative flex items-start gap-6">
                      <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-brand-accent/20">
                        <Quote className="w-6 h-6 text-white" />
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-xl font-display font-bold text-brand-text">Designer Insight</h4>
                        <p className="text-lg text-brand-muted leading-relaxed italic">
                          "{plan.tips[0] || "We've optimized this plan for maximum engagement and seamless flow, ensuring every detail aligns with your theme."}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Concept */}
                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-accent border border-brand-border">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-3xl font-display font-bold text-brand-text">Overview</h3>
                    </div>
                 <div className="flex-grow markdown-body text-brand-text">
                   <ReactMarkdown>{plan.overview}</ReactMarkdown>
                 </div>
                   </div>

                   {/* Food & Hospitality Section */}
                   <div className="space-y-12">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-accent border border-brand-border">
                         <Utensils className="w-6 h-6" />
                       </div>
                       <h3 className="text-3xl font-display font-bold text-brand-text">Food & Hospitality</h3>
                     </div>
                     
                     <div className="grid md:grid-cols-2 gap-8">
                       <div className="clean-card bg-brand-surface border-brand-border p-8 relative overflow-hidden group">
                          <div className="relative z-10">
                            <Utensils className="w-8 h-8 text-brand-accent/40 mb-6 group-hover:text-brand-accent transition-colors" />
                            <p className="text-[10px] uppercase font-black tracking-widest text-brand-muted mb-2">Recommended Caterer</p>
                            <h4 className="text-3xl font-display font-bold text-brand-text mb-4">{plan.food.catering_name}</h4>
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-[10px] font-bold rounded-full uppercase tracking-wider">{plan.food.service_type}</span>
                              <span className="px-3 py-1 bg-brand-primary text-brand-muted text-[10px] font-bold rounded-full uppercase tracking-wider">{plan.food.veg_nonveg_ratio}</span>
                            </div>
                          </div>
                          <div className="absolute top-0 right-0 p-8 text-brand-accent/5">
                            <Utensils className="w-32 h-32 rotate-12" />
                          </div>
                       </div>
                       <div className="aspect-video rounded-[32px] overflow-hidden border border-brand-border">
                         <img 
                           src={getEventImage(plan.image_queries.food, 'food,catering')}
                           className="w-full h-full object-cover"
                           alt="Food Design"
                           onError={(e) => {
                             const img = e.currentTarget;
                             img.src = `https://loremflickr.com/800/600/food,indian?lock=${Math.floor(Math.random() * 1000)}`;
                           }}
                         />
                       </div>
                     </div>

                     <div className="p-10 bg-brand-primary border border-brand-border rounded-[40px] space-y-6">
                        <div className="flex items-center gap-3">
                          <Palette className="w-5 h-5 text-brand-accent" />
                          <h4 className="text-xl font-display font-bold text-brand-text">Culinary Design Philosophy</h4>
                        </div>
                        <p className="text-brand-muted text-lg leading-relaxed italic border-l-4 border-brand-accent/30 pl-6">
                          {plan.food.food_design_ideas}
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                           {Object.entries(plan.food.menu).map(([category, items]) => (
                             <div key={category} className="space-y-3">
                               <p className="text-[10px] uppercase font-black tracking-[0.2em] text-brand-accent">{category.replace('_', ' ')}</p>
                               <ul className="space-y-2">
                                 {items.map((item, i) => (
                                   <li key={i} className="text-sm font-bold text-brand-text flex items-center gap-2">
                                     <div className="w-1 h-1 bg-brand-accent rounded-full" /> {item}
                                   </li>
                                 ))}
                               </ul>
                             </div>
                           ))}
                        </div>
                     </div>
                   </div>

                   {/* Design Inspirations */}
                   <div className="space-y-12">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-accent border border-brand-border">
                         <Palette className="w-6 h-6" />
                       </div>
                       <h3 className="text-3xl font-display font-bold text-brand-text">Design & Vibe</h3>
                     </div>

                     <div className="grid md:grid-cols-2 gap-8">
                       <div className="space-y-8">
                         <div className="p-8 bg-brand-surface border border-brand-border rounded-[32px] hover:border-brand-accent/30 transition-all group">
                            <h4 className="text-xl font-display font-bold text-brand-text mb-4">Venue Aesthetics</h4>
                            <p className="text-brand-muted text-sm leading-relaxed mb-6 italic">"{plan.decoration.venue_design_inspiration}"</p>
                            <img 
                              src={getEventImage(plan.image_queries.decor, 'decoration,interior')}
                              className="w-full h-48 object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-500"
                              alt="Decor Idea"
                              onError={(e) => {
                                const img = e.currentTarget;
                                img.src = `https://loremflickr.com/800/600/decoration,wedding?lock=${Math.floor(Math.random() * 1000)}`;
                              }}
                            />
                         </div>
                         <div className="p-8 bg-brand-surface border border-brand-border rounded-[32px] hover:border-brand-accent/30 transition-all group">
                            <h4 className="text-xl font-display font-bold text-brand-text mb-4">Hotel Room Decor</h4>
                            <p className="text-brand-muted text-sm leading-relaxed mb-6 italic">"{plan.decoration.hotel_room_decor}"</p>
                            <img 
                              src={getEventImage(plan.image_queries.hotel, 'hotel')}
                              className="w-full h-48 object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-500"
                              alt="Hotel Idea"
                            />
                         </div>
                       </div>

                       <div className="p-10 clean-card relative overflow-hidden flex flex-col justify-between">
                          <div className="relative z-10 space-y-10">
                            <div className="space-y-4">
                              <p className="text-[10px] uppercase font-black tracking-widest text-brand-accent">Style Profile</p>
                              <h4 className="text-4xl font-display font-bold text-brand-text leading-tight">{plan.decoration.theme_style}</h4>
                            </div>
                            
                            <div className="space-y-6">
                               <p className="text-xs font-bold text-brand-text uppercase tracking-widest mb-4">Color Palette</p>
                               <div className="flex flex-wrap gap-4">
                                  {plan.decoration.color_palette.map((color, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-brand-primary p-3 rounded-2xl border border-brand-border">
                                       <div className="w-8 h-8 rounded-lg shadow-inner bg-brand-accent/20" />
                                       <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">{color}</span>
                                    </div>
                                  ))}
                               </div>
                            </div>

                            <div className="space-y-6">
                              <p className="text-xs font-bold text-brand-text uppercase tracking-widest mb-4">Core Components</p>
                              <div className="grid grid-cols-2 gap-4">
                                {[
                                  { label: 'Lighting', value: plan.decoration.lighting_setup },
                                  { label: 'Stage', value: plan.decoration.stage_design },
                                  { label: 'Seating', value: plan.decoration.seating_arrangement },
                                  { label: 'Entry', value: plan.decoration.welcome_area }
                                ].map((item, i) => (
                                  <div key={i} className="space-y-1">
                                    <p className="text-[8px] font-black uppercase text-brand-accent tracking-tighter">{item.label}</p>
                                    <p className="text-[10px] font-bold text-brand-muted leading-tight">{item.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl" />
                       </div>
                     </div>
                   </div>

                  {/* Locations Detail */}
                  {plan.recommended_locations && plan.recommended_locations.length > 0 && (
                    <div className="space-y-10">
                       <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-brand-border">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-brand-surface rounded-xl flex items-center justify-center text-brand-accent border border-brand-border">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-brand-text">Recommended for {inputs.location}</h3>
                          </div>


                          
                          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                             {/* Grid/Map Toggle */}
                             <div className="flex bg-brand-primary p-1 rounded-xl border border-brand-border h-full">
                                <button 
                                  onClick={() => setLocationView('grid')}
                                  className={cn(
                                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    locationView === 'grid' ? "bg-brand-accent text-white shadow-lg" : "text-brand-muted hover:text-brand-text"
                                  )}
                                >
                                  <LayoutDashboard className="w-3 h-3" /> Grid
                                </button>
                                <button 
                                  onClick={() => setLocationView('map')}
                                  className={cn(
                                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    locationView === 'map' ? "bg-brand-accent text-white shadow-lg" : "text-brand-muted hover:text-brand-text"
                                  )}
                                >
                                  <Globe className="w-3 h-3" /> Map
                                </button>
                             </div>

                             <div className="flex items-center gap-3">
                                <div className="relative">
                                   <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                                   <input 
                                     type="number" 
                                     placeholder="Min Guests"
                                     value={locationFilters.minCapacity || ''}
                                     onChange={(e) => setLocationFilters(prev => ({ ...prev, minCapacity: parseInt(e.target.value) || 0 }))}
                                     className="pl-11 pr-4 py-3 bg-brand-surface border border-brand-border text-xs font-bold text-brand-text rounded-xl focus:outline-none focus:border-brand-accent w-36"
                                   />
                                </div>
                                <div className="relative">
                                   <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                                   <select 
                                     value={locationFilters.maxCost}
                                     onChange={(e) => setLocationFilters(prev => ({ ...prev, maxCost: parseInt(e.target.value) || 0 }))}
                                     className="pl-11 pr-4 py-3 bg-brand-surface border border-brand-border text-xs font-bold text-brand-text rounded-xl focus:outline-none focus:border-brand-accent w-40 appearance-none cursor-pointer"
                                   >
                                     <option value={0}>Max Budget</option>
                                     <option value={50000}>₹50,000</option>
                                     <option value={100000}>₹1,00,000</option>
                                     <option value={500000}>₹5,00,000</option>
                                     <option value={1000000}>₹10,00,000+</option>
                                   </select>
                                </div>
                             </div>
                          </div>
                       </div>

                       {locationView === 'grid' ? (
                          <div className="grid md:grid-cols-2 gap-6">
                           {filteredLocations.map((loc, idx) => (
                             <div key={idx} className="bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-accent/30 transition-all group overflow-hidden flex flex-col">
                                {/* Venue Hero Image */}
                                <div className="relative h-52 overflow-hidden shrink-0">
                                  <img
                                    src={`https://loremflickr.com/800/400/${encodeURIComponent(loc.name + ' ' + loc.venue_type + ' venue india')}?lock=${Math.abs(hashString(loc.name)) % 1000}`}
                                    alt={loc.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://source.unsplash.com/800x400/?${encodeURIComponent(loc.venue_type + ' venue event india')}` }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent" />
                                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                    <span className="px-2 py-1 bg-brand-primary/80 backdrop-blur-md text-brand-accent text-[8px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 border border-brand-border/50">
                                      <Building className="w-2.5 h-2.5" /> {loc.venue_type}
                                    </span>
                                  </div>
                                  <div className="absolute top-3 right-3 px-2 py-1 bg-brand-primary/80 backdrop-blur-md rounded-lg border border-brand-border/50 flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-[10px] font-black text-white">{loc.rating}</span>
                                  </div>
                                </div>

                                <div className="p-6 flex flex-col flex-grow">
                                  <div className="mb-4">
                                    <h5 className="font-display font-bold text-brand-text text-xl group-hover:text-brand-accent transition-colors mb-1">{loc.name}</h5>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">{loc.capacity} Guests</span>
                                      <div className="w-1 h-1 rounded-full bg-brand-border" />
                                      <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">{loc.atmosphere}</span>
                                    </div>
                                  </div>
                                
                                  <p className="text-brand-muted text-sm leading-relaxed mb-4 italic">"{loc.why}"</p>
                                
                                  {loc.ideal_for && (
                                    <div className="mb-4 p-3 bg-brand-primary border border-brand-border rounded-xl">
                                      <p className="text-[10px] font-bold text-brand-text flex items-center gap-2">
                                        <Heart className="w-3 h-3 text-red-400 fill-red-400" /> <span className="uppercase tracking-widest text-[8px] text-brand-muted">Best for:</span> {loc.ideal_for}
                                      </p>
                                    </div>
                                  )}
                                
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {loc.amenities.slice(0, 5).map((amenity, i) => (
                                      <span key={i} className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 bg-brand-primary border border-brand-border text-brand-muted rounded-lg group-hover:border-brand-accent/20 transition-colors">
                                        {amenity}
                                      </span>
                                    ))}
                                    {loc.amenities.length > 5 && (
                                      <span className="text-[9px] font-bold uppercase tracking-widest px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-lg">+{loc.amenities.length - 5} more</span>
                                    )}
                                  </div>

                                  <div className="mt-auto pt-4 border-t border-brand-border flex justify-between items-center gap-4">
                                    <div className="flex flex-col">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Estimated Cost</span>
                                      <span className="text-xl font-display font-bold text-brand-accent">{loc.estimated_cost}</span>
                                    </div>
                                    {loc.map_url && (
                                      <a 
                                        href={loc.map_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-5 py-3 bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-brand-accent/20 transition-all active:scale-95"
                                      >
                                        <MapPin className="w-3.5 h-3.5" /> View Map
                                      </a>
                                    )}
                                  </div>
                                </div>
                             </div>
                           ))}
                        </div>
                       ) : (
                        <div className="relative h-[600px] w-full rounded-[40px] overflow-hidden border border-brand-border z-0">
                          <MapContainer 
                            center={[filteredLocations[0]?.lat || 20.5937, filteredLocations[0]?.lng || 78.9629]} 
                            zoom={13} 
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={true}
                          >
                            <TileLayer
                              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            {filteredLocations[0] && (
                              <ChangeView 
                                center={[filteredLocations[0].lat, filteredLocations[0].lng]} 
                                zoom={13} 
                              />
                            )}
                            {filteredLocations.map((loc, idx) => (
                              <Marker key={idx} position={[loc.lat, loc.lng]}>
                                <Popup maxWidth={280} className="venue-popup">
                                  <div style={{ width: '260px', fontFamily: 'Inter, sans-serif', overflow: 'hidden', borderRadius: '12px' }}>
                                    {/* Venue Image */}
                                    <div style={{ height: '140px', overflow: 'hidden', margin: '-14px -20px 0 -20px', borderRadius: '12px 12px 0 0' }}>
                                      <img
                                        src={`https://loremflickr.com/520/280/${encodeURIComponent(loc.name + ' ' + loc.venue_type + ' venue india')}?lock=${Math.abs(hashString(loc.name)) % 1000}`}
                                        alt={loc.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://source.unsplash.com/520x280/?${encodeURIComponent(loc.venue_type + ' event india')}`; }}
                                      />
                                    </div>
                                    {/* Badge row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', marginBottom: '6px' }}>
                                      <span style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', background: '#3b82f615', color: '#3b82f6', padding: '3px 8px', borderRadius: '6px' }}>
                                        {loc.venue_type}
                                      </span>
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>{'★'.repeat(Math.floor(loc.rating))} <span style={{ color: '#888' }}>{loc.rating}</span></span>
                                    </div>
                                    {/* Name */}
                                    <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#111', lineHeight: 1.3 }}>{loc.name}</h4>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#666' }}>{loc.atmosphere} • {loc.capacity} guests</p>
                                    {/* Amenities */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                                      {loc.amenities.slice(0, 4).map((a, i) => (
                                        <span key={i} style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', background: '#f4f4f5', color: '#555', padding: '2px 7px', borderRadius: '4px' }}>{a}</span>
                                      ))}
                                    </div>
                                    {/* Cost + Link */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                                      <div>
                                        <p style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>Est. Cost</p>
                                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#3b82f6', margin: 0 }}>{loc.estimated_cost}</p>
                                      </div>
                                      {loc.map_url && (
                                        <a 
                                          href={loc.map_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          style={{ fontSize: '10px', fontWeight: 900, background: '#3b82f6', color: '#fff', padding: '7px 14px', borderRadius: '8px', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        >
                                          📍 Open Maps
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </Popup>
                              </Marker>
                            ))}
                          </MapContainer>
                        </div>
                       )}
                    </div>
                  )}

                  {/* Operational Checklist */}
                  <div className="space-y-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-accent border border-brand-border">
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <h3 className="text-3xl font-display font-bold text-brand-text">Your Checklist</h3>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {plan.checklist.map((item, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => toggleTask(item)}
                           className={cn(
                            "flex items-center gap-5 p-6 rounded-2xl border transition-all text-left group",
                            completedTasks.includes(item)
                              ? "bg-green-500/10 border-green-500/30 text-brand-muted"
                              : "bg-brand-primary border-brand-border hover:border-brand-accent/40 text-brand-text shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                            completedTasks.includes(item) ? "bg-green-500 text-white" : "bg-brand-surface border border-brand-border group-hover:border-brand-accent/20"
                          )}>
                            {completedTasks.includes(item) && <CheckCircle2 className="w-5 h-5" />}
                          </div>
                          <span className={cn("text-xs font-bold leading-relaxed", completedTasks.includes(item) && "line-through opacity-50")}>{item}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vendor Suggestions Section */}
                  <div className="space-y-10 pt-10 border-t border-brand-border/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-accent border border-brand-border">
                        <Store className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-3xl font-display font-bold text-brand-text">Local Partners</h3>
                        <p className="text-brand-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1">AI Curated Suggestions</p>
                      </div>
                    </div>
                    
                    {isVendorsLoading ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(n => (
                          <div key={n} className="p-8 bg-brand-surface rounded-3xl border border-brand-border animate-pulse">
                             <div className="w-20 h-4 bg-brand-accent/10 rounded mb-4" />
                             <div className="w-full h-8 bg-brand-muted/10 rounded mb-6" />
                             <div className="w-2/3 h-4 bg-brand-muted/5 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-6">
                        {plan.vendors?.map((vendor, vidx) => (
                          <div key={vidx} className="p-8 bg-brand-surface rounded-3xl border border-brand-border hover:border-brand-accent/30 transition-all group">
                             <div className="flex justify-between items-start mb-6">
                                <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-[9px] font-black uppercase tracking-widest rounded-lg">
                                  {vendor.type}
                                </span>
                                <span className="text-[10px] font-bold text-brand-muted tracking-tight">{vendor.price_range}</span>
                             </div>
                             <h4 className="text-xl font-display font-bold text-brand-text mb-4 group-hover:text-brand-accent transition-colors">{vendor.suggestion}</h4>
                             <p className="text-brand-muted text-sm leading-relaxed mb-6 italic border-l-2 border-brand-border pl-4">
                               "{vendor.tip}"
                             </p>
                             <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-accent hover:gap-4 transition-all">
                               Request Quotation <ChevronRight className="w-4 h-4" />
                             </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>

               <div className="xl:col-span-4 space-y-10">
                  <div className="p-8 bg-brand-surface rounded-3xl border border-brand-border sticky top-28 shadow-sm">
                     <h4 className="text-xs font-bold uppercase tracking-widest text-brand-text mb-8 flex items-center gap-3">
                       <PieChartIcon className="w-4 h-4 text-brand-accent" /> Budget Breakdown
                     </h4>
                     
                     <div className="h-56 mb-8 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={Object.entries(plan.budget_split_percent).map(([key, value]) => ({ 
                                name: key.toUpperCase(), 
                                value: parseInt(value) 
                              }))}
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={8}
                              dataKey="value"
                              stroke="none"
                            >
                              {Object.entries(plan.budget_split_percent).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#2563eb', '#60a5fa', '#3b82f6', '#93c5fd', '#1e40af'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                              itemStyle={{ color: '#1e293b', fontSize: '10px', fontWeight: 700 }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                     </div>

                     <div className="space-y-4">
                        {Object.entries(plan.budget).filter(([k]) => !['total_estimated', 'per_person_cost', 'hidden_costs'].includes(k)).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-muted">{key.replace('_', ' ')}</span>
                            <span className="text-[10px] font-bold text-brand-text">{value}</span>
                          </div>
                        ))}
                        
                        <div className="pt-6 border-t border-brand-border space-y-4">
                           <div className="p-5 bg-brand-primary rounded-2xl border border-brand-border flex flex-col gap-1 shadow-sm">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Cost Per Person</span>
                              <p className="text-2xl font-display font-bold text-brand-accent">{plan.budget.per_person_cost}</p>
                           </div>
                           <div className="flex justify-between items-center pt-2">
                              <span className="text-xs uppercase tracking-widest text-brand-text font-bold">Total Estimated</span>
                              <span className="text-3xl font-display font-bold text-brand-text">{plan.budget.total_estimated}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-8 bg-brand-surface rounded-3xl border border-brand-border shadow-sm">
                     <h4 className="text-xs font-bold uppercase tracking-widest text-brand-text mb-6 flex items-center gap-3">
                       <Lightbulb className="w-4 h-4 text-brand-accent" /> Expert Planning Tips
                     </h4>
                     <div className="space-y-4">
                        {plan.tips.map((tip, idx) => (
                          <div key={idx} className="flex gap-3 group">
                             <div className="w-1.5 h-auto bg-brand-accent/20 rounded-full group-hover:bg-brand-accent transition-colors shrink-0" />
                             <p className="text-brand-muted text-xs leading-relaxed font-medium italic">
                                "{tip}"
                             </p>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const LoadingExperience = () => (
    <div className="py-20 text-center relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-brand-surface rounded-3xl flex items-center justify-center shadow-xl mb-8 relative">
          <Loader2 className="w-10 h-10 text-brand-accent animate-spin" />
        </div>
        
        <h3 className="text-3xl font-display font-bold text-brand-text mb-2">Creating your plan...</h3>
        <p className="text-brand-muted text-sm font-medium mb-12">Checking venues and costs in {inputs.location}</p>
        
        <div className="w-full max-w-sm space-y-3">
          {loadingSteps.map((step, idx) => {
            const isActive = idx === loadingStep;
            const isCompleted = idx < loadingStep;
            
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: (isActive || isCompleted) ? 1 : 0.3, 
                  y: 0,
                }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                  isActive ? "bg-brand-surface border-brand-accent/20 shadow-sm" : 
                  isCompleted ? "bg-brand-surface border-brand-border" : "bg-transparent border-transparent"
                )}
              >
                 <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  isActive ? "bg-brand-accent text-white" : 
                  isCompleted ? "bg-green-500/20 text-green-400" : "bg-brand-primary text-brand-muted"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className={cn("w-4 h-4", isActive && "animate-pulse")} />}
                </div>
                <div className="flex-grow text-left">
                   <p className={cn(
                     "text-sm font-bold tracking-tight transition-all",
                     isActive ? "text-brand-text" : isCompleted ? "text-brand-muted" : "text-brand-muted/40"
                   )}>
                     {step.label}
                   </p>
                </div>
                {isActive && (
                  <div className="w-2 h-2 bg-brand-accent rounded-full animate-bounce" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );


  const renderHome = () => (
    <div className="soft-bg min-h-screen">
      {!plan ? (
        <div className="space-y-40 pb-20">
          {/* Hero Section */}
          <section id="home" className="relative pt-32 lg:pt-48 pb-20 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-brand-accent/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="max-w-7xl mx-auto px-8">
              <div className="grid lg:grid-cols-12 gap-16 items-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="lg:col-span-7"
                >
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-brand-surface border border-brand-border rounded-full mb-8">
                    <div className="w-2 h-2 bg-brand-accent rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted">Next-Gen AI Event Orchestration</span>
                  </div>
                  <h1 className="text-7xl md:text-9xl font-display font-bold text-brand-text mb-8 leading-[0.9] tracking-tight">
                    Plan Perfect <br />
                    <span className="text-brand-accent">Events With AI.</span>
                  </h1>
                  <p className="text-xl text-brand-muted max-w-xl font-medium leading-relaxed mb-12">
                    EventHivex utilizes state-of-the-art neural networks to orchestrate high-end weddings, corporate summits, and private galas with mathematical precision.
                  </p>
                  <div className="flex flex-wrap gap-5">
                    <button 
                      onClick={() => document.getElementById('planner-form')?.scrollIntoView({ behavior: 'smooth' })}
                      className="glow-btn px-12 py-5 flex items-center gap-3 text-sm"
                    >
                      Initialize Planning <ArrowRight className="w-5 h-5" />
                    </button>
                    <button className="px-10 py-5 bg-brand-surface border border-brand-border text-brand-text font-bold text-sm rounded-2xl hover:bg-brand-primary transition-all active:scale-95">
                      Explore Capabilities
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="hidden lg:block lg:col-span-5 relative"
                >
                  <div className="absolute -inset-1 bg-gradient-to-tr from-brand-accent/40 to-violet-500/40 rounded-3xl blur-2xl opacity-20" />
                  <div className="relative p-2 clean-card bg-brand-surface shadow-2xl rotate-1">
                    <img 
                      src="https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop" 
                      className="w-full h-[600px] object-cover rounded-2xl"
                      alt="Luxury Event"
                    />
                    <div className="absolute top-8 left-8 p-6 bg-brand-surface/80 backdrop-blur-md rounded-2xl border border-brand-border shadow-xl max-w-[200px]">
                       <p className="text-[9px] uppercase font-black text-brand-accent mb-2 tracking-widest">Optimized Venue</p>
                       <h4 className="text-brand-text font-display font-bold text-lg leading-tight">Azure Crystal Hall</h4>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" className="max-w-7xl mx-auto px-8 relative">
            <div className="text-center mb-24">
              <h2 className="text-5xl font-display font-bold text-brand-text mb-6">Advanced Planning Modules</h2>
              <p className="text-brand-muted max-w-2xl mx-auto font-medium">A unified suite of AI-driven tools designed to eliminate the friction points of modern event management.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
               {FEATURES_LIST.map((feature, i) => (
                 <motion.div 
                   key={i}
                   whileHover={{ y: -8 }}
                   className="p-10 clean-card bg-brand-surface border-transparent hover:border-brand-accent/20 transition-all group"
                 >
                    <div className="w-14 h-14 bg-brand-surface rounded-2xl flex items-center justify-center text-brand-accent mb-8 group-hover:scale-110 group-hover:bg-brand-accent group-hover:text-white transition-all duration-300">
                      <feature.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-brand-text mb-4">{feature.title}</h3>
                    <p className="text-brand-muted text-sm leading-relaxed font-medium">{feature.description}</p>
                 </motion.div>
               ))}
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="py-32 bg-brand-primary relative overflow-hidden">
             <div className="max-w-7xl mx-auto px-8">
               <div className="grid lg:grid-cols-2 gap-20 items-center">
                 <motion.div
                   initial={{ opacity: 0, y: 40 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true, margin: "-100px" }}
                   transition={{ duration: 0.8 }}
                 >
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent mb-6 block">Our Methodology</span>
                   <h2 className="text-6xl font-display font-bold text-brand-text mb-8">From Vision to <span className="italic font-light">Execution</span></h2>
                   <div className="space-y-12 mt-16">
                     {HOW_IT_WORKS.map((step, i) => (
                       <motion.div 
                         key={i} 
                         className="flex gap-8 group"
                         initial={{ opacity: 0, y: 20 }}
                         whileInView={{ opacity: 1, y: 0 }}
                         viewport={{ once: true }}
                         transition={{ duration: 0.5, delay: i * 0.1 + 0.3 }}
                       >
                         <div className="text-4xl font-display font-black text-brand-accent/20 group-hover:text-brand-accent transition-colors">{step.step}</div>
                         <div>
                           <h3 className="text-xl font-display font-bold text-brand-text mb-2">{step.title}</h3>
                           <p className="text-brand-muted font-medium">{step.description}</p>
                         </div>
                       </motion.div>
                     ))}
                   </div>
                 </motion.div>
                 <motion.div 
                   className="relative"
                   initial={{ opacity: 0, scale: 0.95, x: 20 }}
                   whileInView={{ opacity: 1, scale: 1, x: 0 }}
                   viewport={{ once: true, margin: "-100px" }}
                   transition={{ duration: 1, ease: "easeOut" }}
                 >
                   <div className="absolute inset-0 bg-brand-accent/10 rounded-full blur-[100px]" />
                   <img 
                    src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&auto=format&fit=crop" 
                    className="relative z-10 w-full h-[500px] object-cover rounded-[40px] shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" 
                    alt="Planning Office"
                   />
                 </motion.div>
               </div>
             </div>
          </section>

          {/* Planner Form */}
          <section id="planner-form" className="max-w-5xl mx-auto px-8 py-32 scroll-mt-24">
            <div className="clean-card bg-brand-surface p-2 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
              <div className="bg-brand-surface p-12 md:p-20 rounded-3xl text-center mb-10 overflow-hidden relative">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-accent/10 rounded-full blur-3xl" />
                <h2 className="text-6xl font-display font-bold text-brand-text mb-6">Initialize Plan <span className="text-brand-accent">v1.2</span></h2>
                <p className="text-brand-muted max-w-xl mx-auto font-medium">Input your core parameters and let EventHivex generate a technical blueprint for your next occasion.</p>
              </div>
              
              <div className="p-8 md:p-16">
                {error && (
                  <div className="mb-12 p-8 bg-red-500/5 border border-red-500/20 text-red-500 rounded-[32px] flex flex-col md:flex-row items-start gap-6 animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <AlertCircle className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    
                    <div className="w-14 h-14 bg-red-500/10 rounded-[20px] flex items-center justify-center shrink-0 border border-red-500/10">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    
                    <div className="flex-1 relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-md">
                          {error.includes(':') ? error.split(':')[0] : 'SYSTEM_EXCEPTION'}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-red-500/30" />
                        <span className="text-[10px] font-bold opacity-60 tracking-tight uppercase">Manual Review Required</span>
                      </div>
                      
                      <h4 className="text-lg font-display font-bold text-brand-text mb-2">
                        {error.includes('AI_') ? 'Optimization Challenge' : 'Connectivity Interruption'}
                      </h4>
                      
                      <p className="text-sm font-medium opacity-80 leading-relaxed max-w-2xl text-brand-muted">
                        {error.includes(':') ? error.split(':').slice(1).join(':').trim() : error}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-4">
                        <button 
                          onClick={() => handleSubmit({ preventDefault: () => {} } as any)}
                          className="px-5 py-2 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                        >
                          Retry Operation
                        </button>
                        <button 
                          onClick={() => setError(null)}
                          className="px-5 py-2 bg-brand-surface border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/10 transition-colors"
                        >
                          Modify Inputs
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <LoadingExperience />
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-12">
                      <div className="grid md:grid-cols-2 gap-10">
                        {[
                          { name: 'eventType', label: 'Event Classification', icon: Calendar, placeholder: 'Select type...', options: FORM_OPTIONS.eventType },
                          { name: 'purpose', label: 'Primary Objective', icon: Target, placeholder: 'What is the goal?', options: FORM_OPTIONS.purpose },
                          { name: 'date', label: 'Scheduled Timeline', icon: Clock, placeholder: 'e.g., Summer 2026' },
                          { name: 'location', label: 'Geographic Target', icon: MapPin, placeholder: 'Region or City' },
                          { name: 'guests', label: 'Guest Capacity', icon: Users, placeholder: 'Total attendees' },
                          { name: 'budget', label: 'Fiscal Parameters', icon: DollarSign, placeholder: 'Max spending' }
                        ].map((field) => (
                          <div key={field.name} className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-2">
                              <field.icon className="w-3.5 h-3.5" /> {field.label}
                            </label>
                             {field.options ? (
                              <select 
                                name={field.name}
                                value={(inputs as any)[field.name]}
                                onChange={handleInputChange}
                                className="clean-input w-full bg-brand-primary border border-brand-border text-brand-text placeholder:text-brand-muted/30 font-bold text-sm py-4 px-4 rounded-xl focus:outline-none focus:border-brand-accent transition-all appearance-none"
                                required
                              >
                                <option value="" disabled>{field.placeholder}</option>
                                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : (
                              <input 
                                type="text"
                                name={field.name}
                                placeholder={field.placeholder}
                                value={(inputs as any)[field.name]}
                                onChange={handleInputChange}
                                className="clean-input w-full bg-brand-primary border border-brand-border text-brand-text placeholder:text-brand-muted/30 font-bold text-sm py-4 px-4 rounded-xl focus:outline-none focus:border-brand-accent transition-all"
                                required
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-muted flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5" /> Aesthetic Preset
                        </label>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                           {THEMES.map(theme => (
                             <button
                               key={theme.id}
                               type="button"
                               onClick={() => setInputs(prev => ({ ...prev, theme: theme.label }))}
                               className={cn(
                                 "p-6 rounded-2xl border text-left transition-all",
                                 inputs.theme === theme.label 
                                   ? "bg-brand-accent/10 border-brand-accent ring-2 ring-brand-accent/20" 
                                   : "bg-brand-primary border-brand-border hover:bg-brand-surface"
                               )}
                             >
                               <p className={cn("text-xs font-black uppercase mb-2", inputs.theme === theme.label ? "text-brand-accent" : "text-brand-text")}>{theme.label}</p>
                               <p className="text-[10px] text-brand-muted leading-relaxed font-medium line-clamp-2">{theme.description}</p>
                             </button>
                           ))}
                        </div>
                      </div>

                      <div className="pt-10 border-t border-brand-border flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-4 text-brand-muted">
                           <ShieldCheck className="w-5 h-5 text-green-500" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">End-to-end encrypted planning data</span>
                        </div>
                        <button type="submit" className="glow-btn px-16 py-5 text-sm w-full md:w-auto justify-center">
                          Generate Protocol <Cpu className="w-5 h-5" />
                        </button>
                      </div>
                    </form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* Event Types Showcase */}
          <section className="max-w-7xl mx-auto px-8">
             <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                <div className="max-w-xl">
                  <h2 className="text-6xl font-display font-bold text-brand-text mb-6">Orchestrated <span className="text-brand-accent font-medium">Categories.</span></h2>
                  <p className="text-brand-muted font-medium">Our models are trained on diverse datasets spanning cultural festivals, high-stakes corporate galas, and intimate luxury gatherings.</p>
                </div>
                <button className="text-xs font-black uppercase tracking-widest text-brand-accent flex items-center gap-2 hover:gap-4 transition-all">
                  View Full Portfolio <ArrowRight className="w-4 h-4" />
                </button>
             </div>
             <div className="grid md:grid-cols-4 gap-6">
                {EVENT_TYPES.map((type, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-[32px] aspect-[4/5] cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-accent/20 transition-all duration-300">
                    <img src={type.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={type.title} />
                    <div className="absolute inset-0 bg-linear-to-t from-brand-primary/90 via-brand-primary/20 to-transparent" />
                    <div className="absolute bottom-8 left-8 right-8">
                      <p className="text-[10px] font-black uppercase text-brand-accent mb-2 tracking-widest">{type.count}</p>
                      <h3 className="text-2xl font-display font-bold text-white">{type.title}</h3>
                    </div>
                  </div>
                ))}
             </div>
          </section>

          {/* Venue Discovery Promo */}
          <section className="max-w-7xl mx-auto px-8 py-32">
            <div className="clean-card bg-brand-surface p-12 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center gap-16">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-accent/5 -skew-x-12 translate-x-1/4" />
              
              <div className="flex-1 space-y-8 relative z-10 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-4">
                  <div className="w-12 h-12 bg-brand-accent/10 rounded-2xl flex items-center justify-center text-brand-accent border border-brand-accent/20">
                    <Globe className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-muted">Real-Time Mapping Integration</span>
                </div>
                
                <h2 className="text-5xl lg:text-6xl font-display font-bold text-brand-text leading-[1.1] tracking-tight">
                  Explore Real Venues <br />
                  <span className="text-brand-accent">In Any City.</span>
                </h2>
                
                <p className="text-brand-muted text-lg font-medium leading-relaxed max-w-xl">
                  Our live mapping engine connects directly to OpenStreetMap to help you discover hotels, banquet halls, and convention centers across India — instantly.
                </p>
                
                <div className="pt-8 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <button 
                    onClick={() => {
                      setCurrentView('venues');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="glow-btn px-10 py-5 text-sm w-full sm:w-auto"
                  >
                    Open Venue Explorer <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted/60">
                    No API Key Required · Free for Life
                  </p>
                </div>
              </div>

              <div className="flex-1 w-full lg:w-auto relative">
                <div className="aspect-square relative group">
                  <div className="absolute inset-0 bg-brand-accent/20 rounded-[48px] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <div className="relative h-full w-full rounded-[48px] overflow-hidden border border-brand-border shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-700">
                    <img 
                      src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop" 
                      className="w-full h-full object-cover"
                      alt="Venue Map Preview"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/80 to-transparent" />
                    <div className="absolute bottom-8 left-8 right-8 p-6 bg-brand-surface/80 backdrop-blur-md rounded-3xl border border-white/10">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-brand-text">The Grand Palace</p>
                          <p className="text-[10px] font-bold text-brand-muted uppercase">Jaipur, India</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                        </div>
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Available</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section id="contact" className="max-w-7xl mx-auto px-8 py-20">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
               <div>
                  <h2 className="text-5xl font-display font-bold text-brand-text mb-8">What Planers <span className="italic">Say.</span></h2>
                  <div className="space-y-12">
                     {TESTIMONIALS.map((t, i) => (
                       <div key={i} className="p-8 bg-brand-surface rounded-[40px] border border-brand-border relative">
                          <div className="absolute -top-4 left-8 bg-brand-accent/10 p-3 rounded-xl border border-brand-accent/20">
                            <Quote className="w-6 h-6 text-brand-accent" />
                          </div>
                          <p className="text-lg text-brand-text font-medium leading-relaxed italic mb-8 pt-4">"{t.text}"</p>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full border border-brand-border" />
                            <div>
                              <p className="text-sm font-bold text-brand-text">{t.name}</p>
                              <p className="text-[10px] font-bold uppercase text-brand-muted tracking-widest">{t.role}</p>
                            </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
               <div className="p-12 clean-card bg-brand-accent flex flex-col justify-center text-center items-center h-full text-white">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-10">
                    <Zap className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-4xl lg:text-5xl font-display font-black mb-6">Ready to scale your next event?</h3>
                  <p className="text-white/80 font-medium mb-12 max-w-sm">Join the network of elite planners utilizing EventHivex to build the future of hospitality.</p>
                  <button 
                    onClick={() => document.getElementById('planner-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-12 py-5 bg-brand-accent text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:shadow-2xl hover:shadow-brand-accent/20 transition-all active:scale-95"
                  >
                    Start Free Trial
                  </button>
               </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="pt-20">
          <button 
            onClick={() => { setPlan(null); setCompletedTasks([]); setChatMessages([]); setIsChatOpen(false); }}
            className="fixed top-24 left-8 z-[40] flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors bg-brand-surface/50 backdrop-blur px-4 py-2 rounded-xl border border-brand-border shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Reset Planner
          </button>
          {renderPlanResult()}
        </div>
      )}
    </div>
  );
  
  const resultRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('eventpro_plans');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Basic validation to ensure we're loading compatible data
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].content && typeof parsed[0].content === 'object') {
          setSavedPlans(parsed);
        } else {
          console.warn("Incompatible saved plans found, clearing storage");
          localStorage.removeItem('eventpro_plans');
        }
      } catch (e) {
        console.error("Failed to load saved plans");
      }
    }
  }, []);

  const saveToLibrary = () => {
    if (!plan) return;
    const newPlan: SavedPlan = {
      id: crypto.randomUUID(),
      inputs: { ...inputs },
      content: plan,
      date: new Date().toLocaleDateString(),
      completedTasks: completedTasks,
      locationNotes: locationNotes
    };
    const updated = [newPlan, ...savedPlans];
    setSavedPlans(updated);
    localStorage.setItem('eventpro_plans', JSON.stringify(updated));
    alert('Plan saved to your local library!');
  };

  const loadSavedPlan = (saved: SavedPlan) => {
    setIsPlanLoading(true);
    setIsVendorsLoading(true);
    
    // Simulate a brief loading sequence for better UX as requested
    setTimeout(() => {
      setInputs(saved.inputs);
      setPlan(saved.content);
      setCompletedTasks(saved.completedTasks || []);
      setLocationNotes(saved.locationNotes || {});
      setChatMessages([]);
      setIsChatOpen(false);
      setShowSaved(false);
      setIsPlanLoading(false);
      
      // Keep vendor loading slightly longer to show granular fetch
      setTimeout(() => {
        setIsVendorsLoading(false);
      }, 1500);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingStep(0);
    setError(null);
    setPlan(null);
    setChatMessages([]);
    setIsChatOpen(false);

    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 3000);

    try {
      const generatedPlan = await generateEventPlan(inputs);
      setPlan(generatedPlan || null);
      setIsVendorsLoading(true);
      setTimeout(() => setIsVendorsLoading(false), 2000);
      setCompletedTasks([]);
      setLocationNotes({});
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const toggleTask = (task: string) => {
    setCompletedTasks(prev => 
      prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]
    );
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !plan || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await chatAboutPlan(plan, inputs, userMessage, chatMessages);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const setSuggestion = (name: keyof EventInputs, value: string) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  };

  const FORM_OPTIONS = {
    eventType: ['Wedding', 'Corporate Conference', 'Birthday Party', 'Music Festival', 'Networking Mixer', 'Product Launch', 'Workshop', 'Charity Gala'],
    purpose: ['Celebration', 'Networking', 'Professional Development', 'Brand Awareness', 'Fundraising', 'Community Building'],
    duration: ['2 Hours', '4 Hours', 'Full Day', 'Evening (5-11 PM)', 'Full Weekend'],
    audience: ['Young Professionals', 'Families with Kids', 'Tech Enthusiasts', 'Gen Z', 'High-Net-Worth Individuals', 'General Public'],
    themes: ['Modern Minimalist', 'Cyberpunk Tech', 'Rustic Garden', 'Vintage Gatsby', 'Boho Chic', 'Corporate Professional', 'Tropical Paradise']
  };

  const downloadPDF = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    try {
      const element = contentRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`EventPlan_${inputs.eventType.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Please try printing to PDF instead.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-brand-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
          <span className="text-[10px] font-black text-brand-muted uppercase tracking-[0.4em]">Initializing Evolution</span>
        </div>
      </div>
    );
  }

  // If viewing home or venues, we can render the main layout and navbar even for guests
  if (currentView === 'home' || currentView === 'venues' || user) {
    return (
      <div className="min-h-screen bg-brand-primary selection:bg-brand-accent selection:text-brand-primary">
        {renderNavbar()}

      {/* Saved Plans Slide-over */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-brand-surface z-[60] shadow-2xl border-l border-brand-border p-8 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <Bookmark className="w-6 h-6 text-brand-accent" />
                <h3 className="text-2xl font-display font-bold text-brand-text">My Saved Plans</h3>
              </div>
              <button 
                onClick={() => setShowSaved(false)}
                className="p-2 hover:bg-brand-surface rounded-xl transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-brand-muted" />
              </button>
            </div>

            {savedPlans.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bookmark className="w-8 h-8 text-brand-muted/30" />
                </div>
                <p className="text-brand-muted font-medium">No plans saved yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted" />
                  <input 
                    type="text"
                    placeholder="Search plans..."
                    value={savedSearchQuery}
                    onChange={(e) => setSavedSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-brand-primary border border-brand-border text-xs text-brand-text rounded-xl focus:outline-none focus:border-brand-accent transition-all"
                  />
                </div>

                {filteredSavedPlans.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-brand-border rounded-2xl">
                    <p className="text-[10px] uppercase font-black tracking-widest text-brand-muted">No matches found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSavedPlans.map(item => (
                      <div key={item.id} className="p-5 bg-brand-surface rounded-2xl border border-brand-border relative group hover:border-brand-accent/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-brand-text leading-tight">{item.inputs.eventType} Plan</h4>
                        <p className="text-[10px] text-brand-muted uppercase font-bold tracking-wider mt-1">{item.date}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedPlan(item.id);
                        }}
                        className="p-2 text-brand-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-brand-muted mb-4 line-clamp-2 leading-relaxed">"{item.content.overview.substring(0, 100)}..."</p>
                    <button 
                      onClick={() => loadSavedPlan(item)}
                      className="w-full py-3 bg-brand-primary border border-brand-border text-brand-accent rounded-xl text-xs font-bold hover:bg-brand-accent hover:text-white transition-all shadow-sm"
                    >
                      Open Plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    )}
  </AnimatePresence>

      {/* Main Content Area */}
      <main className="min-h-screen pt-20">
        <AnimatePresence>
          {isPlanLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-primary/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center"
            >
              <div className="w-24 h-24 bg-brand-surface rounded-[32px] flex items-center justify-center shadow-2xl mb-8 border border-brand-border animate-bounce">
                <Cpu className="w-12 h-12 text-brand-accent" />
              </div>
              <h2 className="text-3xl font-display font-bold text-brand-text mb-2 tracking-tight">Retrieving Blueprint...</h2>
              <p className="text-brand-muted text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Synchronizing Modules
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            {currentView === 'home' && renderHome()}
            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'profile' && renderProfile()}
            {currentView === 'venues' && <VenueExplorer />}
          </motion.div>
        </AnimatePresence>
        {renderFooter()}
        
        {/* AI Chatbot Widget */}
        {plan && (
          <div className="fixed bottom-8 right-8 z-[100]">
            <AnimatePresence>
              {isChatOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="absolute bottom-20 right-0 w-[400px] max-h-[600px] h-[80vh] bg-brand-surface border border-brand-border rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
                >
                  <div className="p-6 bg-brand-accent text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <MessagesSquare className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-lg leading-tight">Plan Assistant</h4>
                        <p className="text-[10px] uppercase font-black tracking-widest opacity-80">Online & Ready</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsChatOpen(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-10">
                        <div className="w-16 h-16 bg-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-4 border border-brand-border">
                          <Sparkles className="w-8 h-8 text-brand-accent" />
                        </div>
                        <p className="text-brand-text font-bold mb-2">How can I help with your plan?</p>
                        <p className="text-brand-muted text-xs leading-relaxed">Ask about budget adjustments, theme improvements, or specific location details.</p>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex",
                          msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-brand-accent text-white rounded-tr-none shadow-lg shadow-brand-accent/20" 
                            : "bg-brand-primary border border-brand-border text-brand-text rounded-tl-none markdown-body"
                        )}>
                          {msg.role === 'model' ? (
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          ) : (
                            msg.text
                          )}
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-brand-primary border border-brand-border p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                          <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                          <span className="text-xs font-bold text-brand-muted uppercase tracking-widest">Assistant is thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-brand-border bg-brand-surface">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                      className="relative"
                    >
                      <input 
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your question..."
                        className="w-full bg-brand-primary border border-brand-border text-brand-text placeholder:text-brand-muted/40 font-bold text-xs py-4 pl-4 pr-14 rounded-2xl focus:outline-none focus:border-brand-accent transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-accent text-white rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-brand-accent/20 transition-all disabled:opacity-50 active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all relative group",
                isChatOpen 
                  ? "bg-brand-text text-white rotate-90" 
                  : "bg-brand-accent text-white"
              )}
            >
              {isChatOpen ? (
                <X className="w-8 h-8" />
              ) : (
                <>
                  <MessageCircle className="w-8 h-8" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-text rounded-full border-2 border-brand-accent" />
                </>
              )}
              <div className="absolute right-full mr-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-brand-text text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl">
                Chat with Assistant
              </div>
            </motion.button>
          </div>
        )}
      </main>
    </div>
  );
  }

  return <AuthScreen onAuthSuccess={(u) => { setUser(u); }} />;
}
