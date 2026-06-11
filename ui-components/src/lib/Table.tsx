import React from 'react';
import { FlatList, ScrollView } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Box, Text } from './Primitives';
import { Theme } from './theme';
import { getShadowStyle } from './shadows';

export interface ColumnDef<T> {
  key: string;
  header: string;
  width?: number;
  flex?: number;
  render?: (item: T) => React.ReactNode;
  renderCell?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  minWidth?: number | `${number}%`;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  minWidth,
}: TableProps<T>) {
  const theme = useTheme<Theme>();
  const resolvedMinWidth = minWidth ?? theme.layout.minTableWidth;
  const renderHeader = () => (
    <Box
      flexDirection="row"
      borderBottomWidth={1}
      borderBottomColor="borderColor"
      paddingBottom="m"
      marginBottom="s"
    >
      {columns.map((col) => (
        <Box
          key={col.key}
          width={col.width}
          flex={col.flex || (col.width ? undefined : 1)}
          px="s"
          justifyContent="center"
        >
          <Text
            variant="bodySecondary"
            fontWeight="700"
            color="secondaryText"
            style={{
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              fontSize: 11,
            }}
          >
            {col.header}
          </Text>
        </Box>
      ))}
    </Box>
  );

  const renderRow = ({ item }: { item: T }) => (
    <Box
      flexDirection="row"
      borderBottomWidth={1}
      borderBottomColor="borderColor"
      py="m"
      alignItems="center"
    >
      {columns.map((col) => (
        <Box
          key={col.key}
          width={col.width}
          flex={col.flex || (col.width ? undefined : 1)}
          px="s"
        >
          {col.render ? (
            col.render(item)
          ) : col.renderCell ? (
            col.renderCell(item)
          ) : (
            <Text variant="body">
              {String((item as Record<string, unknown>)[col.key] ?? '')}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );

  return (
    <ScrollView
      horizontal
      bounces={false}
      contentContainerStyle={{ flexGrow: 1, minWidth: '100%' }}
    >
      <Box
        flex={1}
        minWidth={resolvedMinWidth}
        bg="cardBackground"
        borderRadius="m"
        p="m"
        elevation={1}
        style={getShadowStyle('table')}
      >
        {renderHeader()}
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          scrollEnabled={false}
        />
      </Box>
    </ScrollView>
  );
}
