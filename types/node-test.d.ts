declare module "node:test" {
  export function describe(name: string, handler: () => any): void;
  export function it(name: string, handler: () => any): void;
}
