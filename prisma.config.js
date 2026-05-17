module.exports = {
  schema: 'sync-server/prisma/schema.prisma',
  datasource: {
    url: 'postgresql://postgres:postgres@localhost:5432/inventory_db?schema=public&gssEncMode=disable',
  },
};
