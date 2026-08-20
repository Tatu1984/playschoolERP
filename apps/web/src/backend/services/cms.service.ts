/**
 * The CMS behind the public site (SoW §7.15): pages, blog, banners, the media
 * library and testimonials.
 *
 * The split that matters: reads are public but only of *published* content,
 * writes are admin-only. The marketing site calls the same service with no
 * session, so a draft blog post cannot be reached by guessing its slug.
 */
import { prisma, type Prisma } from "@/backend/database/client";
import {
  toBanner,
  toBlogPost,
  toCmsPage,
  toMediaAsset,
  toTestimonial,
} from "@/backend/mappers";
import { NotFoundError } from "@/backend/utils/error-handler.util";
import { requireRole } from "@/backend/utils/rbac.util";
import type { Scope } from "@/backend/utils/scope.util";
import { ROLES, type Role } from "@/shared/constants/roles";
import type {
  Banner,
  BlogPost,
  CmsPage,
  MediaAsset,
  Testimonial,
} from "@/shared/types/learning.types";
import type {
  BannerInput,
  BlogPostInput,
  CmsPageInput,
  MediaAssetInput,
  TestimonialInput,
} from "@/backend/validators/cms.validator";

const ADMINS: Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
/** No session means the public website is asking. */
const publicOnly = (scope: Scope | null) => scope === null || scope.role === ROLES.PARENT;

export const cmsService = {
  // ---------------------------------------------------------------- pages
  async listPages(scope: Scope | null): Promise<CmsPage[]> {
    const where: Prisma.CmsPageWhereInput = publicOnly(scope) ? { status: "PUBLISHED" } : {};
    return (await prisma.cmsPage.findMany({ where, orderBy: { slug: "asc" } })).map(toCmsPage);
  },

  async getPage(scope: Scope | null, slug: string): Promise<CmsPage> {
    const row = await prisma.cmsPage.findUnique({ where: { slug } });
    if (!row || (publicOnly(scope) && row.status !== "PUBLISHED")) {
      throw new NotFoundError("Page not found");
    }
    return toCmsPage(row);
  },

  async upsertPage(scope: Scope, slug: string, input: CmsPageInput): Promise<CmsPage> {
    requireRole(scope.role, ADMINS);
    const { sections, ...rest } = input;
    const data = {
      ...rest,
      ...(sections ? { sections: sections as unknown as Prisma.InputJsonValue } : {}),
    };
    const row = await prisma.cmsPage.upsert({
      where: { slug },
      update: data,
      create: { slug, title: rest.title ?? slug, ...data },
    });
    return toCmsPage(row);
  },

  // ----------------------------------------------------------------- blog
  async listPosts(scope: Scope | null): Promise<BlogPost[]> {
    const where: Prisma.BlogPostWhereInput = publicOnly(scope)
      ? { status: "PUBLISHED", publishedAt: { not: null } }
      : {};
    return (await prisma.blogPost.findMany({ where, orderBy: { publishedAt: "desc" } })).map(toBlogPost);
  },

  async getPost(scope: Scope | null, slug: string): Promise<BlogPost> {
    const row = await prisma.blogPost.findUnique({ where: { slug } });
    if (!row || (publicOnly(scope) && row.status !== "PUBLISHED")) {
      throw new NotFoundError("Post not found");
    }
    // A view counter that only counts readers, not the editor previewing it.
    if (publicOnly(scope)) {
      await prisma.blogPost.update({ where: { slug }, data: { views: { increment: 1 } } });
    }
    return toBlogPost(row);
  },

  async createPost(scope: Scope, input: BlogPostInput): Promise<BlogPost> {
    requireRole(scope.role, ADMINS);
    const { publish, ...rest } = input;
    const row = await prisma.blogPost.create({
      data: {
        ...rest,
        slug: rest.slug!,
        title: rest.title!,
        author: rest.author ?? scope.name,
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
    });
    return toBlogPost(row);
  },

  async updatePost(scope: Scope, id: string, input: BlogPostInput): Promise<BlogPost> {
    requireRole(scope.role, ADMINS);
    const { publish, ...rest } = input;
    const row = await prisma.blogPost.update({
      where: { id },
      data: {
        ...rest,
        ...(publish === undefined
          ? {}
          : { status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null }),
      },
    });
    return toBlogPost(row);
  },

  async deletePost(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, ADMINS);
    await prisma.blogPost.delete({ where: { id } });
  },

  // -------------------------------------------------------------- banners
  async listBanners(scope: Scope | null): Promise<Banner[]> {
    if (!publicOnly(scope)) {
      return (await prisma.banner.findMany({ orderBy: { createdAt: "desc" } })).map(toBanner);
    }
    // Public: only banners that are active and inside their date window.
    const now = new Date();
    const rows = await prisma.banner.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsOn: null }, { startsOn: { lte: now } }] },
          { OR: [{ endsOn: null }, { endsOn: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toBanner);
  },

  async upsertBanner(scope: Scope, id: string | null, input: BannerInput): Promise<Banner> {
    requireRole(scope.role, ADMINS);
    const data = {
      ...input,
      ...(input.startsOn === undefined ? {} : { startsOn: input.startsOn ? new Date(input.startsOn) : null }),
      ...(input.endsOn === undefined ? {} : { endsOn: input.endsOn ? new Date(input.endsOn) : null }),
    };
    const row = id
      ? await prisma.banner.update({ where: { id }, data })
      : await prisma.banner.create({ data: { ...data, title: input.title ?? "Untitled" } });
    return toBanner(row);
  },

  async deleteBanner(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, ADMINS);
    await prisma.banner.delete({ where: { id } });
  },

  // --------------------------------------------------------- media library
  async listMedia(scope: Scope): Promise<MediaAsset[]> {
    requireRole(scope.role, ADMINS);
    return (await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } })).map(toMediaAsset);
  },

  async addMedia(scope: Scope, input: MediaAssetInput): Promise<MediaAsset> {
    requireRole(scope.role, ADMINS);
    return toMediaAsset(await prisma.mediaAsset.create({ data: input }));
  },

  async updateMedia(scope: Scope, id: string, input: Partial<MediaAssetInput>): Promise<MediaAsset> {
    requireRole(scope.role, ADMINS);
    return toMediaAsset(await prisma.mediaAsset.update({ where: { id }, data: input }));
  },

  async deleteMedia(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, ADMINS);
    await prisma.mediaAsset.delete({ where: { id } });
  },

  // -------------------------------------------------------- testimonials
  async listTestimonials(scope: Scope | null): Promise<Testimonial[]> {
    const where: Prisma.TestimonialWhereInput = publicOnly(scope) ? { published: true } : {};
    return (await prisma.testimonial.findMany({ where, orderBy: { createdAt: "desc" } })).map(toTestimonial);
  },

  async upsertTestimonial(scope: Scope, id: string | null, input: TestimonialInput): Promise<Testimonial> {
    requireRole(scope.role, ADMINS);
    const row = id
      ? await prisma.testimonial.update({ where: { id }, data: input })
      : await prisma.testimonial.create({
          data: { ...input, parentName: input.parentName ?? "", quote: input.quote ?? "" },
        });
    return toTestimonial(row);
  },

  async deleteTestimonial(scope: Scope, id: string): Promise<void> {
    requireRole(scope.role, ADMINS);
    await prisma.testimonial.delete({ where: { id } });
  },
};
