import React from 'react';
import { Box } from './Primitives';
export function Card({ children, elevation = 2, ...rest }) {
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
//# sourceMappingURL=Card.js.map
