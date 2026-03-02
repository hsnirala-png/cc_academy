ALTER TABLE `Question`
  ADD COLUMN `questionTextAlt` TEXT NULL AFTER `questionText`,
  ADD COLUMN `optionAAlt` TEXT NULL AFTER `optionA`,
  ADD COLUMN `optionBAlt` TEXT NULL AFTER `optionB`,
  ADD COLUMN `optionCAlt` TEXT NULL AFTER `optionC`,
  ADD COLUMN `optionDAlt` TEXT NULL AFTER `optionD`,
  ADD COLUMN `explanationAlt` TEXT NULL AFTER `explanation`;

ALTER TABLE `AttemptQuestion`
  ADD COLUMN `snapshotQuestionTextAlt` TEXT NULL AFTER `snapshotQuestionText`,
  ADD COLUMN `snapshotOptionAAlt` TEXT NULL AFTER `snapshotOptionA`,
  ADD COLUMN `snapshotOptionBAlt` TEXT NULL AFTER `snapshotOptionB`,
  ADD COLUMN `snapshotOptionCAlt` TEXT NULL AFTER `snapshotOptionC`,
  ADD COLUMN `snapshotOptionDAlt` TEXT NULL AFTER `snapshotOptionD`,
  ADD COLUMN `snapshotExplanationAlt` TEXT NULL AFTER `snapshotExplanation`;
