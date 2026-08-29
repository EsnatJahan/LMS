import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      const actions = [
        'api::lesson-progress.lesson-progress.find',
        'api::lesson-progress.lesson-progress.findOne',
        'api::lesson-progress.lesson-progress.create',
        'api::lesson-progress.lesson-progress.update',
        'api::lesson-progress.lesson-progress.delete',
        'api::lesson.lesson.find',
        'api::lesson.lesson.findOne',
        'api::course.course.find',
        'api::course.course.findOne',
        'api::enrollment.enrollment.find',
        'api::enrollment.enrollment.findOne',
        'api::enrollment.enrollment.create',
      ];

      const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
      const authenticatedRole = roles.find((r: any) => r.type === 'authenticated' || r.name === 'Authenticated');
      const studentRole = roles.find((r: any) => r.type === 'student' || r.name === 'Student');

      const targetRoles = [authenticatedRole, studentRole].filter(Boolean);

      for (const role of targetRoles) {
        for (const action of actions) {
          let permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: { action, role: role.id },
          });

          if (!permission) {
            await strapi.db.query('plugin::users-permissions.permission').create({
              data: {
                action,
                role: role.id,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Bootstrap permissions error:', error);
    }
  },
};

