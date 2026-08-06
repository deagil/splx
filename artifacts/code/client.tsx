import { toast } from "sonner";
import { Artifact } from "@/components/artifact/create-artifact";
import { CodeEditor } from "@/components/editor/code-editor";
import {
  Console,
  type ConsoleOutput,
  type ConsoleOutputContent,
} from "@/components/shared/console";
import {
  CopyIcon,
  LogsIcon,
  MessageIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/shared/icons";
import { generateUUID } from "@/lib/utils";

const OUTPUT_HANDLERS = {
  basic: `
    # Basic output capture setup
  `,
  matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
                plt.gcf().set_dpi(100)

            png_buf = io.BytesIO()
            plt.savefig(png_buf, format='png')
            png_buf.seek(0)
            png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
            print(f'data:image/png;base64,{png_base64}')
            png_buf.close()

            plt.clf()
            plt.close('all')

        plt.show = custom_show
  `,
};

function detectRequiredHandlers(code: string): string[] {
  const handlers: string[] = ["basic"];

  if (code.includes("matplotlib") || code.includes("plt.")) {
    handlers.push("matplotlib");
  }

  return handlers;
}

const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/";
const PYODIDE_SCRIPT_URL = `${PYODIDE_INDEX_URL}pyodide.js`;

interface PyodideInstance {
  loadPackagesFromImports: (
    code: string,
    options: { messageCallback: (message: string) => void }
  ) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (output: string) => void }) => void;
}

type LoadPyodide = (config: { indexURL: string }) => Promise<PyodideInstance>;

type PyodideGlobal = typeof globalThis & {
  loadPyodide?: LoadPyodide;
};

let pyodideScriptPromise: Promise<void> | null = null;

function ensurePyodideScript(): Promise<void> {
  const { loadPyodide } = globalThis as PyodideGlobal;
  if (loadPyodide) {
    return Promise.resolve();
  }

  if (pyodideScriptPromise) {
    return pyodideScriptPromise;
  }

  pyodideScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PYODIDE_SCRIPT_URL}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Pyodide")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PYODIDE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pyodide"));
    document.head.appendChild(script);
  });

  return pyodideScriptPromise;
}

async function loadPyodideRuntime() {
  await ensurePyodideScript();
  const { loadPyodide } = globalThis as PyodideGlobal;
  if (!loadPyodide) {
    throw new Error("Pyodide failed to initialize");
  }
  return loadPyodide({ indexURL: PYODIDE_INDEX_URL });
}

interface Metadata {
  outputs: ConsoleOutput[];
}

export const codeArtifact = new Artifact<"code", Metadata>({
  actions: [
    {
      description: "Execute code",
      icon: <PlayIcon size={18} />,
      label: "Run",
      onClick: async ({ content, setMetadata }) => {
        const runId = generateUUID();
        const outputContent: ConsoleOutputContent[] = [];

        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs,
            {
              contents: [],
              id: runId,
              status: "in_progress",
            },
          ],
        }));

        try {
          const currentPyodideInstance = await loadPyodideRuntime();

          currentPyodideInstance.setStdout({
            batched: (output: string) => {
              outputContent.push({
                type: output.startsWith("data:image/png;base64")
                  ? "image"
                  : "text",
                value: output,
              });
            },
          });

          await currentPyodideInstance.loadPackagesFromImports(content, {
            messageCallback: (message: string) => {
              setMetadata((metadata) => ({
                ...metadata,
                outputs: [
                  ...metadata.outputs.filter((output) => output.id !== runId),
                  {
                    contents: [{ type: "text", value: message }],
                    id: runId,
                    status: "loading_packages",
                  },
                ],
              }));
            },
          });

          const requiredHandlers = detectRequiredHandlers(content);
          for (const handler of requiredHandlers) {
            if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
              await currentPyodideInstance.runPythonAsync(
                OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]
              );

              if (handler === "matplotlib") {
                await currentPyodideInstance.runPythonAsync(
                  "setup_matplotlib_output()"
                );
              }
            }
          }

          await currentPyodideInstance.runPythonAsync(content);

          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                contents: outputContent,
                id: runId,
                status: "completed",
              },
            ],
          }));
        } catch (error: any) {
          setMetadata((metadata) => ({
            ...metadata,
            outputs: [
              ...metadata.outputs.filter((output) => output.id !== runId),
              {
                contents: [{ type: "text", value: error.message }],
                id: runId,
                status: "failed",
              },
            ],
          }));
        }
      },
    },
    {
      description: "View Previous version",
      icon: <UndoIcon size={18} />,
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
    },
    {
      description: "View Next version",
      icon: <RedoIcon size={18} />,
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
    },
    {
      description: "Copy code to clipboard",
      icon: <CopyIcon size={18} />,
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],
  content: ({ metadata, setMetadata, ...props }) => (
    <>
      <div className="px-1">
        <CodeEditor {...props} />
      </div>

      {!!metadata?.outputs && (
        <Console
          consoleOutputs={metadata.outputs}
          setConsoleOutputs={() => {
            setMetadata({
              ...metadata,
              outputs: [],
            });
          }}
        />
      )}
    </>
  ),
  description:
    "Useful for code generation; Code execution is only available for python code.",
  initialize: ({ setMetadata }) => {
    setMetadata({
      outputs: [],
    });
  },
  kind: "code",
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === "data-codeDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible:
          draftArtifact.status === "streaming" &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: "streaming",
      }));
    }
  },
  toolbar: [
    {
      description: "Add comments",
      icon: <MessageIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          parts: [
            {
              text: "Add comments to the code snippet for understanding",
              type: "text",
            },
          ],
          role: "user",
        });
      },
    },
    {
      description: "Add logs",
      icon: <LogsIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          parts: [
            {
              text: "Add logs to the code snippet for debugging",
              type: "text",
            },
          ],
          role: "user",
        });
      },
    },
  ],
});
