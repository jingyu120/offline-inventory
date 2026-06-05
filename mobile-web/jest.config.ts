export default {
  displayName: 'mobile-web',
  preset: 'react-native',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../coverage/mobile-web',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@shopify|lucide-react-native|@react-native-community)/)',
  ],
};
