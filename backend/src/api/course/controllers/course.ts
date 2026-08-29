import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  
  // 1. FIND (Enrich with instructor data)
  async find(ctx) {
    const res = await super.find(ctx);
    const data = res?.data;
    if (!data || !Array.isArray(data)) return res;

    const courseDocIds = data.map((d: any) => d.documentId || d.id);
    const dbCourses = await strapi.db.query('api::course.course').findMany({
      where: { documentId: { $in: courseDocIds } },
      populate: ['instructor', 'lessons', 'quizzes', 'enrollments'],
    });

    const enrichedData = data.map((d: any) => {
      const dbC = dbCourses.find((item: any) => item.documentId === d.documentId || item.id === d.id);
      if (dbC && dbC.instructor) {
        return {
          ...d,
          instructor: {
            id: dbC.instructor.id,
            documentId: dbC.instructor.documentId,
            username: dbC.instructor.username,
            email: dbC.instructor.email,
          },
        };
      }
      return d;
    });

    return { ...res, data: enrichedData };
  },

  // 2. FIND ONE
  async findOne(ctx) {
    const res = await super.findOne(ctx);
    const d = res?.data;
    if (!d) return res;

    const dbC = await strapi.db.query('api::course.course').findOne({
      where: {
        $or: [
          { id: isNaN(Number(ctx.params.id)) ? -1 : Number(ctx.params.id) },
          { documentId: ctx.params.id },
        ],
      },
      populate: ['instructor', 'lessons', 'quizzes', 'enrollments'],
    });

    if (dbC && dbC.instructor) {
      d.instructor = {
        id: dbC.instructor.id,
        documentId: dbC.instructor.documentId,
        username: dbC.instructor.username,
        email: dbC.instructor.email,
      };
    }

    return res;
  },

  // 3. CREATE (Support Admin/Content Manager assigning instructor)
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });

    const roleName = fullUser.role?.name;

    if (roleName === 'Student') {
      return ctx.forbidden('Students cannot create courses.');
    }

    const { title, description, instructor } = ctx.request.body.data || {};
    let instructorId = user.id;

    if ((roleName === 'Admin' || roleName === 'Content Manager') && instructor) {
      const targetInstructor: any = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [
            { id: isNaN(Number(instructor)) ? -1 : Number(instructor) },
            { documentId: instructor },
            { username: instructor },
          ],
        },
      });
      if (targetInstructor) {
        instructorId = targetInstructor.id;
      }
    }

    try {
      const course = await strapi.entityService.create('api::course.course', {
        data: {
          title,
          description,
          instructor: instructorId,
        },
      });
      const sanitizedEntity = await (this as any).sanitizeOutput(course, ctx);
      return (this as any).transformResponse(sanitizedEntity);
    } catch (error) {
      return ctx.internalServerError('Failed to create course');
    }
  },

  // 4. UPDATE (Support Admin/Content Manager assigning/reassigning instructor)
  async update(ctx) {
    const user = ctx.state.user;
    const courseId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const course: any = await strapi.db.query('api::course.course').findOne({
      where: {
        $or: [
          { id: isNaN(Number(courseId)) ? -1 : Number(courseId) },
          { documentId: courseId },
        ],
      },
      populate: ['instructor'],
    });

    if (!course) return ctx.notFound('Course not found');

    if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
      return ctx.unauthorized('Instructors can only edit their own courses.');
    }

    const { title, description, instructor } = ctx.request.body.data || {};

    let targetInstructorId = course.instructor?.id;
    if ((roleName === 'Admin' || roleName === 'Content Manager') && instructor !== undefined) {
      if (instructor) {
        const targetInstructor: any = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: {
            $or: [
              { id: isNaN(Number(instructor)) ? -1 : Number(instructor) },
              { documentId: instructor },
              { username: instructor },
            ],
          },
        });
        targetInstructorId = targetInstructor ? targetInstructor.id : null;
      } else {
        targetInstructorId = null;
      }
    }

    // Update all matching rows of this course
    const allMatchingCourses = await strapi.db.query('api::course.course').findMany({
      where: { documentId: course.documentId },
    });

    for (const c of allMatchingCourses) {
      await strapi.db.query('api::course.course').update({
        where: { id: c.id },
        data: {
          ...(title ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          instructor: targetInstructorId,
        },
      });
    }

    const updatedCourse: any = await strapi.db.query('api::course.course').findOne({
      where: { id: course.id },
      populate: ['instructor', 'lessons', 'quizzes'],
    });

    if (updatedCourse && updatedCourse.instructor) {
      updatedCourse.instructor = {
        id: updatedCourse.instructor.id,
        documentId: updatedCourse.instructor.documentId,
        username: updatedCourse.instructor.username,
        email: updatedCourse.instructor.email,
      };
    }

    return ctx.send({ data: updatedCourse });
  },

  // 5. DELETE (Cascading delete)
  async delete(ctx) {
    const user = ctx.state.user;
    const courseId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName === 'Student') return ctx.forbidden();

    const course: any = await strapi.db.query('api::course.course').findOne({
      where: {
        $or: [
          { id: isNaN(Number(courseId)) ? -1 : Number(courseId) },
          { documentId: courseId },
        ],
      },
      populate: ['instructor'],
    });

    if (!course) return ctx.notFound('Course not found');

    if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
      return ctx.unauthorized('Instructors can only delete their own courses.');
    }

    try {
      const docId = course.documentId;
      const allMatchingCourses = await strapi.db.query('api::course.course').findMany({
        where: { documentId: docId },
      });
      const matchingIds = allMatchingCourses.map((c: any) => c.id);

      await strapi.db.query('api::lesson.lesson').deleteMany({
        where: { course: { $in: matchingIds } },
      });
      await strapi.db.query('api::quiz.quiz').deleteMany({
        where: { course: { $in: matchingIds } },
      });
      await strapi.db.query('api::enrollment.enrollment').deleteMany({
        where: { course: { $in: matchingIds } },
      });
      await strapi.db.query('api::lesson-progress.lesson-progress').deleteMany({
        where: { course: { $in: matchingIds } },
      });

      await strapi.db.query('api::course.course').deleteMany({
        where: { documentId: docId },
      });

      return ctx.send({ message: 'Course deleted successfully' });
    } catch (error: any) {
      console.error('Course Delete Error:', error);
      return ctx.internalServerError('Failed to delete course');
    }
  }
}));