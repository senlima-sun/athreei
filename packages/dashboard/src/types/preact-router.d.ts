declare module 'preact-router/match' {
  import type { ComponentChildren, JSX } from 'preact';

  export interface LinkProps extends JSX.HTMLAttributes<HTMLAnchorElement> {
    href: string;
    activeClassName?: string;
    children?: ComponentChildren;
  }

  export function Link(props: LinkProps): JSX.Element;
  export function Match(props: { path: string; children: (matches: boolean) => ComponentChildren }): JSX.Element;
}
