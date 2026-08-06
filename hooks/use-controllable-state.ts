import * as React from "react";

type UseControllableStateParams<T> = {
  /** The controlled value. When `undefined`, the hook manages state internally. */
  prop?: T | undefined;
  /** The initial value used while uncontrolled. */
  defaultProp: T;
  /** Called whenever the value changes, in both controlled and uncontrolled mode. */
  onChange?: ((state: T) => void) | undefined;
};

/**
 * Local replacement for `@radix-ui/react-use-controllable-state`.
 *
 * Base UI has no equivalent hook — its primitives handle controlled/uncontrolled
 * internally and expose no standalone utility — so this was the one thing
 * blocking the removal of the last `@radix-ui/*` package. Behaviour matches the
 * Radix hook: `prop !== undefined` means controlled, `onChange` fires on every
 * real change, and the returned setter is stable and accepts an updater.
 */
export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>): [
  T,
  React.Dispatch<React.SetStateAction<T>>,
] {
  const [uncontrolled, setUncontrolled] = React.useState<T>(defaultProp);

  const isControlled = prop !== undefined;
  const value = (isControlled ? prop : uncontrolled) as T;

  // Latest-ref pattern: lets the setter stay referentially stable (consumers
  // put it in useMemo deps and pass it straight to onOpenChange) while still
  // reading current values. Written during render but never read during render.
  const latest = React.useRef({ isControlled, onChange, value });
  latest.current = { isControlled, onChange, value };

  const setValue = React.useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (next) => {
      const {
        value: current,
        isControlled: controlled,
        onChange: handler,
      } = latest.current;

      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next;

      if (!controlled) {
        setUncontrolled(resolved);
      }
      if (!Object.is(resolved, current)) {
        handler?.(resolved);
      }
    },
    []
  );

  return [value, setValue];
}
