declare module "bun:test" {
  export const test: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: (actual: unknown) => {
    toBe: (expected: unknown) => void;
  };
}
