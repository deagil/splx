import type React from "react";
import type {
  FieldMetadata,
  RelationshipConfig,
  RLSPolicyGroup,
  TableConfig,
} from "@/lib/server/tables/schema";

// Re-export types for convenience
export type { FieldMetadata, RelationshipConfig, RLSPolicyGroup, TableConfig };

export type TableType = "new" | "view" | "import";

export interface WizardState {
  autoGeneratePages: boolean;
  baseTableId: string | null; // For view type
  currentStep: number;
  description: string;
  fields: FieldMetadata[];
  id: string;
  name: string;
  policyGroup: string | null; // Policy group ID
  relationships: RelationshipConfig[];
  tableType: TableType | null;
  validationErrors: Record<number, string[]>;
}

export interface WizardStep {
  component: React.ComponentType<WizardStepProps>;
  description: string;
  id: number;
  title: string;
}

export interface WizardStepProps {
  goToStep: (step: number) => void;
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

export const TOTAL_STEPS = 6;
