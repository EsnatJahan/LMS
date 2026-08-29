import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::question.question', ({ strapi }) => ({
  
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student' || roleName === 'Authenticated') {
      return ctx.forbidden('Students cannot create quiz questions.');
    }

    const { data } = ctx.request.body || {};
    if (!data || !data.quiz) {
      return ctx.badRequest('A quiz ID is required to add a question.');
    }

    // If Instructor, verify ownership of the course containing the quiz
    if (roleName === 'Instructor') {
      const quiz: any = await strapi.entityService.findOne('api::quiz.quiz', data.quiz, {
        populate: { course: { populate: ['instructor'] } },
      });

      if (!quiz) return ctx.notFound('Quiz not found.');
      if (quiz.course?.instructor?.id !== user.id) {
        return ctx.unauthorized('You can only add questions to quizzes on your own courses.');
      }
    }

    return super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user;
    const questionId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student' || roleName === 'Authenticated') return ctx.forbidden();

    const question: any = await strapi.entityService.findOne('api::question.question', questionId, {
      populate: { quiz: { populate: { course: { populate: ['instructor'] } } } },
    });

    if (!question) return ctx.notFound('Question not found');

    if (roleName === 'Instructor' && question.quiz?.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only edit questions from your own courses.');
    }

    return super.update(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.user;
    const questionId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student' || roleName === 'Authenticated') return ctx.forbidden();

    const question: any = await strapi.entityService.findOne('api::question.question', questionId, {
      populate: { quiz: { populate: { course: { populate: ['instructor'] } } } },
    });

    if (!question) return ctx.notFound('Question not found');

    if (roleName === 'Instructor' && question.quiz?.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only delete questions from your own courses.');
    }

    return super.delete(ctx);
  },
}));
