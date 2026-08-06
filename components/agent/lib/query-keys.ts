export const queryKeys = {
  thread: (id: string) => ["threads", id] as const,
  threads: ["threads"] as const,
};
