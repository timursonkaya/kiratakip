import type { getUserDb } from '@/lib/user-db';

type Db = ReturnType<typeof getUserDb>;

/** Returns the primary owner of a unit (or the first owner if none is flagged). */
export async function getPrimaryOwnerForUnit(db: Db, unitId: number) {
  const link = await db.unitOwner.findFirst({
    where: { unitId },
    include: { owner: true },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  });
  return link?.owner ?? null;
}

/** All owners of a unit, primary first. */
export async function getUnitOwners(db: Db, unitId: number) {
  return db.unitOwner.findMany({
    where: { unitId },
    include: { owner: true },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  });
}