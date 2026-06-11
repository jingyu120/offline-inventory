import { useState } from 'react';
import { Platform } from 'react-native';
import {
  Box,
  Button,
  Card,
  Text,
  Theme,
  ThemedTextInput,
} from '@burma-inventory/ui-components';
import { useTheme } from '@shopify/restyle';
import { Sparkles } from 'lucide-react-native';
import { useTranslation } from '../../../core/i18n/i18n';
import { WEB_NO_OUTLINE } from './webStyles';

interface RawTextInputProps {
  rawText: string;
  setRawText: (text: string) => void;
  isParsingNote: boolean;
  onParse: () => void;
}

export function RawTextInput({
  rawText,
  setRawText,
  isParsingNote,
  onParse,
}: RawTextInputProps): React.JSX.Element {
  const theme = useTheme<Theme>();
  const { t } = useTranslation();
  const [textAreaFocused, setTextAreaFocused] = useState(false);

  return (
    <Card p="m" mb="m" borderColor="borderColor" borderWidth={1}>
      <Text variant="body" fontWeight="bold" mb="xs">
        {t('pasteRawOrderMessage')}
      </Text>
      <Text variant="caption" color="secondaryText" mb="s">
        {t('oneItemPerLineSub')}
      </Text>
      <ThemedTextInput
        multiline
        numberOfLines={4}
        value={rawText}
        onChangeText={setRawText}
        placeholder={t('viberPlaceholder')}
        placeholderTextColor={theme.colors.secondaryText}
        onFocus={() => setTextAreaFocused(true)}
        onBlur={() => setTextAreaFocused(false)}
        borderWidth={textAreaFocused ? 2 : 1}
        borderColor={textAreaFocused ? 'success' : 'borderColor'}
        bg="cardBackground"
        p="m"
        borderRadius="m"
        style={{
          color: theme.colors.primaryText,
          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
          textAlignVertical: 'top',
          ...WEB_NO_OUTLINE,
        }}
      />

      <Box mt="s">
        <Button
          title={'🪄 ' + t('autoDraftOrder')}
          variant="primary"
          onPress={onParse}
          isLoading={isParsingNote}
          icon={
            !isParsingNote ? (
              <Box mr="xs">
                <Sparkles size={16} stroke={theme.colors.primaryButtonText} />
              </Box>
            ) : undefined
          }
        />
      </Box>
    </Card>
  );
}
