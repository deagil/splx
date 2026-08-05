import cn from "classnames";
import { LoaderIcon } from "../shared/icons";

interface ImageEditorProps {
  content: string;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  isInline: boolean;
  status: string;
  title: string;
}

export function ImageEditor({
  title,
  content,
  status,
  isInline,
}: ImageEditorProps) {
  return (
    <div
      className={cn("flex w-full flex-row items-center justify-center", {
        "h-[200px]": isInline,
        "h-[calc(100dvh-60px)]": !isInline,
      })}
    >
      {status === "streaming" ? (
        <div className="flex flex-row items-center gap-4">
          {!isInline && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
          <div>Generating Image...</div>
        </div>
      ) : (
        <picture>
          {/** biome-ignore lint/nursery/useImageSize: "Generated image without explicit size" */}
          <img
            alt={title}
            className={cn("h-fit w-full max-w-[800px]", {
              "p-0 md:p-20": !isInline,
            })}
            src={`data:image/png;base64,${content}`}
          />
        </picture>
      )}
    </div>
  );
}
