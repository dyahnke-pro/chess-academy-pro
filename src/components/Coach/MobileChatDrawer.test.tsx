import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import { MobileChatDrawer } from './MobileChatDrawer';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MobileChatDrawer', () => {
  it('renders children when open', () => {
    render(
      <MobileChatDrawer isOpen onClose={vi.fn()}>
        <div data-testid="chat-content">Chat here</div>
      </MobileChatDrawer>,
    );

    expect(screen.getByTestId('mobile-chat-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('chat-content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <MobileChatDrawer isOpen={false} onClose={vi.fn()}>
        <div data-testid="chat-content">Chat here</div>
      </MobileChatDrawer>,
    );

    expect(screen.queryByTestId('mobile-chat-drawer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-content')).not.toBeInTheDocument();
  });

  it('renders overlay when open', () => {
    render(
      <MobileChatDrawer isOpen onClose={vi.fn()}>
        <div>Content</div>
      </MobileChatDrawer>,
    );

    expect(screen.getByTestId('chat-drawer-overlay')).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(
      <MobileChatDrawer isOpen onClose={onClose}>
        <div>Content</div>
      </MobileChatDrawer>,
    );

    screen.getByTestId('chat-drawer-overlay').click();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
