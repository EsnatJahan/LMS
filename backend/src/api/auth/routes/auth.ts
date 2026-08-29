export default {
  routes: [
    {
      method: 'POST',
      path: '/custom-auth/register',
      handler: 'auth.register',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/custom-auth/login',
      handler: 'auth.login',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/custom-auth/me',
      handler: 'auth.me',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

