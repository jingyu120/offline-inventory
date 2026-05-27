import React from 'react';
import { Linking, TouchableOpacity } from 'react-native';
import { Box, Text, Card, Theme } from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Contact } from '@burma-inventory/shared-types';
import { useTranslation } from '../../../core/i18n/i18n';
import { User, Phone } from 'lucide-react-native';

interface ContactsCardProps {
  shopContacts: Contact[];
  isDesktop: boolean;
}

export const ContactsCard: React.FC<ContactsCardProps> = ({
  shopContacts,
  isDesktop,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<Theme>();

  return (
    <Box>
      <Text variant="title" mb="s">
        {t('contacts')}
      </Text>
      <Box
        flexDirection="row"
        flexWrap="wrap"
        style={{ marginHorizontal: -8 }}
        mb="l"
      >
        {shopContacts.map((c) => (
          <Box key={c.id} width={isDesktop ? '50%' : '100%'} p="s">
            <Card
              p="m"
              borderLeftWidth={c.isPrimary ? 4 : 0}
              borderLeftColor="primaryButton"
            >
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                mb="s"
              >
                <Box flexDirection="row" alignItems="center">
                  <User
                    size={16}
                    stroke={theme.colors.secondaryText}
                    style={{ marginRight: 6 }}
                  />
                  <Text variant="body" fontWeight="bold">
                    {c.name}
                  </Text>
                </Box>
                {c.isPrimary && (
                  <Box bg="primaryButton" px="s" py="xs" borderRadius="s">
                    <Text
                      variant="badge"
                      color="primaryButtonText"
                      fontSize={10}
                    >
                      {t('primaryContact')}
                    </Text>
                  </Box>
                )}
              </Box>
              <TouchableOpacity
                onPress={() => Linking.openURL(`tel:${c.phoneNumber}`)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Phone
                  size={14}
                  stroke={theme.colors.primaryButton}
                  style={{ marginRight: 6 }}
                />
                <Text
                  variant="bodySecondary"
                  color="primaryButton"
                  style={{ textDecorationLine: 'underline' }}
                >
                  {c.phoneNumber}
                </Text>
              </TouchableOpacity>
            </Card>
          </Box>
        ))}
        {shopContacts.length === 0 && (
          <Box p="m">
            <Text variant="bodySecondary">{t('noContacts')}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
