import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson-progress.lesson-progress', ({ strapi }) => ({
  
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const { data } = ctx.request.body || {};
    if (!data || !data.lesson) {
      return ctx.badRequest('Lesson ID is required.');
    }

    // 1. BULLETPROOF LESSON CHECK: Find the real lesson whether frontend sent numeric ID or documentId
    const matchingLessons: any = await strapi.entityService.findMany('api::lesson.lesson', {
      filters: {
        $or: [
          { id: data.lesson },
          { documentId: data.lesson },
        ],
      },
      populate: ['course'],
    });

    if (!matchingLessons || matchingLessons.length === 0) {
      return ctx.badRequest('Lesson not found in the database.');
    }

    const realLesson = matchingLessons[0];
    const realLessonId = realLesson.id;

    // 2. Resolve course ID from lesson relation or payload
    let realCourseId = realLesson.course?.id;
    if (!realCourseId && data.course) {
      const matchingCourses: any = await strapi.entityService.findMany('api::course.course', {
        filters: {
          $or: [
            { id: data.course },
            { documentId: data.course },
          ],
        },
      });
      if (matchingCourses && matchingCourses.length > 0) {
        realCourseId = matchingCourses[0].id;
      }
    }

    // 3. Check if progress already exists for this user and lesson
    const existingProgress: any = await strapi.entityService.findMany('api::lesson-progress.lesson-progress', {
      filters: {
        users_permissions_user: user.id,
        lesson: realLessonId,
      },
    });

    if (existingProgress && existingProgress.length > 0) {
      return ctx.badRequest('You have already completed this lesson.');
    }

    try {
      // 4. Create the progress record with valid schema attributes
      const progress = await strapi.entityService.create('api::lesson-progress.lesson-progress', {
        data: {
          users_permissions_user: user.id,
          lesson: realLessonId,
          ...(realCourseId ? { course: realCourseId } : {}),
          completed: true,
          publishedAt: new Date(),
        },
        populate: ['lesson', 'course', 'users_permissions_user'],
      });

      const sanitizedEntity = await (this as any).sanitizeOutput(progress, ctx);
      return (this as any).transformResponse(sanitizedEntity);
    } catch (error: any) {
      console.error("Progress Error:", error);
      return ctx.internalServerError(error?.message || 'Failed to save progress.');
    }
  }
}));