import { PrismaClient, Tag } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create Bookmarks
  const bookmarkData = [
    {
      title: 'NestJS Official Documentation',
      description:
        'A progressive Node.js framework for building efficient and scalable server-side applications.',
      websiteURL: 'https://nestjs.com/',
      tagTitles: ['NestJS', 'Node.js', 'Framework', 'TypeScript', 'Documentation'],
    },
    {
      title: 'TypeScript Handbook',
      description: 'Comprehensive guide to TypeScript language features and best practices.',
      websiteURL: 'https://www.typescriptlang.org/docs/',
      tagTitles: ['TypeScript', 'Documentation', 'JavaScript'],
    },
    {
      title: 'PostgreSQL Documentation',
      description:
        'The official PostgreSQL documentation for developers and database administrators.',
      websiteURL: 'https://www.postgresql.org/docs/',
      tagTitles: ['PostgreSQL', 'Database', 'Documentation'],
    },
    {
      title: 'Prisma Documentation',
      description: 'Next-generation ORM for Node.js and TypeScript with excellent type safety.',
      websiteURL: 'https://www.prisma.io/docs/',
      tagTitles: ['Prisma', 'Database', 'Node.js', 'TypeScript', 'Documentation'],
    },
    {
      title: 'Node.js Official Guide',
      description: 'Official Node.js documentation and API reference.',
      websiteURL: 'https://nodejs.org/en/docs/',
      tagTitles: ['Node.js', 'JavaScript', 'Documentation', 'API'],
    },
    {
      title: 'Swagger API Documentation',
      description: 'OpenAPI Specification and Swagger tools for API development.',
      websiteURL: 'https://swagger.io/',
      tagTitles: ['API', 'Documentation', 'Swagger'],
    },
    {
      title: 'Docker Documentation',
      description: 'Containerization platform documentation and best practices.',
      websiteURL: 'https://docs.docker.com/',
      tagTitles: ['Docker', 'Documentation', 'DevOps', 'Container'],
    },
    {
      title: 'Express.js Guide',
      description: 'Fast, unopinionated, minimalist web framework for Node.js.',
      websiteURL: 'https://expressjs.com/',
      tagTitles: ['Express', 'Node.js', 'Framework', 'JavaScript'],
    },
    {
      title: 'Mozilla Developer Network',
      description: 'Web development resources for HTML, CSS, JavaScript, and web APIs.',
      websiteURL: 'https://developer.mozilla.org/',
      tagTitles: ['JavaScript', 'Documentation', 'Web Development', 'API'],
    },
    {
      title: 'GitHub Documentation',
      description: 'Documentation for using GitHub for version control and collaboration.',
      websiteURL: 'https://docs.github.com/',
      tagTitles: ['GitHub', 'Git', 'Documentation', 'Version Control'],
    },
  ];

  // Collect all unique tags
  const allTagTitles = new Set<string>();
  bookmarkData.forEach((data) => {
    data.tagTitles.forEach((tag) => allTagTitles.add(tag));
  });

  // Create Tags
  const tags: Tag[] = await Promise.all(
    Array.from(allTagTitles).map(
      (title): Promise<Tag> =>
        prisma.tag.upsert({
          where: { title },
          update: {},
          create: { title },
        }) as Promise<Tag>,
    ),
  );

  for (const data of bookmarkData) {
    const bookmark = await prisma.bookmark.create({
      data: {
        title: data.title,
        description: data.description,
        websiteURL: data.websiteURL,
      },
    });

    // Connect tags
    const tagIds: string[] = tags
      .filter((tag: Tag) => data.tagTitles.includes(tag.title as string))
      .map((tag: Tag) => tag.id as string);

    await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: {
        tags: {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        },
      },
    });
  }

  console.log('Seed completed successfully!');
  console.log(`Created ${tags.length} tags`);
  console.log(`Created ${bookmarkData.length} bookmarks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
