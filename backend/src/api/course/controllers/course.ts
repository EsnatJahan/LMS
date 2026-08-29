import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    // Fetch user with their role
    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });

    const roleName = fullUser.role?.name;

    // Students cannot create courses
    if (roleName === 'Student') {
      return ctx.forbidden('Students cannot create courses.');
    }

    const { title, description } = ctx.request.body.data || {};

    try {
      const course = await strapi.entityService.create('api::course.course', {
        data: { title, description, instructor: user.id },
      });
      const sanitizedEntity = await (this as any).sanitizeOutput(course, ctx);
      return (this as any).transformResponse(sanitizedEntity);
    } catch (error) {
      return ctx.internalServerError('Failed to create course');
    }
  },

  async update(ctx) {
    const user = ctx.state.user;
    const courseId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const course: any = await strapi.entityService.findOne('api::course.course', courseId, {
      populate: ['instructor'],
    });

    if (!course) return ctx.notFound('Course not found');

    // If Instructor, enforce "Own only" rule. Content Managers bypass this.
    if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
      return ctx.unauthorized('Instructors can only edit their own courses.');
    }

    return super.update(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.user;
    const courseId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const course: any = await strapi.entityService.findOne('api::course.course', courseId, {
      populate: ['instructor'],
    });

    if (!course) return ctx.notFound('Course not found');

    // Enforce "Own only" rule for Instructors
    if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
      return ctx.unauthorized('Instructors can only delete their own courses.');
    }

    return super.delete(ctx);
  }
}));