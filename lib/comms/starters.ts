import type { EmailBlock, EmailTemplateVariable } from "@/lib/comms/types";

export type EmailStarterId = "welcome" | "order-received" | "notification";

export interface EmailStarter {
  blocks: EmailBlock[];
  description: string;
  id: EmailStarterId;
  name: string;
  previewText: string;
  slug: string;
  subject: string;
  variables: EmailTemplateVariable[];
}

export const EMAIL_STARTERS: EmailStarter[] = [
  {
    blocks: [
      {
        id: "welcome-header",
        title: "{{workspaceName}}",
        type: "header",
      },
      {
        id: "welcome-heading",
        level: 1,
        text: "Welcome, {{customer.firstName}}",
        type: "heading",
      },
      {
        id: "welcome-text",
        text: "Thanks for joining {{workspaceName}}. Your account is ready — get started whenever you are.",
        type: "text",
      },
      {
        id: "welcome-button",
        label: "Open your account",
        type: "button",
        url: "{{actionUrl}}",
      },
      {
        id: "welcome-footer",
        text: "If you did not create this account, you can ignore this email.",
        type: "footer",
      },
    ],
    description: "Onboarding welcome after account creation",
    id: "welcome",
    name: "Welcome",
    previewText: "Welcome to {{workspaceName}}",
    slug: "welcome",
    subject: "Welcome to {{workspaceName}}, {{customer.firstName}}",
    variables: [
      {
        key: "customer.firstName",
        label: "Customer first name",
        required: true,
        type: "string",
      },
      {
        key: "workspaceName",
        label: "Workspace / product name",
        required: true,
        type: "string",
      },
      {
        key: "actionUrl",
        label: "CTA URL",
        required: true,
        type: "url",
      },
    ],
  },
  {
    blocks: [
      {
        id: "order-header",
        title: "{{workspaceName}}",
        type: "header",
      },
      {
        id: "order-heading",
        level: 1,
        text: "Order received",
        type: "heading",
      },
      {
        id: "order-text",
        text: "Hi {{customer.firstName}}, we received order {{order.id}} for {{order.total}}.",
        type: "text",
      },
      {
        id: "order-button",
        label: "View order",
        type: "button",
        url: "{{orderUrl}}",
      },
      {
        id: "order-divider",
        type: "divider",
      },
      {
        id: "order-footer",
        text: "Questions? Just reply to this email.",
        type: "footer",
      },
    ],
    description: "Transactional confirmation when an order is placed",
    id: "order-received",
    name: "Order received",
    previewText: "Order {{order.id}} confirmed",
    slug: "order-received",
    subject: "Order {{order.id}} received",
    variables: [
      {
        key: "customer.firstName",
        label: "Customer first name",
        required: true,
        type: "string",
      },
      {
        key: "order.id",
        label: "Order ID",
        required: true,
        type: "string",
      },
      {
        key: "order.total",
        label: "Order total",
        required: true,
        type: "string",
      },
      {
        key: "orderUrl",
        label: "Order URL",
        required: true,
        type: "url",
      },
      {
        key: "workspaceName",
        label: "Workspace / product name",
        required: false,
        type: "string",
      },
    ],
  },
  {
    blocks: [
      {
        id: "notify-header",
        title: "{{workspaceName}}",
        type: "header",
      },
      {
        id: "notify-heading",
        level: 1,
        text: "{{title}}",
        type: "heading",
      },
      {
        id: "notify-text",
        text: "{{body}}",
        type: "text",
      },
      {
        id: "notify-button",
        label: "{{ctaLabel}}",
        type: "button",
        url: "{{ctaUrl}}",
      },
      {
        id: "notify-footer",
        text: "You received this because of activity in {{workspaceName}}.",
        type: "footer",
      },
    ],
    description: "Generic notification with title, body, and optional CTA",
    id: "notification",
    name: "Notification",
    previewText: "{{title}}",
    slug: "notification",
    subject: "{{title}}",
    variables: [
      {
        key: "title",
        label: "Title",
        required: true,
        type: "string",
      },
      {
        key: "body",
        label: "Body",
        required: true,
        type: "string",
      },
      {
        key: "ctaLabel",
        label: "Button label",
        required: false,
        type: "string",
      },
      {
        key: "ctaUrl",
        label: "Button URL",
        required: false,
        type: "url",
      },
      {
        key: "workspaceName",
        label: "Workspace / product name",
        required: false,
        type: "string",
      },
    ],
  },
];

export function getEmailStarter(id: string): EmailStarter | undefined {
  return EMAIL_STARTERS.find((starter) => starter.id === id);
}

/** Fresh block ids so each create gets unique section ids. */
export function cloneStarter(starter: EmailStarter): EmailStarter {
  return {
    ...starter,
    blocks: starter.blocks.map((block) => ({
      ...block,
      id: crypto.randomUUID(),
    })),
  };
}
