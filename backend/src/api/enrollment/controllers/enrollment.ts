import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    // Fetch user role
    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    
    if (fullUser.role?.name !== 'Student') {
      return ctx.forbidden('Only students can enroll in courses.');
    }

    const { data } = ctx.request.body;
    if (!data || !data.course) {
      return ctx.badRequest('A course ID is required to enroll.');
    }

    // 1. BULLETPROOF ID CHECK: Find the real course whether frontend sent an ID or a documentId string
    const matchingCourses: any = await strapi.entityService.findMany('api::course.course', {
      filters: {
        $or: [
          { id: data.course }, // If frontend sent numeric ID
          { documentId: data.course } // If frontend sent Strapi v5 documentId
        ]
      }
    });

    if (matchingCourses.length === 0) {
      return ctx.badRequest('Course not found in the database.');
    }

    const realCourseId = matchingCourses[0].id; // We now have the guaranteed numeric ID

    // 2. Check if already enrolled
    const existingEnrollments: any = await strapi.entityService.findMany('api::enrollment.enrollment', {
      filters: {
        users_permissions_user: user.id,
        course: realCourseId,
      },
    });

    if (existingEnrollments.length > 0) {
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