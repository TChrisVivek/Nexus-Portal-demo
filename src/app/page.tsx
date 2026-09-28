"use client";

import { useEffect, useState } from "react";
import { 
  FolderKanban, 
  AlertTriangle, BarChart3, TrendingUp,
  Clock, CheckCircle2, MoreVertical
} from "lucide-react";

import { MetricCard } from "@/components/MetricCard";
import type { Project } from "@/lib/types";

interface DashboardMetrics {
  totalSkus: number;
  totalStockValue: number;
  activeProjects: number;
  lowStockCount: number;
  warehouseQtyTotal: number;
  allocatedQtyTotal: number;
  completedProjects: number;
  totalProjects: number;
}

export default function Dashboard() {
   const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
   const [activeProjects, setActiveProjects] = useState<Project[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      async function load() {
         try {
            const [mRes, pRes] = await Promise.all([
               fetch("/api/dashboard/metrics"),
               fetch("/api/projects?status=ACTIVE")
            ]);
            if (mRes.ok) setMetrics(await mRes.json());
            if (pRes.ok) setActiveProjects(await pRes.json());
         } catch (err) {
            console.error("Dashboard load failed:", err);
         } finally {
            setLoading(false);
         }
      }
      load();
   }, []);

   return (
      <div className="space-y-10 pb-10">
         {/* Welcome Header */}
         <div className="animate-fade-in">

            <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">
             Real-time overview of inventory, projects, and field operations.
          </p>
         </div>

         {/* Metric Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up">
            <MetricCard 
               title="Stock Value" 
               value={loading ? "..." : `₹${(metrics?.totalStockValue || 0).toLocaleString('en-IN')}`} 
               icon={BarChart3}
               subtitle={`${metrics?.totalSkus || 0} items in inventory`}
               variant="cyan"
            />
            <MetricCard 
               title="Active Projects" 
               value={loading ? "..." : (metrics?.activeProjects || 0).toString()} 
               icon={FolderKanban}
               subtitle="Currently on site"
               variant="purple"
            />
            <MetricCard 
               title="Low Stock Items" 
               value={loading ? "..." : (metrics?.lowStockCount || 0).toString()} 
               icon={AlertTriangle}
               variant={metrics?.lowStockCount && metrics.lowStockCount > 0 ? "warning" : "success"}
               subtitle="Below threshold"
            />
            <MetricCard 
               title="Project Health" 
               value={
                 loading ? "..." :
                 metrics?.totalProjects === 0 ? "N/A" :
                 `${Math.round(((metrics?.activeProjects || 0) / (metrics?.totalProjects || 1)) * 100)}%`
               }
               icon={TrendingUp}
               subtitle={loading ? "" : `${metrics?.activeProjects || 0} of ${metrics?.totalProjects || 0} Active`}
               variant="success"
            />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Quick Stats */}
            <div className="lg:col-span-2 space-y-8 animate-fade-in-up delay-100">
               <div>
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                     <Clock size={16} className="text-cyan-glow" />
                     Inventory Usage
                  </h2>
                  </div>
                  
                  <div className="glass rounded-3xl p-8 border border-white/5 bg-white/[0.01]">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div>
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Stock In</p>
                           <p className="text-2xl font-black text-text-primary tabular-nums tracking-tighter">{metrics?.warehouseQtyTotal || 0}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Allocated</p>
                           <p className="text-2xl font-black text-cyan-glow tabular-nums tracking-tighter">{metrics?.allocatedQtyTotal || 0}</p>
                        </div>
                         <div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Efficiency</p>
                            <p className="text-2xl font-black text-text-primary tabular-nums tracking-tighter">
                              {loading ? "..."
                                : metrics?.warehouseQtyTotal === 0 ? "0%"
                                : `${Math.min(100, Math.round(((metrics?.allocatedQtyTotal || 0) / (metrics?.warehouseQtyTotal || 1)) * 100))}%`
                              }
                            </p>
                            <p className="text-[9px] font-bold text-text-muted mt-1 uppercase tracking-widest">
                              {loading ? "" : `${metrics?.allocatedQtyTotal || 0} / ${metrics?.warehouseQtyTotal || 0} units`}
                            </p>
                         </div>
                        <div>
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Integrity</p>
                           <div className="flex items-center gap-1.5 text-success">
                              <CheckCircle2 size={16} />
                              <span className="text-sm font-black tracking-widest">OK</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Design Note Section */}
                <div className="glass rounded-2xl p-6 border border-glass-border/50">
                   <div className="relative z-10">
                      <h3 className="text-sm font-bold text-text-primary">Quick Summary</h3>
                      <p className="text-text-secondary text-xs mt-2 leading-relaxed">
                         All systems operational. Use the sidebar to navigate to Inventory, Projects, Labour, and Reports.
                      </p>
                   </div>
                </div>
            </div>

            {/* Active Deployments */}
            <div className="space-y-6 animate-fade-in-up delay-200">
               <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-text-primary">Active Projects</h2>
                  <button className="p-2 glass glass-hover rounded-xl text-text-muted hover:text-text-primary transition-all">
                     <MoreVertical size={16} />
                  </button>
               </div>

               {loading ? (
                  <div className="space-y-4">
                     {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 glass rounded-2xl animate-pulse" />
                     ))}
                  </div>
               ) : activeProjects.length === 0 ? (
                  <div className="glass rounded-3xl p-10 border border-white/5 border-dashed flex flex-col items-center text-center">
                     <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-text-muted">
                        <FolderKanban size={20} />
                     </div>
                     <p className="text-xs font-black text-text-muted uppercase tracking-widest">No Active Deployments</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {activeProjects.map((p) => (
                        <div key={p.id} className="glass glass-hover rounded-2xl p-5 border border-white/5 group transition-all cursor-pointer">
                           <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-success" />
                                 <span className="text-[10px] font-black text-success uppercase tracking-widest">Active Site</span>
                              </div>
                              <span className="text-[9px] font-black text-text-muted group-hover:text-cyan-glow transition-colors">#{p.id.toString().padStart(3, '0')}</span>
                           </div>
                           <p className="text-sm font-black text-text-primary group-hover:translate-x-1 transition-transform">{p.name}</p>
                           {p.siteAddress && <p className="text-[10px] font-bold text-text-muted mt-1 opacity-60 uppercase truncate">{p.siteAddress}</p>}
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}
