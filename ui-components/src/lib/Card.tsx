import React from 'react';
import { Platform } from 'react-native';
import { Box } from './Primitives';
import { BoxProps } from '@shopify/restyle';
import { Theme } from './theme';

export interface CardProps extends React.PropsWithChildren, BoxProps<Theme> {
  elevation?: number;
}

export function Card({ children, elevation = 1, ...rest }: CardProps) {
  return (
    <Box
      bg="cardBackground"
      borderRadius="l"
      p="m"
      my="s"
      borderWidth={1}
      borderColor="borderColor"
      elevation={elevation}
      style={
        Platform.OS === 'web'
          ? { boxShadow: '0px 4px 12px rgba(0,0,0,0.04)' }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
            }
      }
      {...rest}
    >
      {children}
    </Box>
  );
}
