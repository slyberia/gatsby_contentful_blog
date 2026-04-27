declare module "react-dom" {
  import * as React from "react";

  export function render(
    element: React.ReactElement,
    container: Element | DocumentFragment | null
  ): void;
}
