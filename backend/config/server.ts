import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  const defaultKeys = [
    'HmPtFDjojMVNYQGcXgLBCQ==',
    '2pa5JBuamkHoozs+6K7CeQ==',
    'zalCgWdtq0VOsiiwJpj3Hw==',
    'HRxRNEQS7aV+MJrMW6258g==',
  ];
  
  let appKeys: string[] = env.array('APP_KEYS', defaultKeys);
  if (!appKeys || appKeys.length === 0 || !appKeys[0]) {
    const rawKeys = env('APP_KEYS');
    if (rawKeys && typeof rawKeys === 'string') {
      appKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
    }
  }
  if (!appKeys || appKeys.length === 0 || !appKeys[0]) {
    appKeys = defaultKeys;
  }

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
      keys: appKeys,
    },
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };
};

export default config;
