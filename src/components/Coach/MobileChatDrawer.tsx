import { useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';

interface MobileChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom-sheet drawer for mobile. Covers ~55% of the screen so the board
 * stays visible above. Drag the handle down to dismiss.
 * Content scrolls independently — only the handle triggers drag.
 */
export function MobileChatDrawer({ isOpen, onClose, children }: MobileChatDrawerProps): JSX.Element {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay — translucent so the board is still visible */}
          <motion.div
            key="chat-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
            data-testid="chat-drawer-overlay"
          />

          {/* Bottom sheet */}
          <motion.div
            ref={sheetRef}
            key="chat-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-40 flex flex-col rounded-t-2xl shadow-2xl"
            style={{
              height: '55vh',
              maxHeight: '55vh',
              background: 'var(--color-bg)',
              borderTop: '1px solid var(--color-border)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
            data-testid="mobile-chat-drawer"
          >
            {/* Drag handle — only this area initiates drag */}
            <div
              className="flex justify-center pt-2 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: 'var(--color-border)' }}
              />
            </div>

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
