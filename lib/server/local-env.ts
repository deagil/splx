import { promises as fs } from "node:fs";
import path from "node:path";

import { parse } from "dotenv";

const newlineSplitRegex = /\r?\n/;
const trailingNewlineRegex = /\n?$/;
const envKeyLineRegex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=.*$/;
const unquotedEnvValueRegex = /^[A-Za-z0-9_@./:-]+$/;

const ENV_FILE = path.join(process.cwd(), ".env.local");

type EnvUpdates = Record<string, string | undefined>;

export async function readLocalEnv(
  keys: readonly string[]
): Promise<Record<string, string | undefined>> {
  const content = await readEnvFile();
  const parsed = parse(content);
  const result: Record<string, string | undefined> = {};

  for (const key of keys) {
    result[key] = parsed[key] ?? process.env[key];
  }

  return result;
}

export async function upsertLocalEnv(updates: EnvUpdates): Promise<void> {
  if (Object.keys(updates).length === 0) {
    return;
  }

  const content = await readEnvFile();
  const lines = content.length > 0 ? content.split(newlineSplitRegex) : [];
  const keyIndex = buildKeyIndex(lines);

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    const formatted = `${key}=${formatEnvValue(value)}`;
    const index = keyIndex.get(key);
    if (index === undefined) {
      if (lines.length > 0 && lines.at(-1)?.trim() !== "") {
        lines.push("");
      }
      keyIndex.set(key, lines.length);
      lines.push(formatted);
    } else {
      lines[index] = formatted;
    }
  }

  const nextContent = lines.join("\n").replace(trailingNewlineRegex, "\n");
  await fs.writeFile(ENV_FILE, nextContent, "utf8");
}

async function readEnvFile(): Promise<string> {
  try {
    return await fs.readFile(ENV_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

function buildKeyIndex(lines: string[]): Map<string, number> {
  const index = new Map<string, number>();
  lines.forEach((line, i) => {
    const match = line.match(envKeyLineRegex);
    if (match) {
      index.set(match[1], i);
    }
  });

  return index;
}

function formatEnvValue(value: string): string {
  if (unquotedEnvValueRegex.test(value)) {
    return value;
  }

  const escaped = value.replace(/"/g, '\\"');
  return `"${escaped}"`;
}
