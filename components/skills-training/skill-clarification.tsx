"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SkillClarificationProps = {
  message: string;
  onSubmit: (response: string) => void;
};

export function SkillClarification({
  message,
  onSubmit,
}: SkillClarificationProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const response = formData.get("response") as string;
    if (response?.trim()) {
      onSubmit(response.trim());
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
      <p className="text-sm font-medium">{message}</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          name="response"
          placeholder="Type your response here..."
          className="min-h-[80px] resize-none"
          required
        />
        <Button type="submit" size="sm" className="w-full">
          Submit
        </Button>
      </form>
    </div>
  );
}


