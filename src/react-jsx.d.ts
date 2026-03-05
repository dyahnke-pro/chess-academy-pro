// Re-export JSX namespace globally for React 19 compatibility.
// React 19 removed the global JSX namespace; this restores it
// so existing `: JSX.Element` return types continue to work.
import type { JSX as ReactJSX } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = ReactJSX.Element;
    type IntrinsicElements = ReactJSX.IntrinsicElements;
    type ElementClass = ReactJSX.ElementClass;
  }
}
