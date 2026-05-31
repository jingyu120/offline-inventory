import React from 'react';
import { FlatList, Platform, ScrollView } from 'react-native';
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
  minWidth?: number | `${number}%`;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  minWidth = 600,
}: TableProps<T>) {
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
        minWidth={minWidth}
        bg="cardBackground"
        borderRadius="m"
        p="m"
        elevation={1}
        style={
          Platform.OS === 'web'
            ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.03)' }
            : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
              }
        }
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
