import React from 'react';
import { Box } from './Primitives';
import { BoxProps } from '@shopify/restyle';
import { Theme } from './theme';

export interface CardProps extends React.PropsWithChildren, BoxProps<Theme> {
  elevation?: number;
}

export function Card({ children, elevation = 2, ...rest }: CardProps) {
  return (
    <Box
      bg="cardBackground"
      borderRadius="l"
      p="m"
      my="s"
      shadowColor="primaryText"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={elevation * 0.05}
      shadowRadius={elevation * 1.5}
      elevation={elevation}
      {...rest}
    >
      {children}
    </Box>
  );
}
