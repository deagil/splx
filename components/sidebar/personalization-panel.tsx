"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/shared/toast";
import { X, Settings, MessageSquare, Code, Zap, Trash2, Edit2, Sparkles, Code2, FileText, FileCode, Table } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SkillUI } from "@/lib/ai/skills-ui-schema";
import { SkillQuestion } from "@/components/skills-training/skill-question";
import { SkillVariants } from "@/components/skills-training/skill-variants";
import { SkillPreview } from "@/components/skills-training/skill-preview";
import { SkillClarification } from "@/components/skills-training/skill-clarification";

type PersonalizationPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiContext?: string | null;
  proficiency?: string | null;
  aiTone?: string | null;
  aiGuidance?: string | null;
  personalizationEnabled?: boolean;
  onPersonalizationToggle?: (enabled: boolean) => void;
};

type Skill = {
  id: string;
  name: string;
  command: string;
  description: string | null;
  prompt: string;
};

export function PersonalizationPanel({
  open,
  onOpenChange,
  aiContext = "",
  proficiency = "regular",
  aiTone = "balanced",
  aiGuidance = "",
  personalizationEnabled = false,
  onPersonalizationToggle,
}: PersonalizationPanelProps) {
  const [formData, setFormData] = useState({
    ai_context: aiContext || "",
    proficiency: proficiency || "regular",
    ai_tone: aiTone || "balanced",
    ai_guidance: aiGuidance || "",
  });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [learningSkillId, setLearningSkillId] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkill, setEditSkill] = useState({ name: "", command: "", description: "", prompt: "" });
  const [currentUIState, setCurrentUIState] = useState<SkillUI | null>(null);
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const [previousSkill, setPreviousSkill] = useState<SkillUI["skill"] | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  // Update form data when props change
  useEffect(() => {
    setFormData({
      ai_context: aiContext || "",
      proficiency: proficiency || "regular",
      ai_tone: aiTone || "balanced",
      ai_guidance: aiGuidance || "",
    });
  }, [aiContext, proficiency, aiTone, aiGuidance]);

  // Load skills when panel opens
  useEffect(() => {
    if (open) {
      loadSkills();
    }
  }, [open]);

  const loadSkills = async () => {
    try {
      const response = await fetch("/api/user/skills");
      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      }
    } catch (error) {
      console.error("Error loading skills:", error);
    }
  };

  // Debounce timer ref for auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save preferences with debouncing
  const autoSave = (newFormData: typeof formData) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 500ms of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newFormData),
        });

        if (!response.ok) {
          throw new Error("Failed to save preferences");
        }

        // Silent save - no toast notification to avoid spam
      } catch (error) {
        toast({
          type: "error",
          description: "Failed to save preferences. Please try again.",
        });
        console.error("Error saving preferences:", error);
      }
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleLearnSkill = async (description: string) => {
    if (!description || description.trim().length === 0) {
      toast({
        type: "error",
        description: "Please describe what you want to accomplish",
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setLearningSkillId(tempId);
    setIsGeneratingPrompt(true);
    setCurrentUIState(null);
    setPreviousSkill(null);
    setConversationHistory([{ role: "user", content: description.trim() }]);

    try {
      await processSkillGeneration(description.trim(), "auto", null);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to start skill training. Please try again.";
      
      toast({
        type: "error",
        description: errorMessage,
      });
      console.error("Error starting skill training:", error);
      setIsGeneratingPrompt(false);
      setLearningSkillId(null);
      setCurrentUIState(null);
      
      // Offer fallback to simple creation
      if (errorMessage.includes("timeout") || errorMessage.includes("No UI response")) {
        // Could add a fallback button here to try simple creation
      }
    }
  };

  const processSkillGeneration = async (
    description: string,
    mode: "auto" | "create" | "refine",
    previousSkillData: SkillUI["skill"] | null,
  ) => {
    const timeoutId = setTimeout(() => {
      setIsGeneratingPrompt(false);
      toast({
        type: "error",
        description: "Request timed out. Please try again.",
      });
    }, 30000); // 30 second timeout

    try {
      const response = await fetch("/api/user/skills/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          mode,
          previous_skill: previousSkillData,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        clearTimeout(timeoutId);
        let errorMessage = "Failed to generate skill";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        clearTimeout(timeoutId);
        throw new Error("No response from server");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasReceivedUI = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) continue;

            try {
              // Parse SSE format: "data: {...}"
              const jsonStr = line.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);
              
              // Handle our custom skill-ui events
              if (data.type === "skill-ui" && data.data) {
                const uiState = data.data as SkillUI;
                if (uiState && uiState.type) {
                  setCurrentUIState(uiState);
                  setIsGeneratingPrompt(false);
                  hasReceivedUI = true;
                  clearTimeout(timeoutId);
                }
              }
              
              // Handle error events
              if (data.type === "error") {
                clearTimeout(timeoutId);
                throw new Error(data.error || "Unknown error occurred");
              }
            } catch (e) {
              // Ignore parse errors for non-JSON lines
              if (e instanceof SyntaxError) {
                continue;
              }
              throw e;
            }
          }
        }

        // If we didn't receive a UI state, show an error
        if (!hasReceivedUI) {
          clearTimeout(timeoutId);
          throw new Error("No UI response received from AI");
        }
      } finally {
        reader.releaseLock();
        clearTimeout(timeoutId);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setIsGeneratingPrompt(false);
      throw error;
    }
  };

  const handleCancelTraining = () => {
    setLearningSkillId(null);
    setIsGeneratingPrompt(false);
    setCurrentUIState(null);
    setPreviousSkill(null);
    setConversationHistory([]);
    setNewSkillDescription("");
  };

  const handleUIResponse = async (value: string) => {
    if (!learningSkillId) return;

    setIsGeneratingPrompt(true);
    setCurrentUIState(null);
    const updatedHistory = [
      ...conversationHistory,
      { role: "assistant" as const, content: currentUIState?.message || "" },
      { role: "user" as const, content: value },
    ];
    setConversationHistory(updatedHistory);

    try {
      await processSkillGeneration(value, "auto", previousSkill);
    } catch (error) {
      toast({
        type: "error",
        description: "Failed to send response. Please try again.",
      });
      console.error("Error sending response:", error);
      setIsGeneratingPrompt(false);
    }
  };

  const handleSaveSkill = async (skill: SkillUI["skill"]) => {
    if (!skill) return;

    setIsSavingSkill(true);
    try {
      const response = await fetch("/api/user/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: skill.name.trim(),
          command: skill.slug.trim(),
          description: skill.description.trim() || null,
          prompt: skill.prompt.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create skill");
      }

      const data = await response.json();
      setSkills([...skills, data.skill]);
      setNewSkillDescription("");
      setCurrentUIState(null);
      setPreviousSkill(null);
      setConversationHistory([]);
      setLearningSkillId(null);
      setIsGeneratingPrompt(false);
      
      toast({
        type: "success",
        description: "Skill learned successfully",
      });
    } catch (error) {
      toast({
        type: "error",
        description: error instanceof Error ? error.message : "Failed to save skill. Please try again.",
      });
      console.error("Error saving skill:", error);
    } finally {
      setIsSavingSkill(false);
    }
  };

  const handleImproveSkill = async (skill: SkillUI["skill"]) => {
    if (!skill || !learningSkillId) return;

    setPreviousSkill(skill);
    setIsGeneratingPrompt(true);
    setCurrentUIState(null);
    const updatedHistory = [
      ...conversationHistory,
      { role: "assistant" as const, content: "Skill generated" },
      { role: "user" as const, content: "Please improve this skill further" },
    ];
    setConversationHistory(updatedHistory);

    try {
      await processSkillGeneration(
        conversationHistory[0]?.content || "",
        "refine",
        skill,
      );
    } catch (error) {
      toast({
        type: "error",
        description: "Failed to request improvement. Please try again.",
      });
      console.error("Error requesting improvement:", error);
      setIsGeneratingPrompt(false);
    }
  };

  const handleStartEdit = (skill: Skill) => {
    setEditingSkillId(skill.id);
    setEditSkill({
      name: skill.name,
      command: skill.command,
      description: skill.description || "",
      prompt: skill.prompt,
    });
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    setEditSkill({ name: "", command: "", description: "", prompt: "" });
  };

  const handleUpdateSkill = async () => {
    if (!editSkill.name || !editSkill.prompt) {
      toast({
        type: "error",
        description: "Please provide a name and prompt for the skill",
      });
      return;
    }

    if (!editingSkillId) return;

    try {
      const response = await fetch(`/api/user/skills/${editingSkillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editSkill.name.trim(),
          command: editSkill.command.trim(),
          description: editSkill.description.trim() || null,
          prompt: editSkill.prompt.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update skill");
      }

      const data = await response.json();
      setSkills(skills.map((s) => (s.id === editingSkillId ? data.skill : s)));
      handleCancelEdit();

      toast({
        type: "success",
        description: "Skill updated successfully",
      });
    } catch (error) {
      toast({
        type: "error",
        description: "Failed to update skill. Please try again.",
      });
      console.error("Error updating skill:", error);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      const response = await fetch(`/api/user/skills/${skillId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete skill");
      }

      setSkills(skills.filter((s) => s.id !== skillId));

      toast({
        type: "success",
        description: "Skill deleted successfully",
      });
    } catch (error) {
      toast({
        type: "error",
        description: "Failed to delete skill. Please try again.",
      });
      console.error("Error deleting skill:", error);
    }
  };

  const proficiencyOptions = [
    { value: "less", label: "Prefer Guidance", description: "Simpler language, more explanations" },
    { value: "regular", label: "Balanced", description: "Mix of clarity and detail" },
    { value: "more", label: "Prefer Details", description: "Technical specifics, less hand-holding" },
  ];

  const toneOptions = [
    { value: "friendly", label: "Friendly", description: "Bubbly and playful" },
    { value: "balanced", label: "Balanced", description: "Professional yet approachable" },
    { value: "efficient", label: "Efficient", description: "Direct and concise" },
  ];

  const artifactTypes = [
    { value: "text", label: "Text", icon: FileText, description: "Documents, essays, articles" },
    { value: "code", label: "Code", icon: FileCode, description: "Code snippets, scripts, functions" },
    { value: "sheet", label: "Sheet", icon: Table, description: "Spreadsheets, tables, data" },
  ];

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pointer-events-none">
        <div
          className="bg-background border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-background border-b px-6 py-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">AI Personalization</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Customize how the AI assistant works for you
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="general" className="w-full">
              <div className="border-b px-6">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                  <TabsTrigger value="general" className="gap-2">
                    <Settings className="h-4 w-4" />
                    General
                  </TabsTrigger>
                  {/* <TabsTrigger value="conversation" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversation
                  </TabsTrigger>
                  <TabsTrigger value="generation" className="gap-2">
                    <Code className="h-4 w-4" />
                    Generation
                  </TabsTrigger> */}
                  <TabsTrigger value="skills" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Skills
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* General Tab */}
              <TabsContent value="general" className="p-6 mt-0 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI Personalization</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable personalized AI responses based on your preferences
                      </p>
                    </div>
                    <Button
                      variant={personalizationEnabled ? "primary" : "outline"}
                      size="sm"
                      onClick={() => onPersonalizationToggle?.(!personalizationEnabled)}
                    >
                      {personalizationEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>

                {/* <div className="space-y-3">
                  <Label htmlFor="ai_context">Background & Context</Label>
                  <Textarea
                    id="ai_context"
                    placeholder="Tell the AI about your background, role, or interests..."
                    value={formData.ai_context}
                    onChange={(e) => {
                      const newFormData = { ...formData, ai_context: e.target.value };
                      setFormData(newFormData);
                      autoSave(newFormData);
                    }}
                    className="min-h-[80px] resize-none"
                    maxLength={2000}
                  />
                </div> */}

                <div className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Technical Proficiency</Label>
                    <ToggleGroup
                      type="single"
                      value={formData.proficiency}
                      onValueChange={(value) => {
                        if (value) {
                          const newFormData = { ...formData, proficiency: value };
                          setFormData(newFormData);
                          autoSave(newFormData);
                        }
                      }}
                      className="w-full"
                    >
                      {proficiencyOptions.map((option) => (
                        <ToggleGroupItem
                          key={option.value}
                          value={option.value}
                          className="flex-1"
                        >
                          <div className="text-center">
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {option.description}
                            </div>
                          </div>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  <div>
                    <Label className="mb-3 block">Tone of Voice</Label>
                    <ToggleGroup
                      type="single"
                      value={formData.ai_tone}
                      onValueChange={(value) => {
                        if (value) {
                          const newFormData = { ...formData, ai_tone: value };
                          setFormData(newFormData);
                          autoSave(newFormData);
                        }
                      }}
                      className="w-full"
                    >
                      {toneOptions.map((option) => (
                        <ToggleGroupItem
                          key={option.value}
                          value={option.value}
                          className="flex-1"
                        >
                          <div className="text-center">
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {option.description}
                            </div>
                          </div>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="ai_guidance">Additional Instructions</Label>
                  <Textarea
                    id="ai_guidance"
                    placeholder="Any specific preferences or instructions for the AI..."
                    value={formData.ai_guidance}
                    onChange={(e) => {
                      const newFormData = { ...formData, ai_guidance: e.target.value };
                      setFormData(newFormData);
                      autoSave(newFormData);
                    }}
                    className="min-h-[100px] resize-none"
                    maxLength={4000}
                  />
                </div>
              </TabsContent>

              {/* Conversation Tab
              <TabsContent value="conversation" className="p-6 mt-0 space-y-6">
                
              </TabsContent> */}

              {/* Generation Tab */}
              <TabsContent value="generation" className="p-6 mt-0 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Artifact Types</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Configure preferences for different types of generated content
                    </p>
                    <div className="grid gap-3">
                      {artifactTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.value}
                            className="flex items-start gap-3 p-3 rounded-lg border"
                          >
                            <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{type.label}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {type.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="generation_guidance">Generation Instructions</Label>
                    <Textarea
                      id="generation_guidance"
                      placeholder="e.g., Use TypeScript, prefer functional programming, include comments"
                      value={formData.ai_guidance}
                      onChange={(e) => {
                        const newFormData = { ...formData, ai_guidance: e.target.value };
                        setFormData(newFormData);
                        autoSave(newFormData);
                      }}
                      className="min-h-[100px] resize-none"
                      maxLength={2000}
                    />
                    <p className="text-xs text-muted-foreground">
                      General instructions for how the AI should generate content
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="p-6 mt-0 space-y-4">
                <AnimatePresence mode="popLayout">
                  {skills.map((skill) => (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative"
                    >
                      {editingSkillId === skill.id ? (
                        <div className="space-y-4 p-4 rounded-lg border">
                          <div className="space-y-2">
                            <Label>Skill Name</Label>
                            <Input
                              value={editSkill.name}
                              onChange={(e) =>
                                setEditSkill({ ...editSkill, name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Command</Label>
                            <Input
                              value={editSkill.command}
                              onChange={(e) =>
                                setEditSkill({ ...editSkill, command: e.target.value })
                              }
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Prompt</Label>
                            <Textarea
                              value={editSkill.prompt}
                              onChange={(e) =>
                                setEditSkill({ ...editSkill, prompt: e.target.value })
                              }
                              className="min-h-[100px] font-mono text-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleUpdateSkill} className="flex-1">
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative p-4 rounded-lg border bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">{skill.name}</h4>
                                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                  /{skill.command}
                                </span>
                              </div>
                              {skill.description && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {skill.description}
                                </p>
                              )}
                              <p className="text-xs font-mono text-muted-foreground line-clamp-2">
                                {skill.prompt}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleStartEdit(skill)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteSkill(skill.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Skill Input */}
                <motion.div
                  key="skill-input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  {learningSkillId && (isGeneratingPrompt || currentUIState) ? (
                    <div className="space-y-3">
                      {/* Loading state */}
                      {isGeneratingPrompt && !currentUIState && (
                        <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 animate-pulse">
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-primary animate-spin" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">Learning skill...</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                AI is analyzing your request
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Render UI components based on currentUIState */}
                      {currentUIState && (
                        <div className="space-y-3">
                          {currentUIState.type === "question" && (
                            <SkillQuestion
                              message={currentUIState.message}
                              options={currentUIState.options}
                              onSelect={handleUIResponse}
                            />
                          )}

                          {currentUIState.type === "variants" && (
                            <SkillVariants
                              message={currentUIState.message}
                              options={currentUIState.options}
                              onSelect={handleUIResponse}
                            />
                          )}

                          {currentUIState.type === "final-skill" && currentUIState.skill && (
                            <SkillPreview
                              skill={currentUIState.skill}
                              onSave={() => handleSaveSkill(currentUIState.skill!)}
                              onImprove={() => handleImproveSkill(currentUIState.skill!)}
                              isSaving={isSavingSkill}
                            />
                          )}

                          {currentUIState.type === "clarification" && (
                            <SkillClarification
                              message={currentUIState.message}
                              onSubmit={handleUIResponse}
                            />
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelTraining}
                            className="w-full"
                          >
                            Cancel Training
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="What are you trying to accomplish? (e.g., 'boil a webpage down to a really simple sentence or two, extracting the main point or opinion')"
                        value={newSkillDescription}
                        onChange={(e) => setNewSkillDescription(e.target.value)}
                        className="min-h-[100px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleLearnSkill(newSkillDescription);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleLearnSkill(newSkillDescription)}
                        disabled={isGeneratingPrompt || !newSkillDescription.trim()}
                        className="w-full"
                      >
                        <Sparkles className="h-3 w-3 mr-2" />
                        Learn Skill
                      </Button>
                    </div>
                  )}
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>
    </>
  );
}
