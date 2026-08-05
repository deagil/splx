"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Edit2,
  FileCode,
  FileText,
  Settings,
  Sparkles,
  Table,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/shared/toast";
import { SkillClarification } from "@/components/skills-training/skill-clarification";
import { SkillPreview } from "@/components/skills-training/skill-preview";
import { SkillQuestion } from "@/components/skills-training/skill-question";
import { SkillVariants } from "@/components/skills-training/skill-variants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SkillUI } from "@/lib/ai/skills-ui-schema";

interface PersonalizationPanelProps {
  aiContext?: string | null;
  aiGuidance?: string | null;
  aiTone?: string | null;
  onOpenChange: (open: boolean) => void;
  onPersonalizationToggle?: (enabled: boolean) => void;
  open: boolean;
  personalizationEnabled?: boolean;
  proficiency?: string | null;
}

interface Skill {
  command: string;
  description: string | null;
  id: string;
  name: string;
  prompt: string;
}

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
    ai_guidance: aiGuidance || "",
    ai_tone: aiTone || "balanced",
    proficiency: proficiency || "regular",
  });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillDescription, setNewSkillDescription] = useState("");
  const [learningSkillId, setLearningSkillId] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkill, setEditSkill] = useState({
    command: "",
    description: "",
    name: "",
    prompt: "",
  });
  const [currentUIState, setCurrentUIState] = useState<SkillUI | null>(null);
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  const [previousSkill, setPreviousSkill] = useState<SkillUI["skill"] | null>(
    null
  );
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  // Update form data when props change
  useEffect(() => {
    setFormData({
      ai_context: aiContext || "",
      ai_guidance: aiGuidance || "",
      ai_tone: aiTone || "balanced",
      proficiency: proficiency || "regular",
    });
  }, [aiContext, proficiency, aiTone, aiGuidance]);

  // Load skills when panel opens
  useEffect(() => {
    if (open) {
      loadSkills();
    }
  }, [open, loadSkills]);

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
          body: JSON.stringify(newFormData),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });

        if (!response.ok) {
          throw new Error("Failed to save preferences");
        }

        // Silent save - no toast notification to avoid spam
      } catch (error) {
        toast({
          description: "Failed to save preferences. Please try again.",
          type: "error",
        });
        console.error("Error saving preferences:", error);
      }
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    },
    []
  );

  const handleLearnSkill = async (description: string) => {
    if (!description || description.trim().length === 0) {
      toast({
        description: "Please describe what you want to accomplish",
        type: "error",
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setLearningSkillId(tempId);
    setIsGeneratingPrompt(true);
    setCurrentUIState(null);
    setPreviousSkill(null);
    setConversationHistory([{ content: description.trim(), role: "user" }]);

    try {
      await processSkillGeneration(description.trim(), "auto", null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start skill training. Please try again.";

      toast({
        description: errorMessage,
        type: "error",
      });
      console.error("Error starting skill training:", error);
      setIsGeneratingPrompt(false);
      setLearningSkillId(null);
      setCurrentUIState(null);

      // Offer fallback to simple creation
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("No UI response")
      ) {
        // Could add a fallback button here to try simple creation
      }
    }
  };

  const processSkillGeneration = async (
    description: string,
    mode: "auto" | "create" | "refine",
    previousSkillData: SkillUI["skill"] | null
  ) => {
    const timeoutId = setTimeout(() => {
      setIsGeneratingPrompt(false);
      toast({
        description: "Request timed out. Please try again.",
        type: "error",
      });
    }, 30_000); // 30 second timeout

    try {
      const response = await fetch("/api/user/skills/generate-prompt", {
        body: JSON.stringify({
          conversation_history: conversationHistory,
          description,
          mode,
          previous_skill: previousSkillData,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
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
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("data: ")) {
              continue;
            }

            try {
              // Parse SSE format: "data: {...}"
              const jsonStr = line.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);

              // Handle our custom skill-ui events
              if (data.type === "skill-ui" && data.data) {
                const uiState = data.data as SkillUI;
                if (uiState?.type) {
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
    if (!learningSkillId) {
      return;
    }

    setIsGeneratingPrompt(true);
    setCurrentUIState(null);
    const updatedHistory = [
      ...conversationHistory,
      { content: currentUIState?.message || "", role: "assistant" as const },
      { content: value, role: "user" as const },
    ];
    setConversationHistory(updatedHistory);

    try {
      await processSkillGeneration(value, "auto", previousSkill);
    } catch (error) {
      toast({
        description: "Failed to send response. Please try again.",
        type: "error",
      });
      console.error("Error sending response:", error);
      setIsGeneratingPrompt(false);
    }
  };

  const handleSaveSkill = async (skill: SkillUI["skill"]) => {
    if (!skill) {
      return;
    }

    setIsSavingSkill(true);
    try {
      const response = await fetch("/api/user/skills", {
        body: JSON.stringify({
          command: skill.slug.trim(),
          description: skill.description.trim() || null,
          name: skill.name.trim(),
          prompt: skill.prompt.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
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
        description: "Skill learned successfully",
        type: "success",
      });
    } catch (error) {
      toast({
        description:
          error instanceof Error
            ? error.message
            : "Failed to save skill. Please try again.",
        type: "error",
      });
      console.error("Error saving skill:", error);
    } finally {
      setIsSavingSkill(false);
    }
  };

  const handleImproveSkill = async (skill: SkillUI["skill"]) => {
    if (!skill || !learningSkillId) {
      return;
    }

    setPreviousSkill(skill);
    setIsGeneratingPrompt(true);
    setCurrentUIState(null);
    const updatedHistory = [
      ...conversationHistory,
      { content: "Skill generated", role: "assistant" as const },
      { content: "Please improve this skill further", role: "user" as const },
    ];
    setConversationHistory(updatedHistory);

    try {
      await processSkillGeneration(
        conversationHistory[0]?.content || "",
        "refine",
        skill
      );
    } catch (error) {
      toast({
        description: "Failed to request improvement. Please try again.",
        type: "error",
      });
      console.error("Error requesting improvement:", error);
      setIsGeneratingPrompt(false);
    }
  };

  const handleStartEdit = (skill: Skill) => {
    setEditingSkillId(skill.id);
    setEditSkill({
      command: skill.command,
      description: skill.description || "",
      name: skill.name,
      prompt: skill.prompt,
    });
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    setEditSkill({ command: "", description: "", name: "", prompt: "" });
  };

  const handleUpdateSkill = async () => {
    if (!editSkill.name || !editSkill.prompt) {
      toast({
        description: "Please provide a name and prompt for the skill",
        type: "error",
      });
      return;
    }

    if (!editingSkillId) {
      return;
    }

    try {
      const response = await fetch(`/api/user/skills/${editingSkillId}`, {
        body: JSON.stringify({
          command: editSkill.command.trim(),
          description: editSkill.description.trim() || null,
          name: editSkill.name.trim(),
          prompt: editSkill.prompt.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to update skill");
      }

      const data = await response.json();
      setSkills(skills.map((s) => (s.id === editingSkillId ? data.skill : s)));
      handleCancelEdit();

      toast({
        description: "Skill updated successfully",
        type: "success",
      });
    } catch (error) {
      toast({
        description: "Failed to update skill. Please try again.",
        type: "error",
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
        description: "Skill deleted successfully",
        type: "success",
      });
    } catch (error) {
      toast({
        description: "Failed to delete skill. Please try again.",
        type: "error",
      });
      console.error("Error deleting skill:", error);
    }
  };

  const proficiencyOptions = [
    {
      description: "Simpler language, more explanations",
      label: "Prefer Guidance",
      value: "less",
    },
    {
      description: "Mix of clarity and detail",
      label: "Balanced",
      value: "regular",
    },
    {
      description: "Technical specifics, less hand-holding",
      label: "Prefer Details",
      value: "more",
    },
  ];

  const toneOptions = [
    { description: "Bubbly and playful", label: "Friendly", value: "friendly" },
    {
      description: "Professional yet approachable",
      label: "Balanced",
      value: "balanced",
    },
    {
      description: "Direct and concise",
      label: "Efficient",
      value: "efficient",
    },
  ];

  const artifactTypes = [
    {
      description: "Documents, essays, articles",
      icon: FileText,
      label: "Text",
      value: "text",
    },
    {
      description: "Code snippets, scripts, functions",
      icon: FileCode,
      label: "Code",
      value: "code",
    },
    {
      description: "Spreadsheets, tables, data",
      icon: Table,
      label: "Sheet",
      value: "sheet",
    },
  ];

  if (!open) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fade-in fixed inset-0 z-50 animate-in bg-black/50 duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center p-4">
        <div
          className="fade-in zoom-in-95 pointer-events-auto flex max-h-[90vh] w-full max-w-2xl animate-in flex-col overflow-hidden rounded-lg border bg-background shadow-lg duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b bg-background px-6 py-4">
            <div>
              <h2 className="font-semibold text-lg">AI Personalization</h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Customize how the AI assistant works for you
              </p>
            </div>
            <Button
              className="-mt-1 h-8 w-8"
              onClick={() => onOpenChange(false)}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs className="w-full" defaultValue="general">
              <div className="border-b px-6">
                <TabsList className="h-auto w-full justify-start bg-transparent p-0">
                  <TabsTrigger className="gap-2" value="general">
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
                  <TabsTrigger className="gap-2" value="skills">
                    <Zap className="h-4 w-4" />
                    Skills
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* General Tab */}
              <TabsContent className="mt-0 space-y-6 p-6" value="general">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI Personalization</Label>
                      <p className="mt-1 text-muted-foreground text-xs">
                        Enable personalized AI responses based on your
                        preferences
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        onPersonalizationToggle?.(!personalizationEnabled)
                      }
                      size="sm"
                      variant={personalizationEnabled ? "primary" : "outline"}
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
                      className="w-full"
                      onValueChange={(value) => {
                        if (value) {
                          const newFormData = {
                            ...formData,
                            proficiency: value,
                          };
                          setFormData(newFormData);
                          autoSave(newFormData);
                        }
                      }}
                      type="single"
                      value={formData.proficiency}
                    >
                      {proficiencyOptions.map((option) => (
                        <ToggleGroupItem
                          className="flex-1"
                          key={option.value}
                          value={option.value}
                        >
                          <div className="text-center">
                            <div className="font-medium text-sm">
                              {option.label}
                            </div>
                            <div className="mt-0.5 text-muted-foreground text-xs">
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
                      className="w-full"
                      onValueChange={(value) => {
                        if (value) {
                          const newFormData = { ...formData, ai_tone: value };
                          setFormData(newFormData);
                          autoSave(newFormData);
                        }
                      }}
                      type="single"
                      value={formData.ai_tone}
                    >
                      {toneOptions.map((option) => (
                        <ToggleGroupItem
                          className="flex-1"
                          key={option.value}
                          value={option.value}
                        >
                          <div className="text-center">
                            <div className="font-medium text-sm">
                              {option.label}
                            </div>
                            <div className="mt-0.5 text-muted-foreground text-xs">
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
                    className="min-h-[100px] resize-none"
                    id="ai_guidance"
                    maxLength={4000}
                    onChange={(e) => {
                      const newFormData = {
                        ...formData,
                        ai_guidance: e.target.value,
                      };
                      setFormData(newFormData);
                      autoSave(newFormData);
                    }}
                    placeholder="Any specific preferences or instructions for the AI..."
                    value={formData.ai_guidance}
                  />
                </div>
              </TabsContent>

              {/* Conversation Tab
              <TabsContent value="conversation" className="p-6 mt-0 space-y-6">
                
              </TabsContent> */}

              {/* Generation Tab */}
              <TabsContent className="mt-0 space-y-6 p-6" value="generation">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Artifact Types</Label>
                    <p className="mb-3 text-muted-foreground text-xs">
                      Configure preferences for different types of generated
                      content
                    </p>
                    <div className="grid gap-3">
                      {artifactTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            className="flex items-start gap-3 rounded-lg border p-3"
                            key={type.value}
                          >
                            <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {type.label}
                              </div>
                              <div className="mt-0.5 text-muted-foreground text-xs">
                                {type.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="generation_guidance">
                      Generation Instructions
                    </Label>
                    <Textarea
                      className="min-h-[100px] resize-none"
                      id="generation_guidance"
                      maxLength={2000}
                      onChange={(e) => {
                        const newFormData = {
                          ...formData,
                          ai_guidance: e.target.value,
                        };
                        setFormData(newFormData);
                        autoSave(newFormData);
                      }}
                      placeholder="e.g., Use TypeScript, prefer functional programming, include comments"
                      value={formData.ai_guidance}
                    />
                    <p className="text-muted-foreground text-xs">
                      General instructions for how the AI should generate
                      content
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent className="mt-0 space-y-4 p-6" value="skills">
                <AnimatePresence mode="popLayout">
                  {skills.map((skill) => (
                    <motion.div
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                      exit={{ opacity: 0, scale: 0.95 }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      key={skill.id}
                    >
                      {editingSkillId === skill.id ? (
                        <div className="space-y-4 rounded-lg border p-4">
                          <div className="space-y-2">
                            <Label>Skill Name</Label>
                            <Input
                              onChange={(e) =>
                                setEditSkill({
                                  ...editSkill,
                                  name: e.target.value,
                                })
                              }
                              value={editSkill.name}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Command</Label>
                            <Input
                              className="font-mono"
                              onChange={(e) =>
                                setEditSkill({
                                  ...editSkill,
                                  command: e.target.value,
                                })
                              }
                              value={editSkill.command}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Prompt</Label>
                            <Textarea
                              className="min-h-[100px] font-mono text-xs"
                              onChange={(e) =>
                                setEditSkill({
                                  ...editSkill,
                                  prompt: e.target.value,
                                })
                              }
                              value={editSkill.prompt}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              onClick={handleCancelEdit}
                              size="sm"
                              variant="outline"
                            >
                              Cancel
                            </Button>
                            <Button
                              className="flex-1"
                              onClick={handleUpdateSkill}
                              size="sm"
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="group relative rounded-lg border bg-gradient-to-br from-background to-muted/20 p-4 transition-all hover:shadow-md">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <h4 className="font-semibold text-sm">
                                  {skill.name}
                                </h4>
                                <span className="rounded bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
                                  /{skill.command}
                                </span>
                              </div>
                              {!!skill.description && (
                                <p className="mb-2 text-muted-foreground text-xs">
                                  {skill.description}
                                </p>
                              )}
                              <p className="line-clamp-2 font-mono text-muted-foreground text-xs">
                                {skill.prompt}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                className="h-7 w-7"
                                onClick={() => handleStartEdit(skill)}
                                size="icon"
                                variant="ghost"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteSkill(skill.id)}
                                size="icon"
                                variant="ghost"
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
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                  initial={{ opacity: 0, y: 10 }}
                  key="skill-input"
                >
                  {learningSkillId && (isGeneratingPrompt || currentUIState) ? (
                    <div className="space-y-3">
                      {/* Loading state */}
                      {isGeneratingPrompt && !currentUIState && (
                        <div className="animate-pulse rounded-lg border bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-4">
                          <div className="flex items-center gap-3">
                            <Sparkles className="h-5 w-5 animate-spin text-primary" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                Learning skill...
                              </div>
                              <div className="mt-1 text-muted-foreground text-xs">
                                AI is analyzing your request
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Render UI components based on currentUIState */}
                      {!!currentUIState && (
                        <div className="space-y-3">
                          {currentUIState.type === "question" && (
                            <SkillQuestion
                              message={currentUIState.message}
                              onSelect={handleUIResponse}
                              options={currentUIState.options}
                            />
                          )}

                          {currentUIState.type === "variants" && (
                            <SkillVariants
                              message={currentUIState.message}
                              onSelect={handleUIResponse}
                              options={currentUIState.options}
                            />
                          )}

                          {currentUIState.type === "final-skill" &&
                            currentUIState.skill && (
                              <SkillPreview
                                isSaving={isSavingSkill}
                                onImprove={() =>
                                  handleImproveSkill(currentUIState.skill!)
                                }
                                onSave={() =>
                                  handleSaveSkill(currentUIState.skill!)
                                }
                                skill={currentUIState.skill}
                              />
                            )}

                          {currentUIState.type === "clarification" && (
                            <SkillClarification
                              message={currentUIState.message}
                              onSubmit={handleUIResponse}
                            />
                          )}

                          <Button
                            className="w-full"
                            onClick={handleCancelTraining}
                            size="sm"
                            variant="ghost"
                          >
                            Cancel Training
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        className="min-h-[100px] resize-none"
                        onChange={(e) => setNewSkillDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleLearnSkill(newSkillDescription);
                          }
                        }}
                        placeholder="What are you trying to accomplish? (e.g., 'boil a webpage down to a really simple sentence or two, extracting the main point or opinion')"
                        value={newSkillDescription}
                      />
                      <Button
                        className="w-full"
                        disabled={
                          isGeneratingPrompt || !newSkillDescription.trim()
                        }
                        onClick={() => handleLearnSkill(newSkillDescription)}
                        size="sm"
                      >
                        <Sparkles className="mr-2 h-3 w-3" />
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
