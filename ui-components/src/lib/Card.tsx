import React from 'react';
import { Box } from './Primitives';
import { BoxProps } from '@shopify/restyle';
import { Theme } from './theme';
import { getShadowStyle } from './shadows';

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
      style={getShadowStyle('card')}
      {...rest}
    >
      {children}
    </Box>
  );
}
