import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  
  // 1. CREATE
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName !== 'Admin' && roleName !== 'Content Manager') {
      return ctx.forbidden('Only Admins and Content Managers can write blog posts.');
    }

    const { data } = ctx.request.body || {};
    if (!data || !data.title) {
      return ctx.badRequest('Blog post title is required.');
    }

    try {
      const blogPost = await strapi.entityService.create('api::blog-post.blog-post', {
        data: {
          title: data.title,
          body: data.body,
          coverImage: data.coverImage,
          postStatus: data.postStatus || 'draft',
          users_permissions_user: user.id,
          publishedAt: new Date(),
        },
        populate: ['users_permissions_user'],
      });

      const sanitizedEntity = await (this as any).sanitizeOutput(blogPost, ctx);
      return (this as any).transformResponse(sanitizedEntity);
    } catch (error: any) {
      console.error('Blog Create Error:', error);
      return ctx.internalServerError('Failed to create blog post.');
    }
  },

  // 2. UPDATE
  async update(ctx) {
    const user = ctx.state.user;
    const postId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName !== 'Admin' && roleName !== 'Content Manager') {
      return ctx.forbidden('Only Admins and Content Managers can edit blog posts.');
    }

    const post: any = await strapi.entityService.findOne('api::blog-post.blog-post', postId, {
      populate: ['users_permissions_user'],
    });

    if (!post) return ctx.notFound('Blog post not found.');

    // If Content Manager, check if they own it (Admin can edit any post)
    if (roleName === 'Content Manager' && post.users_permissions_user?.id !== user.id) {
      return ctx.unauthorized('Content Managers can only edit their own blog posts.');
    }

    return super.update(ctx);
  },

  // 3. DELETE
  async delete(ctx) {
    const user = ctx.state.user;
    const postId = ctx.params.id;
    if (!user) return ctx.unauthorized();

    const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
      populate: ['role'],
    });
    const roleName = fullUser.role?.name;

    if (roleName !== 'Admin' && roleName !== 'Content Manager') {
      return ctx.forbidden('Only Admins and Content Managers can delete blog posts.');
    }

    const post: any = await strapi.entityService.findOne('api::blog-post.blog-post', postId, {
      populate: ['users_permissions_user'],
    });

    if (!post) return ctx.notFound('Blog post not found.');

    if (roleName === 'Content Manager' && post.users_permissions_user?.id !== user.id) {
      return ctx.unauthorized('Content Managers can only delete their own blog posts.');
    }

    return super.delete(ctx);
  },

  // 4. FIND (Draft vs Published filtering)
  async find(ctx) {
    const user = ctx.state.user;
    let roleName = 'Public';

    if (user) {
      const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['role'],
      });
      roleName = fullUser.role?.name || 'Authenticated';
    }

    // If not Admin or Content Manager, only show published posts
    if (roleName !== 'Admin' && roleName !== 'Content Manager') {
      ctx.query = {
        ...ctx.query,
        filters: {
          ...(ctx.query.filters || {}),
          postStatus: 'published',
        },
      };
    }

    return super.find(ctx);
  },

  // 5. FIND ONE
  async findOne(ctx) {
    const user = ctx.state.user;
    const postId = ctx.params.id;
    let roleName = 'Public';

    if (user) {
      const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['role'],
      });
      roleName = fullUser.role?.name || 'Authenticated';
    }

    const post: any = await strapi.entityService.findOne('api::blog-post.blog-post', postId, {
      populate: ['users_permissions_user'],
    });

    if (!post) return ctx.notFound('Blog post not found.');

    // Only published posts visible to public/students
    if (roleName !== 'Admin' && roleName !== 'Content Manager' && post.postStatus !== 'published') {
      return ctx.notFound('Blog post not found or not published.');
    }

    const sanitizedEntity = await (this as any).sanitizeOutput(post, ctx);
    return (this as any).transformResponse(sanitizedEntity);
  },
}));
