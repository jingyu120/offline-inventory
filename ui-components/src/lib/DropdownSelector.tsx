import React, { useState } from 'react';
import { Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  label,
  selectedValue,
  onValueChange,
  options,
  placeholder = 'Select an option...',
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
        <Text variant="bodySecondary" fontWeight="bold" mb="xs">
          {label}
        </Text>
      )}

      {/* Selector Trigger Button */}
      <TouchableOpacity onPress={() => setIsOpen(true)} activeOpacity={0.7}>
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          borderWidth={1}
          borderColor="borderColor"
          borderRadius="m"
          bg="cardBackground"
          px="m"
          py="s"
          minHeight={40}
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
          onPressOut={() => setIsOpen(false)}
        >
          <Card
            m="m"
            p="m"
            bg="cardBackground"
            borderRadius="l"
            elevation={5}
            width="90%"
            maxWidth={450}
            maxHeight="75%"
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

            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              style={styles.closeBtn}
            >
              <Text
                variant="body"
                fontWeight="bold"
                color="danger"
                textAlign="center"
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </Card>
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
  closeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
});
