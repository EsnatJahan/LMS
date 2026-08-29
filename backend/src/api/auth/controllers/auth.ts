// @ts-ignore
import bcrypt from 'bcryptjs';

export default {
  // 1. POST /api/custom-auth/register
  async register(ctx: any) {
    const { username, email, password } = ctx.request.body || {};

    if (!username || !email || !password) {
      return ctx.badRequest('Username, email, and password are required.');
    }

    try {
      // Check if user or email exists
      const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [{ email: email.toLowerCase() }, { username }],
        },
      });

      if (existing) {
        return ctx.badRequest('An account with this email or username already exists.');
      }

      // Enforce Student role for all public registrations (Admin can promote via Admin Panel)
      let targetRole: any = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { name: 'Student' },
      });

      if (!targetRole) {
        targetRole = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { type: 'authenticated' },
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser: any = await strapi.entityService.create('plugin::users-permissions.user', {
        data: {
          username,
          email: email.toLowerCase(),
          password: hashedPassword,
          confirmed: true,
          blocked: false,
          role: targetRole?.id,
          provider: 'local',
        },
        populate: ['role'],
      });

      // Issue JWT
      const jwt = await (strapi.plugin('users-permissions') as any).service('jwt').issue({
        id: newUser.id,
      });

      return ctx.send({
        jwt,
        user: {
          id: newUser.id,
          documentId: newUser.documentId,
          username: newUser.username,
          email: newUser.email,
          role: {
            id: newUser.role?.id,
            name: newUser.role?.name,
            type: newUser.role?.type,
          },
        },
      });
    } catch (error: any) {
      console.error('Custom Register Error:', error);
      return ctx.internalServerError(error?.message || 'Registration failed.');
    }
  },

  // 2. POST /api/custom-auth/login
  async login(ctx: any) {
    const { identifier, password } = ctx.request.body || {};

    if (!identifier || !password) {
      return ctx.badRequest('Identifier and password are required.');
    }

    try {
      const user: any = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
        },
        populate: ['role'],
      });

      if (!user) {
        return ctx.badRequest('Invalid identifier or password.');
      }

      if (user.blocked) {
        return ctx.forbidden('Your account has been blocked.');
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return ctx.badRequest('Invalid identifier or password.');
      }

      const jwt = await (strapi.plugin('users-permissions') as any).service('jwt').issue({
        id: user.id,
      });

      return ctx.send({
        jwt,
        user: {
          id: user.id,
          documentId: user.documentId,
          username: user.username,
          email: user.email,
          role: {
            id: user.role?.id,
            name: user.role?.name,
            type: user.role?.type,
          },
        },
      });
    } catch (error: any) {
      console.error('Custom Login Error:', error);
      return ctx.internalServerError('Login failed.');
    }
  },

  // 3. GET /api/custom-auth/me
  async me(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('You must be logged in.');

    try {
      const fullUser: any = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['role'],
      });

      return ctx.send({
        id: fullUser.id,
        documentId: fullUser.documentId,
        username: fullUser.username,
        email: fullUser.email,
        role: {
          id: fullUser.role?.id,
          name: fullUser.role?.name,
          type: fullUser.role?.type,
        },
      });
    } catch (error: any) {
      console.error('Custom Me Error:', error);
      return ctx.internalServerError('Failed to fetch user details.');
    }
  },
};
