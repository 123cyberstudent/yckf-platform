import { prisma } from './shared/db.js';
import { syncCoursesFromCms } from './payments/courseCatalog.js';
import { toMinorUnits } from './payments/money.js';

interface DefaultPackage {
  name: string;
  description: string;
  baseCredits: number;
  bonusCredits: number;
  priceGhs: number;
  featured: boolean;
  displayOrder: number;
}

const DEFAULT_PACKAGES: DefaultPackage[] = [
  { name: 'Starter', description: 'Perfect for exploring your first course.', baseCredits: 50, bonusCredits: 0, priceGhs: 5, featured: false, displayOrder: 1 },
  { name: 'Growth', description: 'Our most popular credit bundle.', baseCredits: 150, bonusCredits: 25, priceGhs: 15, featured: true, displayOrder: 2 },
  { name: 'Pro', description: 'For serious learners on the job hunt.', baseCredits: 400, bonusCredits: 80, priceGhs: 38, featured: false, displayOrder: 3 },
];

async function main() {
  const courseResult = await syncCoursesFromCms();
  console.log(`Courses synced from CMS: ${courseResult.created} created, ${courseResult.updated} updated, ${courseResult.deactivated} deactivated`);

  for (const pkg of DEFAULT_PACKAGES) {
    const existing = await prisma.creditPackage.findUnique({ where: { name: pkg.name } });
    const data = {
      description: pkg.description,
      baseCredits: pkg.baseCredits,
      bonusCredits: pkg.bonusCredits,
      totalCredits: pkg.baseCredits + pkg.bonusCredits,
      price: toMinorUnits(pkg.priceGhs),
      featured: pkg.featured,
      displayOrder: pkg.displayOrder,
      active: true,
    };
    if (existing) {
      await prisma.creditPackage.update({ where: { name: pkg.name }, data });
      console.log(`Credit package "${pkg.name}" updated`);
    } else {
      await prisma.creditPackage.create({ data: { ...data, name: pkg.name } });
      console.log(`Credit package "${pkg.name}" created`);
    }
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
