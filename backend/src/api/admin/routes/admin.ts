export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/stats',
      handler: 'admin.stats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/admin/users',
      handler: 'admin.users',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/admin/users/:id/role',
      handler: 'admin.updateRole',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};

