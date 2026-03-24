ALTER TABLE `Question`
  ADD COLUMN `displayOrder` INTEGER NOT NULL DEFAULT 0 AFTER `sectionLabel`;

UPDATE `Question` q
INNER JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY mockTestId ORDER BY createdAt ASC, id ASC) AS nextDisplayOrder
  FROM `Question`
) ordered ON ordered.id = q.id
SET q.displayOrder = ordered.nextDisplayOrder;

CREATE INDEX `Question_mockTestId_displayOrder_idx` ON `Question`(`mockTestId`, `displayOrder`);
