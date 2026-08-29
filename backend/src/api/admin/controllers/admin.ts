export default {
  // 1. GET /api/admin/stats
  async stats(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });

    if (fullUser.role?.name !== 'Admin') {
      return ctx.forbidden('Only administrators can access admin stats.');
    }

    try {
      const [users, courses, enrollments, quizzes, quizResults, blogPosts, lessons] = await Promise.all([
        strapi.entityService.findMany('plugin::users-permissions.user', { populate: ['role'] }),
        strapi.entityService.findMany('api::course.course'),
        strapi.entityService.findMany('api::enrollment.enrollment'),
        strapi.entityService.findMany('api::quiz.quiz'),
        strapi.entityService.findMany('api::quiz-result.quiz-result'),
        strapi.entityService.findMany('api::blog-post.blog-post'),
        strapi.entityService.findMany('api::lesson.lesson'),
      ]);

      const usersByRole: Record<string, number> = {
        Admin: 0,
        'Content Manager': 0,
        Instructor: 0,
        Student: 0,
        Other: 0,
      };

      (users as any[]).forEach((u: any) => {
        const roleName = u.role?.name || 'Other';
        if (usersByRole[roleName] !== undefined) {
          usersByRole[roleName]++;
        } else {
          usersByRole.Other++;
        }
      });

      return ctx.send({
        data: {
          totalUsers: (users as any[]).length,
          usersByRole,
          totalCourses: (courses as any[]).length,
          totalLessons: (lessons as any[]).length,
          totalEnrollments: (enrollments as any[]).length,
          totalQuizzes: (quizzes as any[]).length,
          totalQuizResults: (quizResults as any[]).length,
          totalBlogPosts: (blogPosts as any[]).length,
        },
      });
    } catch (error: any) {
      console.error('Admin Stats Error:', error);
      return ctx.internalServerError('Failed to fetch platform statistics.');
    }
  },

  // 2. GET /api/admin/users
  async users(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });

    if (fullUser.role?.name !== 'Admin') {
      return ctx.forbidden('Only administrators can manage users.');
    }

    try {
      const users: any = await strapi.entityService.findMany('plugin::users-permissions.user', {
        populate: ['role'],
        sort: { createdAt: 'desc' },
      });

      const sanitizedUsers = users.map((u: any) => ({
        id: u.id,
        documentId: u.documentId,
        username: u.username,
        email: u.email,
        createdAt: u.createdAt,
        confirmed: u.confirmed,
        blocked: u.blocked,
        role: u.role ? { id: u.role.id, name: u.role.name, type: u.role.type } : null,
      }));

      return ctx.send({ data: sanitizedUsers });
    } catch (error: any) {
      console.error('Admin Users Error:', error);
      return ctx.internalServerError('Failed to fetch users.');
    }
  },

  // 3. PUT /api/admin/users/:id/role
  async updateRole(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });

    if (fullUser.role?.name !== 'Admin') {
      return ctx.forbidden('Only administrators can change user roles.');
    }

    const { id } = ctx.params;
    const { roleId, roleName } = ctx.request.body || {};

    if (!roleId && !roleName) {
      return ctx.badRequest('A roleId or roleName is required.');
    }

    try {
      // Find role
      let targetRole: any;
      if (roleId) {
        targetRole = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { id: roleId },
        });
      } else if (roleName) {
        targetRole = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { name: roleName },
        });
      }

      if (!targetRole) {
        return ctx.badRequest('Target role not found.');
      }

      // Find user
      const targetUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [
            { id: isNaN(Number(id)) ? -1 : Number(id) },
            { documentId: id },
          ],
        },
      });

      if (!targetUser) {
        return ctx.notFound('User not found.');
      }

      // Update role
      await strapi.entityService.update('plugin::users-permissions.user', targetUser.id, {
        data: {
          role: targetRole.id,
        },
      });

      const updatedUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', targetUser.id, {
        populate: ['role'],
      });

      return ctx.send({
        data: {
          id: updatedUser.id,
          documentId: updatedUser.documentId,
          username: updatedUser.username,
          email: updatedUser.email,
          role: {
            id: updatedUser.role?.id,
            name: updatedUser.role?.name,
            type: updatedUser.role?.type,
          },
        },
        message: `User ${updatedUser.username} role updated to ${targetRole.name}.`,
      });
    } catch (error: any) {
      console.error('Update Role Error:', error);
      return ctx.internalServerError('Failed to update user role.');
    }
  },
};

