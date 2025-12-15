"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Briefcase, 
  Sparkles, 
  Menu,
  MoreHorizontal,
  X,
  Send,
  PieChart,
  List,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type OnboardingInitialValues = {
  firstname: string;
  lastname: string;
  job_title: string;
  profile_pic_url: string;
  role_experience: string;
  technical_proficiency: "less" | "regular" | "more";
  tone_of_voice: "friendly" | "balanced" | "efficient" | string;
  ai_generation_guidance: string;
  workspace_name: string;
  workspace_url: string;
  workspace_profile_pic_url: string;
  business_description: string;
  database_connection: string;
  selected_plan: "lite" | "plus" | "pro";
};

interface WorkspacePreviewProps {
  step: number;
  data: OnboardingInitialValues;
  isVerified?: boolean;
}

export function WorkspacePreview({ step, data, isVerified }: WorkspacePreviewProps) {
  // Common transition for smooth layout changes
  const springTransition = { type: "spring", stiffness: 300, damping: 30 };

  return (
    <div className="relative w-full aspect-[16/11] bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 font-sans text-zinc-100 select-none hidden lg:block">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 via-zinc-950 to-zinc-950" />
      
      {/* Main Content Container */}
      <div className="absolute inset-0 flex flex-col">
        {/* Browser Chrome */}
        <motion.div 
          className="bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex items-center px-4 h-10 gap-3 shrink-0 z-30"
          animate={{ opacity: step >= 2 ? 1 : 0.5 }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 box-content border border-red-500/30" />
            <div className="w-3 h-3 rounded-full bg-amber-500/20 box-content border border-amber-500/30" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 box-content border border-green-500/30" />
          </div>
          
          <div className="flex-1 flex justify-center">
             <motion.div 
              className="bg-zinc-950 h-6 rounded flex items-center justify-center px-3 text-[10px] text-zinc-500 border border-zinc-800 w-full max-w-[240px]"
              animate={{ opacity: step >= 2 ? 1 : 0 }}
             >
                splx.com/{data.workspace_url || "workspace"}
             </motion.div>
          </div>
        </motion.div>

        {/* App Body */}
        <div className="flex-1 relative overflow-hidden flex">
          
          {/* STEP 1: Profile Card (The "Before" state of the avatar) */}
          <AnimatePresence>
            {step === 1 && (
              <motion.div 
                className="absolute inset-0 flex items-center justify-center z-40 bg-zinc-950/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, pointerEvents: "none" }}
              >
                  <motion.div 
                    layoutId="profile-card"
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-96 flex flex-col items-center gap-6 relative shadow-2xl"
                  >
                    <motion.div layoutId="avatar-container" className="relative">
                      <Avatar className="w-24 h-24 border-4 border-zinc-950 shadow-xl">
                        <AvatarImage src={data.profile_pic_url} />
                        <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-2xl">
                          {(data.firstname?.[0] || "") + (data.lastname?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>

                    <motion.div className="text-center space-y-2" layoutId="profile-text">
                       <div>
                        <h3 className="text-xl font-medium text-white">
                          {data.firstname || "New"} {data.lastname || "User"}
                        </h3>
                        {data.job_title && (
                          <p className="text-sm text-indigo-400 font-medium">
                            {data.job_title}
                          </p>
                        )}
                       </div>
                       
                       {data.role_experience && (
                          <p className="text-xs text-zinc-500 px-4 leading-relaxed line-clamp-2">
                             {data.role_experience}
                          </p>
                       )}
                    </motion.div>
                  </motion.div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* APP LAYOUT (Step 2+) */}
          <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
             {/* Top Navigation */}
             <motion.div 
               className="h-14 border-b border-zinc-800 flex items-center px-4 justify-between shrink-0"
               initial={{ y: -20, opacity: 0 }}
               animate={{ y: step >= 2 ? 0 : -20, opacity: step >= 2 ? 1 : 0 }}
               transition={{ delay: 0.1 }}
             >
                <div className="flex items-center gap-4">
                  {/* Avatar transitions to here */}
                   <div className="relative">
                     {step >= 2 && (
                       <motion.div layoutId="avatar-container" className="relative z-50">
                          <Avatar className="w-8 h-8 border border-zinc-800">
                            <AvatarImage src={data.profile_pic_url} />
                            <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs">
                              {(data.firstname?.[0] || "") + (data.lastname?.[0] || "")}
                            </AvatarFallback>
                          </Avatar>
                       </motion.div>
                     )}
                   </div>
                   
                   <div className="h-6 w-[1px] bg-zinc-800 mx-2" />

                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
                         <Menu className="w-3 h-3 text-zinc-500" />
                      </div>
                      <span className="text-sm font-medium text-zinc-300">
                        {data.workspace_name || "Workspace Settings"}
                      </span>
                   </div>
                </div>

                <div className="flex gap-2">
                   <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800" />
                   <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800" />
                </div>
             </motion.div>


             {/* Main Content Area */}
             <div className="flex-1 p-8 overflow-hidden relative">
                
                {/* Background Grid Pattern (Subtle) */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%__50%,#000_70%,transparent_100%)] pointer-events-none" />

                {/* Content: Workspace Settings Skelton (Step 2 & 3) / Dashboard (Step 4+) */}
                <div className="relative z-10 max-w-5xl mx-auto h-full">
                   
                   {/* Step 2-3: Settings Skeleton (2 Columns) */}
                   <AnimatePresence mode="popLayout">
                     {step < 4 && step >= 2 && (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                         className="flex gap-8 h-full"
                       >
                          {/* Col 1: Settings Nav Skeleton */}
                          <div className="w-48 space-y-3 shrink-0 hidden md:block">
                              <div className="h-4 w-24 bg-zinc-800 rounded mb-6" />
                              {[1, 2, 3, 4].map(i => (
                                 <div key={i} className={cn("h-8 w-full rounded", i === 1 ? "bg-zinc-800" : "bg-transparent border border-zinc-800/50")} />
                              ))}
                          </div>

                          {/* Col 2: Settings Form Skeleton */}
                          <div className="flex-1 space-y-8">
                             <div>
                                <div className="h-6 w-48 bg-zinc-800 rounded mb-2" />
                                <div className="h-4 w-64 bg-zinc-900 rounded" />
                             </div>

                             <div className="space-y-6">
                                <div className="space-y-2">
                                   <div className="h-4 w-24 bg-zinc-900 rounded" />
                                   <div className="h-10 w-full bg-zinc-900 rounded border border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                   <div className="h-4 w-32 bg-zinc-900 rounded" />
                                   <div className="h-10 w-full bg-zinc-900 rounded border border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                   <div className="h-4 w-20 bg-zinc-900 rounded" />
                                   <div className="h-24 w-full bg-zinc-900 rounded border border-zinc-800" />
                                </div>
                             </div>
                          </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

                   {/* Step 4+: Dashboard Blocks */}
                   <AnimatePresence mode="popLayout">
                      {step >= 4 && (
                        <motion.div
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           className="grid grid-cols-12 gap-6 h-full content-start"
                        >
                           {/* Chart Block */}
                           <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                              className="col-span-12 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-64 relative overflow-hidden group"
                           >
                              <div className="flex items-center justify-between mb-8">
                                <div className="h-4 w-32 bg-zinc-800 rounded" />
                                <BarChartIcon className="w-5 h-5 text-zinc-700" />
                              </div>
                              <div className="flex items-end gap-3 h-40 w-full px-2">
                                  {[40, 70, 50, 90, 60, 80, 50, 70, 60].map((h, i) => (
                                     <div 
                                        key={i} 
                                        className={cn(
                                          "flex-1 rounded-t-sm transition-all duration-1000",
                                          isVerified && step === 4 
                                            ? "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                                            : "bg-zinc-800"
                                        )} 
                                        style={{ height: `${h}%` }} 
                                     />
                                  ))}
                              </div>

                              {/* Step 5: AI Overlay on Dashboard */}
                              {step >= 5 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.4 }}
                                  className="absolute inset-x-6 bottom-6 bg-indigo-950/90 border border-indigo-500/30 rounded-lg p-4 backdrop-blur-md flex items-start gap-4 shadow-xl"
                                >
                                   <div className="p-2 bg-indigo-500/20 rounded-md shrink-0">
                                      <Sparkles className="w-4 h-4 text-indigo-400" />
                                   </div>
                                   <div className="space-y-2 flex-1 pt-1">
                                      <div className="h-2.5 w-3/4 bg-indigo-400/20 rounded" />
                                      <div className="h-2.5 w-1/2 bg-indigo-400/20 rounded" />
                                   </div>
                                </motion.div>
                              )}
                           </motion.div>

                           {/* Pie Chart / Stats Block
                           <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.2 }}
                              className="col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 h-64 flex flex-col items-center justify-center relative"
                           >
                               <div className="absolute top-6 left-6 h-4 w-20 bg-zinc-800 rounded" />
                               <div className="w-32 h-32 rounded-full border-8 border-zinc-800 border-t-indigo-500/50 border-r-indigo-500/50 shadow-inner" />
                           </motion.div> */}

                           {/* Bottom List Block */}
                           <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="col-span-12 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4"
                           >
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-2 rounded hover:bg-zinc-800/30 transition-colors">
                                   <div className="w-10 h-10 rounded bg-zinc-800 shrink-0" />
                                   <div className="flex-1 space-y-2">
                                      <div className="h-2.5 w-32 bg-zinc-800 rounded" />
                                      <div className="h-2.5 w-24 bg-zinc-800/50 rounded" />
                                   </div>
                                   <div className="w-8 h-8 rounded-full bg-zinc-800/50" />
                                </div>
                              ))}
                           </motion.div>
                        </motion.div>
                      )}
                   </AnimatePresence>

                </div>
             </div>
          </div>


          {/* RIGHT SIDEBAR (Step 3+) */}
          <motion.div 
            className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 relative z-20"
            initial={{ width: 0, opacity: 0 }}
            animate={{ 
              width: step >= 3 ? 320 : 0, 
              opacity: step >= 3 ? 1 : 0 
            }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          >
             <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between min-w-[320px]">
                <div className="flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-indigo-400" />
                   <span className="text-sm font-medium text-zinc-200">AI Assistant</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-zinc-600" />
             </div>

             <div className="flex-1 p-4 space-y-6 overflow-hidden min-w-[320px] overflow-y-auto">
                {/* Greeting Bubble */}
                {step >= 3 && step < 5 && (
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9, y: 10 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: -10 }}
                     transition={{ delay: 0.3 }}
                     className="flex gap-3"
                  >
                   <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 mt-1">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                   </div>
                   <div className="bg-zinc-800/50 rounded-2xl rounded-tl-none p-4 text-sm text-zinc-300 border border-zinc-700/50 leading-relaxed shadow-sm">
                      {getGreetingMessage(data)}
                   </div>
                </motion.div>
                )}

                {/* Step 3: AI Explanation of Concept (Instead of Me message) */}
                {data.technical_proficiency && step >= 3 && step < 5 && (
                   <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      transition={{ delay: 0.4 }} // Reduced delay for smoother feel
                      className="flex gap-3"
                   >
                     <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 mt-1">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                     </div>
                      <div className="bg-zinc-800/50 rounded-2xl rounded-tl-none p-4 text-sm text-zinc-300 border border-zinc-700/50 leading-relaxed shadow-sm space-y-2">
                          {/* <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Example Explanation</p> */}
                          <p>
                            {getTechnicalExplanation(data.technical_proficiency)}
                          </p>
                      </div>
                   </motion.div>
                )}

                {/* Step 5: Artifacts/Replies */}

                {/* Step 5: Artifacts/Replies (Replaces previous messages) */}
                <AnimatePresence>
                   {step >= 5 && (
                     <>
                        {/* 1. Quarterly Sales Chart */}
                        <motion.div 
                          key="artifact-1"
                          initial={{ opacity: 0, y: 10, x: 20 }}
                          animate={{ opacity: 1, y: 0, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="mt-4 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800 hover:border-indigo-500/30 transition-colors cursor-pointer group"
                        >
                           <div className="flex items-center gap-3 mb-3">
                              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                 <PieChart className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-medium text-zinc-300">Quarterly Sales</span>
                           </div>
                           <div className="space-y-2">
                              <div className="flex items-end gap-1 h-12 w-full px-1">
                                {[40, 70, 50, 90, 60, 30, 80].map((h, i) => (
                                  <div key={i} className="flex-1 bg-emerald-800/80 rounded-t-[1px]" style={{ height: `${h}%` }} />
                                ))}
                              </div>
                           </div>
                        </motion.div>

                        {/* 2. Workflow Step (Code) */}
                        <motion.div 
                           key="artifact-2"
                           initial={{ opacity: 0, y: 10, x: 20 }}
                           animate={{ opacity: 1, y: 0, x: 0 }}
                           transition={{ delay: 0.6 }}
                           className="bg-zinc-950/80 rounded-lg border border-zinc-800 p-3 font-mono text-[10px] text-zinc-400 overflow-hidden"
                        >
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-indigo-400">workflow.ts</span>
                              <div className="flex gap-1">
                                 <div className="w-2 h-2 rounded-full bg-red-500/20" />
                                 <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                              </div>
                           </div>
                           <div className="space-y-1 opacity-70">
                              <div className="flex gap-2"><span className="text-pink-400">const</span> <span className="text-blue-300">process</span> = <span className="text-yellow-300">async</span> () ={">"} {"{"}</div>
                              <div className="pl-4 text-zinc-500">// Fetch pending orders</div>
                              <div className="pl-4"><span className="text-pink-400">await</span> db.orders.findMany(...)</div>
                              <div>{"}"}</div>
                           </div>
                        </motion.div>

                        {/* 3. Documentation */}
                        <motion.div 
                           key="artifact-3"
                           initial={{ opacity: 0, y: 10, x: 20 }}
                           animate={{ opacity: 1, y: 0, x: 0 }}
                           transition={{ delay: 1.0 }}
                           className="bg-zinc-900/30 rounded-lg border border-zinc-800/50 p-3 space-y-2"
                        >
                           <div className="flex items-center gap-3 mb-3">
                              <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                 <PieChart className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-medium text-zinc-300">Quarterly Sales</span>
                           </div>
                           <div className="h-2 w-1/3 bg-blue-700/50 rounded" />
                           <div className="space-y-1.5">
                              <div className="h-1.5 w-full bg-blue-800 rounded" />
                              <div className="h-1.5 w-5/6 bg-blue-800 rounded" />
                              <div className="h-1.5 w-4/6 bg-blue-800 rounded" />
                           </div>
                        </motion.div>
                     </>
                   )}
                </AnimatePresence>
             </div>

             {/* Input Area */}
             <div className="p-4 border-t border-zinc-800/50 min-w-[320px]">
                <div className="h-10 bg-zinc-800/50 rounded-lg border border-zinc-800 flex items-center px-3 gap-3">
                   <Plus className="w-4 h-4 text-zinc-600" />
                   <div className="h-1.5 w-24 bg-zinc-700/50 rounded" />
                </div>
             </div>
          </motion.div>
        
        </div>
      </div>
    </div>
  );
}

function getGreetingMessage(data: OnboardingInitialValues) {
  const tone = data.tone_of_voice;
  //todo: add users name from onboarding to friendly prompt
  if (tone === "friendly") return "Good afternoon! 👋 Just let me know what I can help you with!";
  if (tone === "efficient") return "Let's get started.";
  return "Hey! I'm ready when you are.";
}

function getTechnicalExplanation(level: string) {
  if (level === "less") {
    return "The system can't find any data with the information provided, check for typos in the workflow.";
  }
  if (level === "more") {
    return "The Fetch Data step failed with a 404, check the workflow config or input mapping.";
  }
  return "The record you're trying to fetch wasn't found, has the correct ID been provided?";
}

// Icon for the chart
function BarChartIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  )
}
