import React from 'react';
import { Platform } from 'react-native';
import { Box } from './Primitives';
export function Card({ children, elevation = 2, ...rest }) {
  return (
    <Box
      bg="cardBackground"
      borderRadius="l"
      p="m"
      my="s"
      elevation={elevation}
      style={
        Platform.OS === 'web'
          ? {
              boxShadow: `0px 2px ${elevation * 1.5}px rgba(0,0,0,${elevation * 0.05})`,
            }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: elevation * 0.05,
              shadowRadius: elevation * 1.5,
            }
      }
      {...rest}
    >
      {children}
    </Box>
  );
}
//# sourceMappingURL=Card.js.map
