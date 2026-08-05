import type { ReleaseNote } from "@/lib/types/releases";

export const release: ReleaseNote = {
  appVersion: "v0.4.0",

  author: {
    avatarSrc: "/releases/v0.4.0/dylan-avatar.png",
    name: "Dylan Gilchrist",
    role: "Founder",
    videoDuration: "2:30",
  },
  date: "2025-12-13T10:00:00-05:00",
  emailPreviewText:
    "The MVP is here! Workspaces, visual page builder, dynamic tables, and AI chat with mentions.",

  emailSubject: "Welcome to Suplex v0.4 - Your AI-Powered Data Workspace",
  issueNumber: "001",
  location: "Clackmannanshire, Scotland",
  previewImage: "/releases/v0.4.0/hero.png",
  publicationName: "Suplex Weekly",

  sections: [
    {
      content:
        "Welcome to the first release of Suplex! This is the MVP we've been working on, and we're excited to share it with friends and family for early testing. Suplex is an AI-powered data workspace that helps you build custom applications, manage data, and collaborate with your team.",
      type: "text",
      variant: "lead",
    },
    {
      content:
        "This release includes all the core features you need to get started: workspaces for team collaboration, a visual page builder, dynamic tables, and AI chat with contextual mentions. Let's take a tour of what you can do.",
      type: "text",
      variant: "muted",
    },

    // Workspaces Section
    {
      content: "Workspaces & Team Collaboration",
      level: 2,
      type: "heading",
    },
    {
      content:
        "Everything in Suplex starts with a workspace. Create a workspace for your team, invite members, and collaborate on data and pages together. Each workspace is isolated, so you can have separate environments for different projects or clients.",
      type: "text",
      variant: "paragraph",
    },
    {
      alt: "Creating and managing workspaces",
      browserFrame: true,
      caption: "Create workspaces and invite your team members",
      mediaType: "video",
      src: "/videos/report-generator.mp4",
      type: "media",
    },
    {
      items: [
        "Create multiple workspaces for different projects or teams",
        "Invite team members with customizable roles and permissions",
        "Role-based access control to manage who can view, edit, or admin",
        "Workspace settings for customization and configuration",
      ],
      type: "list",
    },

    // Tables Section
    {
      content: "Dynamic Tables",
      level: 2,
      type: "heading",
    },
    {
      content:
        "Tables are the foundation of your data in Suplex. Create custom tables with any fields you need, import data, and manage everything through an intuitive interface. It's like having a database without the complexity.",
      type: "text",
      variant: "paragraph",
    },
    {
      alt: "Creating and managing tables",
      browserFrame: true,
      caption: "Build custom tables with the fields you need",
      mediaType: "video",
      src: "/videos/table-metadata.mp4",
      type: "media",
    },
    {
      items: [
        "Create tables with custom fields (text, number, date, boolean, and more)",
        "AI-powered field generation - describe what you need and let AI create the schema",
        "Spreadsheet-like editing experience with inline editing",
        "Filter, sort, and search your data with ease",
      ],
      type: "list",
    },

    // Page Builder Section
    {
      content: "Visual Page Builder",
      level: 2,
      type: "heading",
    },
    {
      content:
        "Build custom pages without writing code. Our visual page builder lets you drag and drop blocks to create list views, detail pages, dashboards, and forms. Connect your pages to your tables and watch them come alive with real data.",
      type: "text",
      variant: "paragraph",
    },
    {
      alt: "Visual page builder interface",
      browserFrame: true,
      caption: "Drag and drop blocks to build custom pages",
      mediaType: "video",
      src: "/videos/page-editor.mp4",
      type: "media",
    },
    {
      content: "The page builder includes four powerful block types:",
      type: "text",
      variant: "muted",
    },
    {
      items: [
        "List Block - Display paginated table data with filtering and search",
        "Record Block - Show a single record in read, edit, or create mode",
        "Report Block - Visualize your data with charts and graphs",
        "Trigger Block - Add action buttons with confirmation dialogs",
      ],
      type: "list",
    },

    // AI Chat Section
    {
      content: "AI Chat with Mentions",
      level: 2,
      type: "heading",
    },
    {
      content:
        "This is where Suplex gets really powerful. Our AI chat understands your data. Use @ mentions to reference pages, tables, and records directly in your conversations. Ask questions about your data, get summaries, or have the AI help you analyze trends.",
      type: "text",
      variant: "paragraph",
    },
    {
      alt: "AI chat with mentions",
      browserFrame: true,
      caption:
        "Reference your data with @ mentions for contextual AI responses",
      mediaType: "video",
      src: "/videos/chat-sidebar.mp4",
      type: "media",
    },
    {
      items: [
        "@page - Reference all data from the current page",
        "@table - Pull in data from any table in your workspace",
        "@record - Reference specific records by selecting them",
        "Contextual responses that understand your actual data",
      ],
      type: "list",
    },

    // Getting Started Section
    {
      content: "Getting Started",
      level: 2,
      type: "heading",
    },
    {
      content: "Ready to dive in? Here's how to get started with Suplex:",
      type: "text",
      variant: "paragraph",
    },
    {
      items: [
        "Sign up and complete the onboarding to create your first workspace",
        "Head to Build > Data to create your first table",
        "Use the AI field generator to quickly scaffold your table schema",
        "Create a page and add blocks to display your data",
        "Open the AI chat and try mentioning your new table with @",
      ],
      type: "list",
    },
    {
      content:
        "This is just the beginning. We have a lot more planned, and your feedback will help shape what comes next. If you run into any issues or have ideas, please reach out - we'd love to hear from you.",
      type: "text",
      variant: "muted",
    },
  ],
  slug: "v0-4-0-mvp-friends-and-family",
  subtitle: "Your AI-powered data workspace is here",
  title: "Welcome to Suplex",
};
