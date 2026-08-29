import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS', [
      'HmPtFDjojMVNYQGcXgLBCQ==',
      '2pa5JBuamkHoozs+6K7CeQ==',
      'zalCgWdtq0VOsiiwJpj3Hw==',
      'HRxRNEQS7aV+MJrMW6258g==',
    ]),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
