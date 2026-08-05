"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, MoreHorizontal, PieChart, Plus, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface OnboardingInitialValues {
  ai_generation_guidance: string;
  business_description: string;
  database_connection: string;
  firstname: string;
  job_title: string;
  lastname: string;
  profile_pic_url: string;
  role_experience: string;
  selected_plan: "lite" | "plus" | "pro";
  technical_proficiency: "less" | "regular" | "more";
  tone_of_voice: "friendly" | "balanced" | "efficient" | string;
  workspace_name: string;
  workspace_profile_pic_url: string;
  workspace_url: string;
}

interface WorkspacePreviewProps {
  data: OnboardingInitialValues;
  isVerified?: boolean;
  step: number;
}

export function WorkspacePreview({
  step,
  data,
  isVerified,
}: WorkspacePreviewProps) {
  // Common transition for smooth layout changes
  const _springTransition = { damping: 30, stiffness: 300, type: "spring" };

  return (
    <div className="relative hidden aspect-[16/11] w-full select-none overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-sans text-zinc-100 shadow-2xl lg:block">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 via-zinc-950 to-zinc-950" />

      {/* Main Content Container */}
      <div className="absolute inset-0 flex flex-col">
        {/* Browser Chrome */}
        <motion.div
          animate={{ opacity: step >= 2 ? 1 : 0.5 }}
          className="z-30 flex h-10 shrink-0 items-center gap-3 border-zinc-800 border-b bg-zinc-900/80 px-4 backdrop-blur"
        >
          <div className="flex gap-1.5">
            <div className="box-content h-3 w-3 rounded-full border border-red-500/30 bg-red-500/20" />
            <div className="box-content h-3 w-3 rounded-full border border-amber-500/30 bg-amber-500/20" />
            <div className="box-content h-3 w-3 rounded-full border border-green-500/30 bg-green-500/20" />
          </div>

          <div className="flex flex-1 justify-center">
            <motion.div
              animate={{ opacity: step >= 2 ? 1 : 0 }}
              className="flex h-6 w-full max-w-[240px] items-center justify-center rounded border border-zinc-800 bg-zinc-950 px-3 text-[10px] text-zinc-500"
            >
              splx.com/{data.workspace_url || "workspace"}
            </motion.div>
          </div>
        </motion.div>

        {/* App Body */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* STEP 1: Profile Card (The "Before" state of the avatar) */}
          <AnimatePresence>
            {step === 1 && (
              <motion.div
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
                exit={{ opacity: 0, pointerEvents: "none" }}
                initial={{ opacity: 0 }}
              >
                <motion.div
                  className="relative flex w-96 flex-col items-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl"
                  layoutId="profile-card"
                >
                  <motion.div className="relative" layoutId="avatar-container">
                    <Avatar className="h-24 w-24 border-4 border-zinc-950 shadow-xl">
                      <AvatarImage src={data.profile_pic_url} />
                      <AvatarFallback className="bg-indigo-500/20 text-2xl text-indigo-300">
                        {(data.firstname?.[0] || "") +
                          (data.lastname?.[0] || "")}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  <motion.div
                    className="space-y-2 text-center"
                    layoutId="profile-text"
                  >
                    <div>
                      <h3 className="font-medium text-white text-xl">
                        {data.firstname || "New"} {data.lastname || "User"}
                      </h3>
                      {!!data.job_title && (
                        <p className="font-medium text-indigo-400 text-sm">
                          {data.job_title}
                        </p>
                      )}
                    </div>

                    {!!data.role_experience && (
                      <p className="line-clamp-2 px-4 text-xs text-zinc-500 leading-relaxed">
                        {data.role_experience}
                      </p>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* APP LAYOUT (Step 2+) */}
          <div className="flex min-w-0 flex-1 flex-col bg-zinc-950">
            {/* Top Navigation */}
            <motion.div
              animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : -20 }}
              className="flex h-14 shrink-0 items-center justify-between border-zinc-800 border-b px-4"
              initial={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar transitions to here */}
                <div className="relative">
                  {step >= 2 && (
                    <motion.div
                      className="relative z-50"
                      layoutId="avatar-container"
                    >
                      <Avatar className="h-8 w-8 border border-zinc-800">
                        <AvatarImage src={data.profile_pic_url} />
                        <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs">
                          {(data.firstname?.[0] || "") +
                            (data.lastname?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                  )}
                </div>

                <div className="mx-2 h-6 w-[1px] bg-zinc-800" />

                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800">
                    <Menu className="h-3 w-3 text-zinc-500" />
                  </div>
                  <span className="font-medium text-sm text-zinc-300">
                    {data.workspace_name || "Workspace Settings"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full border border-zinc-800 bg-zinc-900" />
                <div className="h-6 w-6 rounded-full border border-zinc-800 bg-zinc-900" />
              </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="relative flex-1 overflow-hidden p-8">
              {/* Background Grid Pattern (Subtle) */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%__50%,#000_70%,transparent_100%)]" />

              {/* Content: Workspace Settings Skelton (Step 2 & 3) / Dashboard (Step 4+) */}
              <div className="relative z-10 mx-auto h-full max-w-5xl">
                {/* Step 2-3: Settings Skeleton (2 Columns) */}
                <AnimatePresence mode="popLayout">
                  {step < 4 && step >= 2 && (
                    <motion.div
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex h-full gap-8"
                      exit={{ filter: "blur(4px)", opacity: 0, y: -20 }}
                      initial={{ opacity: 0, scale: 0.95 }}
                    >
                      {/* Col 1: Settings Nav Skeleton */}
                      <div className="hidden w-48 shrink-0 space-y-3 md:block">
                        <div className="mb-6 h-4 w-24 rounded bg-zinc-800" />
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            className={cn(
                              "h-8 w-full rounded",
                              i === 1
                                ? "bg-zinc-800"
                                : "border border-zinc-800/50 bg-transparent"
                            )}
                            key={i}
                          />
                        ))}
                      </div>

                      {/* Col 2: Settings Form Skeleton */}
                      <div className="flex-1 space-y-8">
                        <div>
                          <div className="mb-2 h-6 w-48 rounded bg-zinc-800" />
                          <div className="h-4 w-64 rounded bg-zinc-900" />
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <div className="h-4 w-24 rounded bg-zinc-900" />
                            <div className="h-10 w-full rounded border border-zinc-800 bg-zinc-900" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-32 rounded bg-zinc-900" />
                            <div className="h-10 w-full rounded border border-zinc-800 bg-zinc-900" />
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-20 rounded bg-zinc-900" />
                            <div className="h-24 w-full rounded border border-zinc-800 bg-zinc-900" />
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
                      animate={{ opacity: 1 }}
                      className="grid h-full grid-cols-12 content-start gap-6"
                      initial={{ opacity: 0 }}
                    >
                      {/* Chart Block */}
                      <motion.div
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative col-span-12 h-64 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
                        initial={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="mb-8 flex items-center justify-between">
                          <div className="h-4 w-32 rounded bg-zinc-800" />
                          <BarChartIcon className="h-5 w-5 text-zinc-700" />
                        </div>
                        <div className="flex h-40 w-full items-end gap-3 px-2">
                          {[40, 70, 50, 90, 60, 80, 50, 70, 60].map((h, i) => (
                            <div
                              className={cn(
                                "flex-1 rounded-t-sm transition-all duration-1000",
                                isVerified && step === 4
                                  ? "bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                  : "bg-zinc-800"
                              )}
                              key={i}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>

                        {/* Step 5: AI Overlay on Dashboard */}
                        {step >= 5 && (
                          <motion.div
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute inset-x-6 bottom-6 flex items-start gap-4 rounded-lg border border-indigo-500/30 bg-indigo-950/90 p-4 shadow-xl backdrop-blur-md"
                            initial={{ opacity: 0, y: 10 }}
                            transition={{ delay: 0.4 }}
                          >
                            <div className="shrink-0 rounded-md bg-indigo-500/20 p-2">
                              <Sparkles className="h-4 w-4 text-indigo-400" />
                            </div>
                            <div className="flex-1 space-y-2 pt-1">
                              <div className="h-2.5 w-3/4 rounded bg-indigo-400/20" />
                              <div className="h-2.5 w-1/2 rounded bg-indigo-400/20" />
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
                        animate={{ opacity: 1, y: 0 }}
                        className="col-span-12 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
                        initial={{ opacity: 0, y: 20 }}
                        transition={{ delay: 0.3 }}
                      >
                        {[1, 2, 3].map((i) => (
                          <div
                            className="flex items-center gap-4 rounded p-2 transition-colors hover:bg-zinc-800/30"
                            key={i}
                          >
                            <div className="h-10 w-10 shrink-0 rounded bg-zinc-800" />
                            <div className="flex-1 space-y-2">
                              <div className="h-2.5 w-32 rounded bg-zinc-800" />
                              <div className="h-2.5 w-24 rounded bg-zinc-800/50" />
                            </div>
                            <div className="h-8 w-8 rounded-full bg-zinc-800/50" />
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
            animate={{
              opacity: step >= 3 ? 1 : 0,
              width: step >= 3 ? 320 : 0,
            }}
            className="relative z-20 flex w-80 shrink-0 flex-col border-zinc-800 border-l bg-zinc-900"
            initial={{ opacity: 0, width: 0 }}
            transition={{ bounce: 0, duration: 0.5, type: "spring" }}
          >
            <div className="flex min-w-[320px] items-center justify-between border-zinc-800/50 border-b p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="font-medium text-sm text-zinc-200">
                  AI Assistant
                </span>
              </div>
              <MoreHorizontal className="h-4 w-4 text-zinc-600" />
            </div>

            <div className="min-w-[320px] flex-1 space-y-6 overflow-hidden overflow-y-auto p-4">
              {/* Greeting Bubble */}
              {step >= 3 && step < 5 && (
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex gap-3"
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/20">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none border border-zinc-700/50 bg-zinc-800/50 p-4 text-sm text-zinc-300 leading-relaxed shadow-sm">
                    {getGreetingMessage(data)}
                  </div>
                </motion.div>
              )}

              {/* Step 3: AI Explanation of Concept (Instead of Me message) */}
              {data.technical_proficiency && step >= 3 && step < 5 && (
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex gap-3"
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ delay: 0.4 }} // Reduced delay for smoother feel
                >
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/20">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="space-y-2 rounded-2xl rounded-tl-none border border-zinc-700/50 bg-zinc-800/50 p-4 text-sm text-zinc-300 leading-relaxed shadow-sm">
                    {/* <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Example Explanation</p> */}
                    <p>{getTechnicalExplanation(data.technical_proficiency)}</p>
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
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      className="group mt-4 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 transition-colors hover:border-indigo-500/30"
                      initial={{ opacity: 0, x: 20, y: 10 }}
                      key="artifact-1"
                      transition={{ delay: 0.2 }}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                          <PieChart className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-xs text-zinc-300">
                          Quarterly Sales
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex h-12 w-full items-end gap-1 px-1">
                          {[40, 70, 50, 90, 60, 30, 80].map((h, i) => (
                            <div
                              className="flex-1 rounded-t-[1px] bg-emerald-800/80"
                              key={i}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* 2. Workflow Step (Code) */}
                    <motion.div
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 font-mono text-[10px] text-zinc-400"
                      initial={{ opacity: 0, x: 20, y: 10 }}
                      key="artifact-2"
                      transition={{ delay: 0.6 }}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-indigo-400">workflow.ts</span>
                        <div className="flex gap-1">
                          <div className="h-2 w-2 rounded-full bg-red-500/20" />
                          <div className="h-2 w-2 rounded-full bg-amber-500/20" />
                        </div>
                      </div>
                      <div className="space-y-1 opacity-70">
                        <div className="flex gap-2">
                          <span className="text-pink-400">const</span>{" "}
                          <span className="text-blue-300">process</span> ={" "}
                          <span className="text-yellow-300">async</span> () =
                          {">"} {"{"}
                        </div>
                        <div className="pl-4 text-zinc-500">
                          {/* Fetch pending orders */}
                        </div>
                        <div className="pl-4">
                          <span className="text-pink-400">await</span>{" "}
                          db.orders.findMany(...)
                        </div>
                        <div>{"}"}</div>
                      </div>
                    </motion.div>

                    {/* 3. Documentation */}
                    <motion.div
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      className="space-y-2 rounded-lg border border-zinc-800/50 bg-zinc-900/30 p-3"
                      initial={{ opacity: 0, x: 20, y: 10 }}
                      key="artifact-3"
                      transition={{ delay: 1.0 }}
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="rounded bg-emerald-500/10 p-1.5 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
                          <PieChart className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-xs text-zinc-300">
                          Quarterly Sales
                        </span>
                      </div>
                      <div className="h-2 w-1/3 rounded bg-blue-700/50" />
                      <div className="space-y-1.5">
                        <div className="h-1.5 w-full rounded bg-blue-800" />
                        <div className="h-1.5 w-5/6 rounded bg-blue-800" />
                        <div className="h-1.5 w-4/6 rounded bg-blue-800" />
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="min-w-[320px] border-zinc-800/50 border-t p-4">
              <div className="flex h-10 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3">
                <Plus className="h-4 w-4 text-zinc-600" />
                <div className="h-1.5 w-24 rounded bg-zinc-700/50" />
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
  if (tone === "friendly") {
    return "Good afternoon! 👋 Just let me know what I can help you with!";
  }
  if (tone === "efficient") {
    return "Let's get started.";
  }
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
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}
