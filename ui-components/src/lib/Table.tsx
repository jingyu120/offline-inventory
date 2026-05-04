import React from 'react';
import { FlatList, ScrollView } from 'react-native';
import { Box, Text } from './Primitives';

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
}

export function Table<T>({ data, columns, keyExtractor }: TableProps<T>) {
  const renderHeader = () => (
    <Box
      flexDirection="row"
      borderBottomWidth={2}
      borderBottomColor="borderColor"
      paddingBottom="s"
      marginBottom="s"
    >
      {columns.map((col) => (
        <Box
          key={col.key}
          width={col.width}
          flex={col.flex || (col.width ? undefined : 1)}
          px="s"
        >
          <Text variant="bodySecondary" fontWeight="bold">
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
    <ScrollView horizontal bounces={false}>
      <Box
        minWidth={600}
        bg="cardBackground"
        borderRadius="m"
        p="m"
        shadowColor="primaryText"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.05}
        shadowRadius={8}
        elevation={2}
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
