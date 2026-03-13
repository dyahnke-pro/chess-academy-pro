import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileChatDrawer({ isOpen, onClose, children }: MobileChatDrawerProps): JSX.Element {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="chat-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
            data-testid="chat-drawer-overlay"
          />

          {/* Drawer */}
          <motion.div
            key="chat-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.3 }}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 100 || info.velocity.x > 500) {
                onClose();
              }
            }}
            className="fixed inset-y-0 right-0 z-40 flex flex-col bg-theme-bg border-l border-theme-border shadow-xl"
            style={{
              width: '85vw',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            data-testid="mobile-chat-drawer"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
