/**
 * enrollment router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::enrollment.enrollment');
//export default { routes: [ { method: 'POST', path: '/enrollments', handler: 'enrollment.create', config: { auth: true, }, }, ], };