import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-result.quiz-result', ({ strapi }) => ({
  
  // 1. Submit and Auto-Grade Quiz
  async submit(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in to take a quiz.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });

    const roleName = fullUser.role?.name;
    if (roleName !== 'Student' && roleName !== 'Authenticated') {
      return ctx.forbidden('Only students can take quizzes and submit results.');
    }

    const { data } = ctx.request.body || {};
    if (!data || !data.quiz) {
      return ctx.badRequest('Quiz ID is required.');
    }

    const { quiz: quizIdentifier, answers = {} } = data;

    try {
      // 1. Find the real quiz
      const matchingQuizzes: any = await strapi.entityService.findMany('api::quiz.quiz', {
        filters: {
          $or: [
            { id: isNaN(Number(quizIdentifier)) ? -1 : Number(quizIdentifier) },
            { documentId: quizIdentifier },
          ],
        },
        populate: ['questions', 'course'],
      });

      if (!matchingQuizzes || matchingQuizzes.length === 0) {
        return ctx.notFound('Quiz not found.');
      }

      const realQuiz = matchingQuizzes[0];
      const realQuizId = realQuiz.id;

      // 2. Fetch all questions for this quiz
      const questions: any = await strapi.entityService.findMany('api::question.question', {
        filters: {
          quiz: realQuizId,
        },
      });

      if (!questions || questions.length === 0) {
        return ctx.badRequest('This quiz has no questions.');
      }

      // 3. Compute Auto-Graded Score
      let score = 0;
      const breakdown = questions.map((q: any) => {
        const studentAns = answers[q.id] || answers[q.documentId] || answers[String(q.id)] || answers[q.title] || '';
        const correctAns = q.correctAnswer || '';
        const isCorrect = Boolean(studentAns && correctAns && studentAns.toString().trim().toLowerCase() === correctAns.toString().trim().toLowerCase());

        if (isCorrect) {
          score++;
        }

        return {
          questionId: q.id,
          questionDocumentId: q.documentId,
          question: q.title,
          studentAnswer: studentAns,
          correctAnswer: correctAns,
          isCorrect,
        };
      });

      const total = questions.length;
      const percentage = Math.round((score / total) * 100);
      const passed = percentage >= 60;

      // 4. Save Quiz Result in Database
      const quizResult = await strapi.entityService.create('api::quiz-result.quiz-result', {
        data: {
          users_permissions_user: user.id,
          quiz: realQuizId,
          score,
          total,
          publishedAt: new Date(),
        },
        populate: ['quiz', 'users_permissions_user'],
      });

      return ctx.send({
        data: {
          id: quizResult.id,
          documentId: quizResult.documentId,
          score,
          total,
          percentage,
          passed,
          breakdown,
          quizTitle: realQuiz.title,
        },
      });
    } catch (error: any) {
      console.error('Quiz Submit Error:', error);
      return ctx.internalServerError(error?.message || 'Failed to submit quiz.');
    }
  },

  // 2. FIND (Role-scoped quiz results)
  async find(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    // Student: filter only own results
    if (roleName === 'Student' || roleName === 'Authenticated') {
      ctx.query = {
        ...ctx.query,
        filters: {
          ...(ctx.query.filters || {}),
          users_permissions_user: user.id,
        },
      };
    }

    return super.find(ctx);
  },
}));
