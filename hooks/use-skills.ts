"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/utils";

/**
 * Skill type from API response
 */
export interface Skill {
  command: string;
  created_at?: string;
  description: string | null;
  id: string;
  name: string;
  prompt: string;
  updated_at?: string;
}

/**
 * Skill item for slash command menu
 */
export interface SkillItem {
  description: string | null;
  key: string;
  skill: Skill;
  text: string;
}

interface SkillsResponse {
  skills: Skill[];
}

/**
 * Hook to fetch user skills for slash command menu
 */
export function useSkills() {
  const { data, error, isLoading, mutate } = useSWR<SkillsResponse>(
    "/api/user/skills",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    error,
    isLoading,
    mutate,
    skills: data?.skills ?? [],
  };
}

/**
 * Convert skills to slash command items for the menu
 */
export function skillsToCommandItems(skills: Skill[]): SkillItem[] {
  return skills.map((skill) => ({
    description: skill.description,
    key: `skill-${skill.id}`,
    skill,
    text: `/${skill.command}`,
  }));
}
