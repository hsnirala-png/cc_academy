import { prisma } from "./prisma";

type ExistsRow = { present: number };

const rowExists = async (query: string, ...params: Array<string>): Promise<boolean> => {
  const rows = (await prisma.$queryRawUnsafe(query, ...params)) as ExistsRow[];
  return rows.length > 0;
};

export const hasColumn = async (tableName: string, columnName: string): Promise<boolean> =>
  rowExists(
    `
      SELECT 1 AS present
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    tableName,
    columnName
  );

export const hasIndex = async (tableName: string, indexName: string): Promise<boolean> =>
  rowExists(
    `
      SELECT 1 AS present
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    tableName,
    indexName
  );

export const hasConstraint = async (
  tableName: string,
  constraintName: string,
  constraintType?: "FOREIGN KEY" | "UNIQUE"
): Promise<boolean> =>
  rowExists(
    `
      SELECT 1 AS present
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        ${constraintType ? "AND CONSTRAINT_TYPE = ?" : ""}
      LIMIT 1
    `,
    ...(constraintType ? [tableName, constraintName, constraintType] : [tableName, constraintName])
  );
