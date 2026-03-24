SET @has_section_label := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Question'
    AND COLUMN_NAME = 'sectionLabel'
);
SET @add_section_label_sql := IF(
  @has_section_label = 0,
  'ALTER TABLE `Question` ADD COLUMN `sectionLabel` VARCHAR(120) NULL AFTER `explanation`',
  'SELECT 1'
);
PREPARE add_section_label_stmt FROM @add_section_label_sql;
EXECUTE add_section_label_stmt;
DEALLOCATE PREPARE add_section_label_stmt;

SET @has_section_label_index := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Question'
    AND INDEX_NAME = 'Question_mockTestId_sectionLabel_isActive_idx'
);
SET @add_section_label_index_sql := IF(
  @has_section_label_index = 0,
  'CREATE INDEX `Question_mockTestId_sectionLabel_isActive_idx` ON `Question`(`mockTestId`, `sectionLabel`, `isActive`)',
  'SELECT 1'
);
PREPARE add_section_label_index_stmt FROM @add_section_label_index_sql;
EXECUTE add_section_label_index_stmt;
DEALLOCATE PREPARE add_section_label_index_stmt;
