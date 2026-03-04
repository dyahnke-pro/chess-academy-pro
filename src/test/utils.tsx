import { type ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';

interface WrapperProps {
  children: ReactNode;
}

function AllProviders({ children }: WrapperProps): JSX.Element {
  return (
    <MemoryRouter>
      <MotionConfig transition={{ duration: 0 }}>
        {children}
      </MotionConfig>
    </MemoryRouter>
  );
}

function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
