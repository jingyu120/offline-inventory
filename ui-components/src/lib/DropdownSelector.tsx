import React, { useState } from 'react';
import {
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Box, Text } from './Primitives';
import { Card } from './Card';

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownSelectorProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  label,
  selectedValue,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelectOption = (val: string) => {
    onValueChange(val);
    setIsOpen(false);
  };

  // ── Web: use a native <select> for proper inline dropdown behavior ──────────
  // This avoids the full-screen Modal overlay that blocks the map/other content
  // and provides native browser dropdown UX (accessible, keyboard-friendly).
  if (Platform.OS === 'web') {
    return (
      <Box mb="s" width="100%">
        {label && (
          <Text
            variant="bodySecondary"
            fontWeight="bold"
            mb="xs"
            style={disabled ? { opacity: 0.6 } : undefined}
          >
            {label}
          </Text>
        )}
        <Box
          borderWidth={1}
          borderColor="borderColor"
          borderRadius="m"
          bg={disabled ? 'secondaryBackground' : 'cardBackground'}
          px="m"
          style={{ overflow: 'hidden', opacity: disabled ? 0.6 : 1 }}
        >
          <select
            {...({ testID: 'web-select' } as Record<string, unknown>)}
            value={selectedValue}
            disabled={disabled}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onValueChange(e.target.value)
            }
            style={{
              width: '100%',
              minHeight: 40,
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              color: selectedValue ? 'inherit' : '#9CA3AF',
              outline: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: 24,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
            }}
          >
            {!selectedValue && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Box>
      </Box>
    );
  }

  // ── Native (iOS / Android): keep the Modal picker ───────────────────────────
  return (
    <Box mb="s" width="100%">
      {label && (
        <Text
          variant="bodySecondary"
          fontWeight="bold"
          mb="xs"
          style={disabled ? { opacity: 0.6 } : undefined}
        >
          {label}
        </Text>
      )}

      {/* Selector Trigger Button */}
      <TouchableOpacity
        onPress={() => {
          if (!disabled) setIsOpen(true);
        }}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          borderWidth={1}
          borderColor="borderColor"
          borderRadius="m"
          bg={disabled ? 'secondaryBackground' : 'cardBackground'}
          px="m"
          py="s"
          minHeight={40}
          style={disabled ? { opacity: 0.6 } : undefined}
        >
          <Text
            variant="body"
            color={selectedOption ? 'primaryText' : 'secondaryText'}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Text variant="body" color="secondaryText">
            ▼
          </Text>
        </Box>
      </TouchableOpacity>

      {/* Selection Dialog Modal */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
          testID="modal-overlay"
        >
          <Pressable
            style={styles.modalCard}
            onPress={(e) => {
              if (e && e.stopPropagation) e.stopPropagation();
            }}
            testID="modal-card"
          >
            <Card
              m="none"
              p="m"
              bg="cardBackground"
              borderRadius="l"
              elevation={5}
              width="100%"
              height="100%"
            >
              {label && (
                <Box
                  borderBottomWidth={1}
                  borderColor="borderColor"
                  pb="s"
                  mb="s"
                >
                  <Text variant="title">{label}</Text>
                </Box>
              )}

              <ScrollView style={styles.scrollStyle}>
                {options.map((option) => {
                  const isSelected = option.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => handleSelectOption(option.value)}
                    >
                      <Box
                        py="s"
                        px="m"
                        my="xs"
                        borderRadius="m"
                        bg={isSelected ? 'secondaryBackground' : 'transparent'}
                      >
                        <Text
                          variant="body"
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          color={isSelected ? 'primaryButton' : 'primaryText'}
                        >
                          {option.label}
                        </Text>
                      </Box>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Box borderTopWidth={1} borderColor="borderColor" mt="m" pt="s">
                  <Text
                    variant="body"
                    fontWeight="bold"
                    color="danger"
                    textAlign="center"
                  >
                    Cancel
                  </Text>
                </Box>
              </TouchableOpacity>
            </Card>
          </Pressable>
        </TouchableOpacity>
      </Modal>
    </Box>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '75%',
  },
  scrollStyle: {
    marginVertical: 8,
  },
});
