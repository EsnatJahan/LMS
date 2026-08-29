import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      const permissionsConfig: Record<string, string[]> = {
        Admin: [
          'api::admin.admin.stats',
          'api::admin.admin.users',
          'api::admin.admin.updateRole',
          'api::auth.auth.me',
          'api::course.course.find',
          'api::course.course.findOne',
          'api::course.course.create',
          'api::course.course.update',
          'api::course.course.delete',
          'api::lesson.lesson.find',
          'api::lesson.lesson.findOne',
          'api::lesson.lesson.create',
          'api::lesson.lesson.update',
          'api::lesson.lesson.delete',
          'api::quiz.quiz.find',
          'api::quiz.quiz.findOne',
          'api::quiz.quiz.create',
          'api::quiz.quiz.update',
          'api::quiz.quiz.delete',
          'api::question.question.find',
          'api::question.question.findOne',
          'api::question.question.create',
          'api::question.question.update',
          'api::question.question.delete',
          'api::quiz-result.quiz-result.find',
          'api::quiz-result.quiz-result.findOne',
          'api::quiz-result.quiz-result.create',
          'api::quiz-result.quiz-result.submit',
          'api::lesson-progress.lesson-progress.find',
          'api::lesson-progress.lesson-progress.findOne',
          'api::lesson-progress.lesson-progress.create',
          'api::lesson-progress.lesson-progress.update',
          'api::lesson-progress.lesson-progress.delete',
          'api::blog-post.blog-post.find',
          'api::blog-post.blog-post.findOne',
          'api::blog-post.blog-post.create',
          'api::blog-post.blog-post.update',
          'api::blog-post.blog-post.delete',
          'api::enrollment.enrollment.find',
          'api::enrollment.enrollment.findOne',
          'api::enrollment.enrollment.create',
          'api::enrollment.enrollment.update',
          'api::enrollment.enrollment.delete',
        ],
        'Content Manager': [
          'api::auth.auth.me',
          'api::course.course.find',
          'api::course.course.findOne',
          'api::course.course.create',
          'api::course.course.update',
          'api::course.course.delete',
          'api::lesson.lesson.find',
          'api::lesson.lesson.findOne',
          'api::lesson.lesson.create',
          'api::lesson.lesson.update',
          'api::lesson.lesson.delete',
          'api::quiz.quiz.find',
          'api::quiz.quiz.findOne',
          'api::quiz.quiz.create',
          'api::quiz.quiz.update',
          'api::quiz.quiz.delete',
          'api::question.question.find',
          'api::question.question.findOne',
          'api::question.question.create',
          'api::question.question.update',
          'api::question.question.delete',
          'api::quiz-result.quiz-result.find',
          'api::quiz-result.quiz-result.findOne',
          'api::lesson-progress.lesson-progress.find',
          'api::lesson-progress.lesson-progress.findOne',
          'api::blog-post.blog-post.find',
          'api::blog-post.blog-post.findOne',
          'api::blog-post.blog-post.create',
          'api::blog-post.blog-post.update',
          'api::blog-post.blog-post.delete',
          'api::enrollment.enrollment.find',
          'api::enrollment.enrollment.findOne',
        ],
        Instructor: [
          'api::auth.auth.me',
          'api::course.course.find',
          'api::course.course.findOne',
          'api::course.course.create',
          'api::course.course.update',
          'api::course.course.delete',
          'api::lesson.lesson.find',
          'api::lesson.lesson.findOne',
          'api::lesson.lesson.create',
          'api::lesson.lesson.update',
          'api::lesson.lesson.delete',
          'api::quiz.quiz.find',
          'api::quiz.quiz.findOne',
          'api::quiz.quiz.create',
          'api::quiz.quiz.update',
          'api::quiz.quiz.delete',
          'api::question.question.find',
          'api::question.question.findOne',
          'api::question.question.create',
          'api::question.question.update',
          'api::question.question.delete',
          'api::quiz-result.quiz-result.find',
          'api::quiz-result.quiz-result.findOne',
          'api::lesson-progress.lesson-progress.find',
          'api::lesson-progress.lesson-progress.findOne',
          'api::blog-post.blog-post.find',
          'api::blog-post.blog-post.findOne',
          'api::enrollment.enrollment.find',
          'api::enrollment.enrollment.findOne',
        ],
        Student: [
          'api::auth.auth.me',
          'api::course.course.find',
          'api::course.course.findOne',
          'api::lesson.lesson.find',
          'api::lesson.lesson.findOne',
          'api::enrollment.enrollment.find',
          'api::enrollment.enrollment.findOne',
          'api::enrollment.enrollment.create',
          'api::lesson-progress.lesson-progress.find',
          'api::lesson-progress.lesson-progress.findOne',
          'api::lesson-progress.lesson-progress.create',
          'api::lesson-progress.lesson-progress.update',
          'api::quiz.quiz.find',
          'api::quiz.quiz.findOne',
          'api::question.question.find',
          'api::question.question.findOne',
          'api::quiz-result.quiz-result.find',
          'api::quiz-result.quiz-result.findOne',
          'api::quiz-result.quiz-result.create',
          'api::quiz-result.quiz-result.submit',
          'api::blog-post.blog-post.find',
          'api::blog-post.blog-post.findOne',
        ],
        Authenticated: [
          'api::auth.auth.me',
          'api::course.course.find',
          'api::course.course.findOne',
          'api::lesson.lesson.find',
          'api::lesson.lesson.findOne',
          'api::enrollment.enrollment.find',
          'api::enrollment.enrollment.findOne',
          'api::enrollment.enrollment.create',
          'api::lesson-progress.lesson-progress.find',
          'api::lesson-progress.lesson-progress.findOne',
          'api::lesson-progress.lesson-progress.create',
          'api::lesson-progress.lesson-progress.update',
          'api::quiz.quiz.find',
          'api::quiz.quiz.findOne',
          'api::question.question.find',
          'api::question.question.findOne',
          'api::quiz-result.quiz-result.find',
          'api::quiz-result.quiz-result.findOne',
          'api::quiz-result.quiz-result.create',
          'api::quiz-result.quiz-result.submit',
          'api::blog-post.blog-post.find',
          'api::blog-post.blog-post.findOne',
        ],
        Public: [
          'api::auth.auth.register',
          'api::auth.auth.login',
          'api::course.course.find',
          'api::course.course.findOne',
          'api::lesson.lesson.find',
          'api::lesson.lesson.findOne',
          'api::blog-post.blog-post.find',
          'api::blog-post.blog-post.findOne',
        ],
      };

      // Ensure custom roles exist
      const requiredRoles = [
        { name: 'Admin', type: 'admin', description: 'Platform Administrator' },
        { name: 'Content Manager', type: 'content_manager', description: 'Content Editor' },
        { name: 'Instructor', type: 'instructor', description: 'Course Instructor' },
        { name: 'Student', type: 'student', description: 'Student Learner' },
      ];

      for (const r of requiredRoles) {
        const existing = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { name: r.name },
        });
        if (!existing) {
          await strapi.db.query('plugin::users-permissions.role').create({
            data: r,
          });
        }
      }

      const roles = await strapi.db.query('plugin::users-permissions.role').findMany();

      for (const role of roles) {
        const actions = permissionsConfig[role.name] || (role.type === 'authenticated' ? permissionsConfig.Authenticated : null) || (role.type === 'public' ? permissionsConfig.Public : null);
        if (!actions) continue;

        for (const action of actions) {
          const perm = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: { action, role: role.id },
          });

          if (!perm) {
            await strapi.db.query('plugin::users-permissions.permission').create({
              data: {
                action,
                role: role.id,
              },
            });
          }
        }
      }

      // Seed Demo Users if missing
      const adminRole = roles.find((r: any) => r.name === 'Admin');
      const instRole = roles.find((r: any) => r.name === 'Instructor');
      const contentRole = roles.find((r: any) => r.name === 'Content Manager');
      const studentRole = roles.find((r: any) => r.name === 'Student');

      const demoUsers = [
        { username: 'lmsadmin', email: 'lmsadmin@test.com', role: adminRole?.id },
        { username: 'instructor', email: 'instructor@test.com', role: instRole?.id },
        { username: 'contentmanager', email: 'content@test.com', role: contentRole?.id },
        { username: 'student', email: 'student@test.com', role: studentRole?.id },
      ];

      for (const u of demoUsers) {
        const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { email: u.email },
        });
        if (!existingUser && u.role) {
          await strapi.entityService.create('plugin::users-permissions.user', {
            data: {
              username: u.username,
              email: u.email,
              password: 'password123',
              confirmed: true,
              blocked: false,
              role: u.role,
            },
          });
        }
      }

      // Seed Starter Courses if database has 0 courses
      const existingCourses = await strapi.db.query('api::course.course').count();
      if (existingCourses === 0) {
        const instUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { email: 'instructor@test.com' },
        });

        // 1. Course 1: JavaScript Fundamentals
        const c1: any = await strapi.entityService.create('api::course.course', {
          data: {
            title: 'JavaScript Fundamentals & Modern ES6+',
            description: 'Master variables, closures, promises, async/await, and DOM manipulation from scratch.',
            instructor: instUser?.id,
            publishedAt: new Date(),
          },
        });

        await strapi.entityService.create('api::lesson.lesson', {
          data: {
            title: '01. Variables, Scope & Hoisting',
            content: 'In this lesson, we explore let, const, var, block scoping, and lexical environments.',
            videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
            order: 1,
            course: c1.id,
            publishedAt: new Date(),
          },
        });

        await strapi.entityService.create('api::lesson.lesson', {
          data: {
            title: '02. Asynchronous JavaScript & Promises',
            content: 'Learn how the JavaScript event loop works, microtasks vs macrotasks, and Promise chaining.',
            videoUrl: 'https://www.youtube.com/watch?v=PoRJizFvM7s',
            order: 2,
            course: c1.id,
            publishedAt: new Date(),
          },
        });

        const q1: any = await strapi.entityService.create('api::quiz.quiz', {
          data: {
            title: 'JavaScript Core Assessment',
            description: 'Test your understanding of modern JavaScript concepts.',
            course: c1.id,
            publishedAt: new Date(),
          },
        });

        await strapi.entityService.create('api::question.question', {
          data: {
            title: 'Which keyword creates a block-scoped variable in modern JavaScript?',
            option1: 'var',
            option2: 'let',
            option3: 'function',
            option4: 'global',
            correctAnswer: 'let',
            quiz: q1.id,
            publishedAt: new Date(),
          },
        });

        await strapi.entityService.create('api::question.question', {
          data: {
            title: 'What does Promise.all() resolve to?',
            option1: 'The first completed promise',
            option2: 'An array of all resolved values',
            option3: 'A boolean value',
            option4: 'An error',
            correctAnswer: 'An array of all resolved values',
            quiz: q1.id,
            publishedAt: new Date(),
          },
        });

        // 2. Course 2: React & Next.js
        const c2: any = await strapi.entityService.create('api::course.course', {
          data: {
            title: 'Fullstack Next.js & React Architecture',
            description: 'Build high-performance web applications with React Server Components, App Router, and Tailwind CSS.',
            instructor: instUser?.id,
            publishedAt: new Date(),
          },
        });

        await strapi.entityService.create('api::lesson.lesson', {
          data: {
            title: '01. React Server Components & App Router',
            content: 'Understand the difference between Server Components and Client Components in Next.js.',
            videoUrl: 'https://www.youtube.com/watch?v=843nec-IvW0',
            order: 1,
            course: c2.id,
            publishedAt: new Date(),
          },
        });

        // 3. Starter Blog
        await strapi.entityService.create('api::blog-post.blog-post', {
          data: {
            title: 'Getting Started with Modern Fullstack Architecture in 2026',
            content: 'Building production-ready applications with Next.js App Router and Headless CMS backends.',
            publishedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error('Bootstrap Permissions Error:', error);
    }
  },
};
