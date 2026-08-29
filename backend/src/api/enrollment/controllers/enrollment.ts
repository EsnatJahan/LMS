import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    // Fetch user role
    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    
    if (fullUser.role?.name && fullUser.role?.name !== 'Student' && fullUser.role?.name !== 'Authenticated') {
      return ctx.forbidden('Only students can enroll in courses.');
    }

    const { data } = ctx.request.body;
    if (!data || !data.course) {
      return ctx.badRequest('A course ID is required to enroll.');
    }

    // 1. BULLETPROOF ID CHECK: Find the real course whether frontend sent an ID or a documentId string
    let foundCourse: any = null;
    const courseParam = data.course;

    if (typeof courseParam === 'number' || (!isNaN(Number(courseParam)) && /^\d+$/.test(String(courseParam)))) {
      foundCourse = await strapi.db.query('api::course.course').findOne({
        where: { id: parseInt(String(courseParam)) },
      });
    }

    if (!foundCourse && typeof courseParam === 'string') {
      foundCourse = await strapi.db.query('api::course.course').findOne({
        where: { documentId: courseParam },
      });
    }

    if (!foundCourse) {
      return ctx.badRequest('Course not found in the database.');
    }

    const realCourseId = foundCourse.id;

    // 2. Check if already enrolled across any version of this course
    const allCourseVersions = await strapi.db.query('api::course.course').findMany({
      where: { documentId: foundCourse.documentId },
    });
    const courseIds = allCourseVersions.map((c: any) => c.id);

    const existingEnrollments = await strapi.db.query('api::enrollment.enrollment').findMany({
      where: {
        users_permissions_user: user.id,
        course: { $in: courseIds },
      },
    });

    if (existingEnrollments && existingEnrollments.length > 0) {
      return ctx.badRequest('You are already enrolled in this course.');
    }

    try {
      // 3. Save with the guaranteed numeric IDs (NO CONNECT SYNTAX)
      const enrollment = await strapi.entityService.create('api::enrollment.enrollment', {
        data: {
          users_permissions_user: user.id, 
          course: realCourseId,            
          publishedAt: new Date(), 
        },
        populate: ['course', 'users_permissions_user'] 
      });

      const sanitizedEntity = await (this as any).sanitizeOutput(enrollment, ctx);
      return (this as any).transformResponse(sanitizedEntity);
    } catch (error) {
      console.error("Enrollment Error:", error);
      return ctx.internalServerError('Failed to enroll in the course.');
    }
  }
}));