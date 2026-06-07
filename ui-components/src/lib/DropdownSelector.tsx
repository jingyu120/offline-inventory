import React, { useState } from 'react';
import {
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
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
