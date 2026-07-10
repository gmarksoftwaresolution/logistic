import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  variant?: 'modal' | 'drawer';
  size?: 'full' | 'lg' | 'md' | 'sm';
  hideHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  variant = 'modal',
  size,
  hideHeader = false,
}) => {
  // Disable body scroll when modal/drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const drawerVariants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
  };

  const modalVariants = {
    hidden: { scale: 0.95, opacity: 0, y: 20 },
    visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 250 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Center popup */}
          {variant === 'modal' && (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`relative bg-white rounded-3xl shadow-2xl p-6 mx-4 z-10 border border-slate-200 overflow-y-auto max-h-[95vh] ${
                size === 'full'
                  ? 'max-w-6xl w-full'
                  : size === 'lg'
                  ? 'max-w-3xl w-full'
                  : size === 'md'
                  ? 'max-w-xl w-full'
                  : size === 'sm'
                  ? 'max-w-md w-full'
                  : 'max-w-lg w-full'
              }`}
            >
              {!hideHeader && (
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-[#073318]">{title}</h3>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              <div className="mt-4">{children}</div>
            </motion.div>
          )}

          {/* Drawer Right side panel */}
          {variant === 'drawer' && (
            <motion.div
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`absolute right-0 top-0 bottom-0 bg-white shadow-2xl p-6 z-10 border-l border-slate-200 overflow-y-auto flex flex-col ${
                size === 'full'
                  ? 'w-full'
                  : size === 'lg'
                  ? 'w-full max-w-3xl'
                  : size === 'md'
                  ? 'w-full max-w-xl'
                  : size === 'sm'
                  ? 'w-full max-w-md'
                  : 'w-full max-w-xl'
              }`}
            >
              {!hideHeader && (
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                  <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              <div className="flex-1 mt-4">{children}</div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};