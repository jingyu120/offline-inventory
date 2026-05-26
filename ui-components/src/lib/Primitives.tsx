import { createBox, createText } from '@shopify/restyle';
import { TextInput, TextInputProps } from 'react-native';
import { Theme } from './theme';

export const Box = createBox<Theme>();
export const Text = createText<Theme>();
export const ThemedTextInput = createBox<Theme, TextInputProps>(TextInput);
