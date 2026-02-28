import { prisma } from "./prisma";

type ComboRow = {
  parentProductId: string;
  childProductId: string;
};

const isMissingComboTableError = (error: unknown): boolean => {
  const message = String((error as { message?: string })?.message || "").toLowerCase();
  return (
    (message.includes("1146") || message.includes("p2010")) &&
    (message.includes("productcomboitem") || message.includes("product combo item"))
  );
};

export const loadDirectAccessibleProductIds = async (userId: string): Promise<Set<string>> => {
  if (!userId) return new Set<string>();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT DISTINCT unlocked.productId
        FROM (
          SELECT pp.productId
          FROM ProductPurchase pp
          WHERE pp.userId = ?
          UNION
          SELECT spa.productId
          FROM StudentProductAccess spa
          WHERE spa.userId = ?
        ) unlocked
      `,
      userId,
      userId
    )) as Array<{ productId: string }>;
    return new Set(rows.map((item) => String(item.productId || "").trim()).filter(Boolean));
  } catch (error) {
    const message = String((error as { message?: string })?.message || "").toLowerCase();
    const missingPurchaseTable =
      message.includes("1146") &&
      (message.includes("productpurchase") || message.includes("product purchase"));
    if (!missingPurchaseTable) throw error;

    const assignedOnlyRows = (await prisma.$queryRawUnsafe(
      `
        SELECT DISTINCT spa.productId
        FROM StudentProductAccess spa
        WHERE spa.userId = ?
      `,
      userId
    )) as Array<{ productId: string }>;
    return new Set(assignedOnlyRows.map((item) => String(item.productId || "").trim()).filter(Boolean));
  }
};

export const expandProductIdsWithComboChildren = async (productIds: Iterable<string>): Promise<Set<string>> => {
  const visited = new Set(
    Array.from(productIds)
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
  if (!visited.size) return visited;

  let frontier = Array.from(visited);

  while (frontier.length) {
    const placeholders = frontier.map(() => "?").join(", ");
    let rows: ComboRow[] = [];
    try {
      rows = (await prisma.$queryRawUnsafe(
        `
          SELECT parentProductId, childProductId
          FROM ProductComboItem
          WHERE parentProductId IN (${placeholders})
        `,
        ...frontier
      )) as ComboRow[];
    } catch (error) {
      if (isMissingComboTableError(error)) {
        return visited;
      }
      throw error;
    }

    const nextFrontier: string[] = [];
    rows.forEach((row) => {
      const childId = String(row.childProductId || "").trim();
      if (!childId || visited.has(childId)) return;
      visited.add(childId);
      nextFrontier.push(childId);
    });
    frontier = nextFrontier;
  }

  return visited;
};

export const getEffectiveAccessibleProductIds = async (userId: string): Promise<Set<string>> => {
  const directIds = await loadDirectAccessibleProductIds(userId);
  return expandProductIdsWithComboChildren(directIds);
};

export const loadAccessibleProductIdsForSelection = async (
  userId: string | null,
  productIds: string[]
): Promise<Set<string>> => {
  if (!userId || !productIds.length) return new Set<string>();
  const effectiveIds = await getEffectiveAccessibleProductIds(userId);
  return new Set(productIds.filter((productId) => effectiveIds.has(productId)));
};

export const loadAccessibleMockTestIdsForUser = async (
  userId: string,
  mockTestIds: string[]
): Promise<Set<string>> => {
  if (!userId || !mockTestIds.length) return new Set<string>();
  const accessibleProductIds = Array.from(await getEffectiveAccessibleProductIds(userId));
  if (!accessibleProductIds.length) return new Set<string>();

  const mockPlaceholders = mockTestIds.map(() => "?").join(", ");
  const productPlaceholders = accessibleProductIds.map(() => "?").join(", ");
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT DISTINCT pmt.mockTestId
      FROM ProductMockTest pmt
      WHERE pmt.mockTestId IN (${mockPlaceholders})
        AND pmt.productId IN (${productPlaceholders})
    `,
    ...mockTestIds,
    ...accessibleProductIds
  )) as Array<{ mockTestId: string }>;

  return new Set(rows.map((row) => String(row.mockTestId || "").trim()).filter(Boolean));
};
