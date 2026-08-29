import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
  
  // 1. CREATE (Check parent course ownership)
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') {
      return ctx.forbidden('Students cannot create lessons.');
    }

    const { data } = ctx.request.body;
    if (!data || !data.course) {
      return ctx.badRequest('A course ID is required to create a lesson.');
    }

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
        return ctx.unauthorized('You can only add lessons to your own courses.');
      }
    }

    return super.create(ctx);
  },

  // 2. UPDATE (Check parent course ownership)
  async update(ctx) {
    const user = ctx.state.user;
    const lessonId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const lesson: any = await strapi.db.query('api::lesson.lesson').findOne({
      where: {
        $or: [
          { id: isNaN(Number(lessonId)) ? -1 : Number(lessonId) },
          { documentId: lessonId },
        ],
      },
      populate: { course: { populate: ['instructor'] } },
    });

    if (!lesson) return ctx.notFound('Lesson not found');

    if (roleName === 'Instructor' && lesson.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only edit lessons from your own courses.');
    }

    return super.update(ctx);
  },

  // 3. DELETE (Check parent course ownership)
  async delete(ctx) {
    const user = ctx.state.user;
    const lessonId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const lesson: any = await strapi.db.query('api::lesson.lesson').findOne({
      where: {
        $or: [
          { id: isNaN(Number(lessonId)) ? -1 : Number(lessonId) },
          { documentId: lessonId },
        ],
      },
      populate: { course: { populate: ['instructor'] } },
    });

    if (!lesson) return ctx.notFound('Lesson not found');

    if (roleName === 'Instructor' && lesson.course?.instructor?.id !== user.id) {
      return ctx.unauthorized('You can only delete lessons from your own courses.');
    }

    return super.delete(ctx);
  }
}));