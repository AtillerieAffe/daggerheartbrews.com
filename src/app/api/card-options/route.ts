import { db } from '@/lib/database';
import { classOptions, domainOptions } from '@/lib/database/schema';
import { fallbackCardOptions } from '@/lib/constants/card-options';

export async function GET() {
  const [domainsResult, classesResult] = await Promise.allSettled([
    db.select().from(domainOptions),
    db.select().from(classOptions),
  ]);

  const hasDomainData =
    domainsResult.status === 'fulfilled' && domainsResult.value.length > 0;
  const hasClassData =
    classesResult.status === 'fulfilled' && classesResult.value.length > 0;

  if (!hasDomainData || !hasClassData) {
    if (domainsResult.status === 'rejected') {
      console.error('Failed to load domain options from database', domainsResult.reason);
    }
    if (classesResult.status === 'rejected') {
      console.error('Failed to load class options from database', classesResult.reason);
    }
    if (domainsResult.status === 'fulfilled' && !hasDomainData) {
      console.warn('No domain options returned from database; using fallback data.');
    }
    if (classesResult.status === 'fulfilled' && !hasClassData) {
      console.warn('No class options returned from database; using fallback data.');
    }

    const domains = hasDomainData
      ? domainsResult.value
      : fallbackCardOptions.domains;
    const classes = hasClassData
      ? classesResult.value
      : fallbackCardOptions.classes;

    return Response.json({ domains, classes });
  }

  return Response.json({
    domains: domainsResult.value,
    classes: classesResult.value,
  });
}
