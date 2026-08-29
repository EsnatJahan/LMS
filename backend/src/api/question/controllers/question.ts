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

    // Find quiz by id or documentId
    const quiz: any = await strapi.db.query('api::quiz.quiz').findOne({
      where: {
        $or: [
          { id: isNaN(Number(data.quiz)) ? -1 : Number(data.quiz) },
          { documentId: data.quiz },
        ],
      },
      populate: { course: { populate: ['instructor'] } },
    });

    if (!quiz) return ctx.notFound('Quiz not found.');

    // If Instructor, verify ownership of course containing the quiz
    if (roleName === 'Instructor') {
      if (quiz.course?.instructor?.id !== user.id) {
        return ctx.unauthorized('You can only add questions to quizzes on your own courses.');
      }
    }

    try {
      const created = await strapi.entityService.create('api::question.question', {
        data: {
          title: data.title,
          options: data.options,
          correctAnswer: data.correctAnswer,
          quiz: quiz.id,
          publishedAt: new Date(),
        },
        populate: ['quiz'],
      });

      const sanitizedEntity = await (this as any).sanitizeOutput(created, ctx);
      return (this as any).transformResponse(sanitizedEntity);
    } catch (error: any) {
      console.error('Question Create Error:', error);
      return ctx.internalServerError('Failed to create quiz question');
    }
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

    const question: any = await strapi.db.query('api::question.question').findOne({
      where: {
        $or: [
          { id: isNaN(Number(questionId)) ? -1 : Number(questionId) },
          { documentId: questionId },
        ],
      },
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

    const question: any = await strapi.db.query('api::question.question').findOne({
      where: {
        $or: [
          { id: isNaN(Number(questionId)) ? -1 : Number(questionId) },
          { documentId: questionId },
        ],
      },
      populate: { quiz: { populate: { course: { populate: ['instructor'] } } } },
    });

    if (!question) return ctx.notFound('Question not found');

    if (roleName === 'Instructor' && question.quiz?.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only delete questions from your own courses.');
    }

    try {
      await strapi.db.query('api::question.question').deleteMany({
        where: { documentId: question.documentId },
      });
      return ctx.send({ message: 'Question deleted successfully' });
    } catch (error: any) {
      return ctx.internalServerError('Failed to delete question');
    }
  },
}));
