module.exports = {
  schema: 'sync-server/prisma/schema.prisma',
  datasource: {
    url: 'postgresql://postgres:postgres@localhost:5433/inventory_db?schema=public&gssencmode=disable',
  },
};
