import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@shopify/restyle';
import { Table, ColumnDef } from './Table';
import { theme } from './theme';

interface MockData {
  id: string;
  name: string;
  age: number;
}

describe('Table', () => {
  const data: MockData[] = [
    { id: '1', name: 'Alice', age: 25 },
    { id: '2', name: 'Bob', age: 30 },
  ];

  const columns: ColumnDef<MockData>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'age',
      header: 'Age',
      render: (item) => <Text>{item.age} years</Text>,
    },
    {
      key: 'id',
      header: 'Custom ID',
      renderCell: (item) => <Text>ID-{item.id}</Text>,
    },
  ];

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  it('renders headers and row values correctly', () => {
    const { getByText } = renderWithTheme(
      <Table data={data} columns={columns} keyExtractor={(item) => item.id} />,
    );

    // Headers
    expect(getByText('Name')).toBeTruthy();
    expect(getByText('Age')).toBeTruthy();
    expect(getByText('Custom ID')).toBeTruthy();

    // Alice basic value row
    expect(getByText('Alice')).toBeTruthy();

    // Bob render function row
    expect(getByText('30 years')).toBeTruthy();

    // RenderCell custom renderer
    expect(getByText('ID-1')).toBeTruthy();
    expect(getByText('ID-2')).toBeTruthy();
  });
});
