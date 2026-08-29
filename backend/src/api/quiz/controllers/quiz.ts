import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  
  // 1. FIND ONE (Support both id and documentId & deduplicate questions)
  async findOne(ctx) {
    const quizId = ctx.params.id;
    const quiz: any = await strapi.db.query('api::quiz.quiz').findOne({
      where: {
        $or: [
          { id: isNaN(Number(quizId)) ? -1 : Number(quizId) },
          { documentId: quizId },
        ],
      },
      populate: ['course', 'questions'],
    });

    if (!quiz) return ctx.notFound('Quiz not found');

    // Deduplicate questions by documentId (prefer published version)
    if (quiz.questions && Array.isArray(quiz.questions)) {
      const qMap = new Map();
      quiz.questions.forEach((q: any) => {
        const key = q.documentId || q.id || q.title;
        const existing = qMap.get(key);
        if (!existing || (!existing.publishedAt && q.publishedAt)) {
          qMap.set(key, q);
        }
      });
      quiz.questions = Array.from(qMap.values());
    }

    const sanitizedEntity = await (this as any).sanitizeOutput(quiz, ctx);
    return (this as any).transformResponse(sanitizedEntity);
  },

  // 2. FIND (Deduplicate questions on list find)
  async find(ctx) {
    const res = await super.find(ctx);
    const data = res?.data;
    if (!data || !Array.isArray(data)) return res;

    const quizDocIds = data.map((d: any) => d.documentId || d.id);
    const dbQuizzes = await strapi.db.query('api::quiz.quiz').findMany({
      where: { documentId: { $in: quizDocIds } },
      populate: ['course', 'questions'],
    });

    const enrichedData = data.map((d: any) => {
      const dbQ = dbQuizzes.find((item: any) => item.documentId === d.documentId || item.id === d.id);
      if (dbQ && dbQ.questions && Array.isArray(dbQ.questions)) {
        const qMap = new Map();
        dbQ.questions.forEach((q: any) => {
          const key = q.documentId || q.id || q.title;
          const existing = qMap.get(key);
          if (!existing || (!existing.publishedAt && q.publishedAt)) {
            qMap.set(key, q);
          }
        });
        return {
          ...d,
          questions: Array.from(qMap.values()),
        };
      }
      return d;
    });

    return { ...res, data: enrichedData };
  },

  // 3. CREATE
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
      const course: any = await strapi.db.query('api::course.course').findOne({
        where: {
          $or: [
            { id: isNaN(Number(data.course)) ? -1 : Number(data.course) },
            { documentId: data.course },
          ],
        },
        populate: ['instructor'],
      });
      
      if (!course) return ctx.notFound('Course not found.');
      if (course.instructor?.id !== user.id) {
        return ctx.unauthorized('You can only add quizzes to your own courses.');
      }
    }

    return super.create(ctx);
  },

  // 4. UPDATE
  async update(ctx) {
    const user = ctx.state.user;
    const quizId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const quiz: any = await strapi.db.query('api::quiz.quiz').findOne({
      where: {
        $or: [
          { id: isNaN(Number(quizId)) ? -1 : Number(quizId) },
          { documentId: quizId },
        ],
      },
      populate: { course: { populate: ['instructor'] } },
    });

    if (!quiz) return ctx.notFound('Quiz not found');

    if (roleName === 'Instructor' && quiz.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only edit quizzes from your own courses.');
    }

    return super.update(ctx);
  },

  // 5. DELETE
  async delete(ctx) {
    const user = ctx.state.user;
    const quizId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const quiz: any = await strapi.db.query('api::quiz.quiz').findOne({
      where: {
        $or: [
          { id: isNaN(Number(quizId)) ? -1 : Number(quizId) },
          { documentId: quizId },
        ],
      },
      populate: { course: { populate: ['instructor'] } },
    });

    if (!quiz) return ctx.notFound('Quiz not found');

    if (roleName === 'Instructor' && quiz.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only delete quizzes from your own courses.');
    }

    return super.delete(ctx);
  }
}));