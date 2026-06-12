import React from 'react';
import { Modal, Pressable } from 'react-native';
import { Box } from './Primitives';
import { useResponsive } from './useResponsive';

const OVERLAY_BACKGROUND = 'rgba(15, 23, 42, 0.55)';

export interface ModalSheetProps {
  visible: boolean;
  /** Fired on Android back button and (when `dismissOnBackdrop`) backdrop taps. */
  onRequestClose?: () => void;
  children: React.ReactNode;
  /**
   * Max card width on tablet and up. On phones the card always spans the full
   * width (minus a small inset) so it can never overflow a narrow screen.
   */
  maxWidth?: number;
  /** Fraction of viewport height the card may occupy before its body scrolls. */
  maxHeightRatio?: number;
  animationType?: 'slide' | 'fade' | 'none';
  /** Tap outside the card to dismiss (requires `onRequestClose`). */
  dismissOnBackdrop?: boolean;
}

/**
 * Responsive modal container. Centers a card on tablet/desktop (capped at
 * `maxWidth`) and lets it span the full width (minus a small inset) on phones,
 * so modal content is never clipped or pushed off-screen regardless of viewport
 * size. Callers provide the inner content (header, body, actions) as children.
 */
export function ModalSheet({
  visible,
  onRequestClose,
  children,
  maxWidth = 480,
  maxHeightRatio = 0.9,
  animationType = 'slide',
  dismissOnBackdrop = false,
}: ModalSheetProps): React.ReactElement {
  const { height, isPhone } = useResponsive();

  const card = (
    <Box
      width="100%"
      alignSelf="center"
      bg="cardBackground"
      style={{
        maxWidth: isPhone ? undefined : maxWidth,
        maxHeight: Math.round(height * maxHeightRatio),
        borderRadius: 16,
        elevation: 10,
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );

  const canDismiss = dismissOnBackdrop && !!onRequestClose;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      <Box
        flex={1}
        style={{ backgroundColor: OVERLAY_BACKGROUND }}
        justifyContent="center"
        alignItems="center"
        px={isPhone ? 's' : 'm'}
        py="m"
      >
        {canDismiss && (
          <Pressable
            onPress={onRequestClose}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />
        )}
        {card}
      </Box>
    </Modal>
  );
}
