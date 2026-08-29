import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson-progress.lesson-progress', ({ strapi }) => ({
  
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const { data } = ctx.request.body;
    if (!data || !data.lesson || !data.course) {
      return ctx.badRequest('Lesson ID and Course ID are required.');
    }

    // 1. Check if progress already exists for this user and lesson
    const existingProgress: any = await strapi.entityService.findMany('api::lesson-progress.lesson-progress', {
      filters: {
        users_permissions_user: user.id,
        lesson: data.lesson,
      },
    });

    if (existingProgress.length > 0) {
      return ctx.badRequest('You have already completed this lesson.');
    }

    try {
      // 2. Create the progress record
      const progress = await strapi.entityService.create('api::lesson-progress.lesson-progress', {
        data: {
          users_permissions_user: user.id,
          lesson: data.lesson,
          course: data.course,
          isCompleted: true, // Assuming you have a boolean field for this
          publishedAt: new Date(),
        }
      });

      const sanitizedEntity = await (this as any).sanitizeOutput(progress, ctx);
      return (this as any).transformResponse(sanitizedEntity);
    } catch (error) {
      console.error("Progress Error:", error);
      return ctx.internalServerError('Failed to save progress.');
    }
  }
}));