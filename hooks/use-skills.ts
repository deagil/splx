"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/utils";

/**
 * Skill type from API response
 */
export type Skill = {
    id: string;
    name: string;
    command: string;
    description: string | null;
    prompt: string;
    created_at?: string;
    updated_at?: string;
};

/**
 * Skill item for slash command menu
 */
export type SkillItem = {
    key: string;
    text: string;
    description: string | null;
    skill: Skill;
};

type SkillsResponse = {
    skills: Skill[];
};

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
        },
    );

    return {
        skills: data?.skills ?? [],
        isLoading,
        error,
        mutate,
    };
}

/**
 * Convert skills to slash command items for the menu
 */
export function skillsToCommandItems(skills: Skill[]): SkillItem[] {
    return skills.map((skill) => ({
        key: `skill-${skill.id}`,
        text: `/${skill.command}`,
        description: skill.description,
        skill,
    }));
}
