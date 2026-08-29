import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  
  // 1. CREATE
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') {
      return ctx.forbidden('Students cannot create quizzes.');
    }

    const { data } = ctx.request.body;
    if (!data || !data.course) {
      return ctx.badRequest('A course ID is required to create a quiz.');
    }

    // Instructors: Verify they own the course
    if (roleName === 'Instructor') {
      const course: any = await strapi.entityService.findOne('api::course.course', data.course, {
        populate: ['instructor'],
      });
      
      if (!course) return ctx.notFound('Course not found.');
      if (course.instructor?.id !== user.id) {
        return ctx.unauthorized('You can only add quizzes to your own courses.');
      }
    }

    return super.create(ctx);
  },

  // 2. UPDATE
  async update(ctx) {
    const user = ctx.state.user;
    const quizId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const quiz: any = await strapi.entityService.findOne('api::quiz.quiz', quizId, {
      populate: { course: { populate: ['instructor'] } },
    });

    if (!quiz) return ctx.notFound('Quiz not found');

    if (roleName === 'Instructor' && quiz.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only edit quizzes from your own courses.');
    }

    return super.update(ctx);
  },

  // 3. DELETE
  async delete(ctx) {
    const user = ctx.state.user;
    const quizId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const quiz: any = await strapi.entityService.findOne('api::quiz.quiz', quizId, {
      populate: { course: { populate: ['instructor'] } },
    });

    if (!quiz) return ctx.notFound('Quiz not found');

    if (roleName === 'Instructor' && quiz.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only delete quizzes from your own courses.');
    }

    return super.delete(ctx);
  }
}));