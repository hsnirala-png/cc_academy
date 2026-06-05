import { AppError } from "../../utils/appError";
import { prisma } from "../../utils/prisma";
import { sanitizeTeacherHubText } from "../../utils/teacherHubSanitizer";
import { storeTeacherHubFile } from "../../utils/teacherHubStorage";
import { teacherEnrollmentService } from "./teacher-enrollment.service";
import { teacherOwnershipService } from "./teacher-ownership.service";
import { teacherProfileService } from "./teacher-profile.service";

const boardModel = () => (prisma as any).teacherBoard;
const boardSessionModel = () => (prisma as any).teacherBoardSession;
const boardArtifactModel = () => (prisma as any).teacherBoardArtifact;

const serializeBoard = (item: any) => ({
  id: item.id,
  teacherProfileId: item.teacherProfileId,
  enrollmentId: item.enrollmentId || null,
  batchId: item.batchId || null,
  title: item.title,
  status: item.status,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

const serializeArtifact = (item: any) => ({
  id: item.id,
  teacherBoardId: item.teacherBoardId,
  sessionId: item.sessionId || null,
  artifactType: item.artifactType,
  title: item.title || null,
  storageUrl: item.storageUrl || null,
  mimeType: item.mimeType || null,
  payloadJson: item.payloadJson || null,
  createdAt: item.createdAt?.toISOString?.() || null,
  updatedAt: item.updatedAt?.toISOString?.() || null,
});

export const teacherBoardService = {
  async createBoard(userId: string, input: any) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const scopedTarget = await teacherOwnershipService.validateContentTargetOwnership(
      userId,
      {
        enrollmentId: input.enrollmentId || null,
        batchId: input.batchId || null,
      },
      { allowBatchOnly: false }
    );
    const row = await boardModel().create({
      data: {
        teacherProfileId,
        enrollmentId: scopedTarget.enrollment?.id || null,
        batchId: scopedTarget.batch?.id || null,
        title: sanitizeTeacherHubText(input.title || "Teacher Board", "board title"),
        status: "ACTIVE",
      },
    });
    return serializeBoard(row);
  },

  async listTeacherBoards(userId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const rows = await boardModel().findMany({
      where: { teacherProfileId },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map(serializeBoard);
  },

  async getTeacherBoard(userId: string, boardId: string) {
    const teacherProfileId = await teacherProfileService.requireProfileIdForUser(userId);
    const board = await boardModel().findFirst({
      where: { id: boardId, teacherProfileId },
    });
    if (!board) throw new AppError("Teacher board not found.", 404, "TEACHER_HUB_BOARD_NOT_FOUND");
    const sessions = await boardSessionModel().findMany({
      where: { teacherBoardId: boardId },
      orderBy: [{ createdAt: "desc" }],
    });
    const artifacts = await boardArtifactModel().findMany({
      where: { teacherBoardId: boardId },
      orderBy: [{ createdAt: "desc" }],
    });
    return {
      board: serializeBoard(board),
      sessions: sessions.map((item: any) => ({
        id: item.id,
        teacherBoardId: item.teacherBoardId,
        startedAt: item.startedAt?.toISOString?.() || null,
        endedAt: item.endedAt?.toISOString?.() || null,
        status: item.status,
        summary: item.summary || null,
      })),
      artifacts: artifacts.map(serializeArtifact),
    };
  },

  async getStudentBoard(studentUserId: string, boardId: string) {
    const board = await boardModel().findUnique({ where: { id: boardId } });
    if (!board) throw new AppError("Teacher board not found.", 404, "TEACHER_HUB_BOARD_NOT_FOUND");
    if (board.enrollmentId) {
      await teacherEnrollmentService.requireStudentEnrollment(studentUserId, board.enrollmentId);
    } else if (board.batchId) {
      throw new AppError(
        "Batch board delivery is not available in Teacher Hub Phase 1.",
        403,
        "TEACHER_HUB_BATCH_BOARD_DISABLED"
      );
    } else {
      throw new AppError("Student board access is not available for this board.", 403, "TEACHER_HUB_BOARD_FORBIDDEN");
    }
    const artifacts = await boardArtifactModel().findMany({
      where: { teacherBoardId: boardId },
      orderBy: [{ createdAt: "desc" }],
    });
    return {
      board: serializeBoard(board),
      artifacts: artifacts.map(serializeArtifact),
    };
  },

  async createSession(userId: string, boardId: string, input: any) {
    const teacherBoard = await this.getTeacherBoard(userId, boardId);
    const row = await boardSessionModel().create({
      data: {
        teacherBoardId: teacherBoard.board.id,
        status: String(input.status || "OPEN").trim().toUpperCase(),
        summary: input.summary ? String(input.summary).trim() : null,
      },
    });
    return {
      id: row.id,
      teacherBoardId: row.teacherBoardId,
      startedAt: row.startedAt?.toISOString?.() || null,
      status: row.status,
      summary: row.summary || null,
    };
  },

  async saveWhiteboard(userId: string, boardId: string, input: any) {
    const teacherBoard = await this.getTeacherBoard(userId, boardId);
    const row = await boardArtifactModel().create({
      data: {
        teacherBoardId: teacherBoard.board.id,
        sessionId: input.sessionId || null,
        artifactType: "WHITEBOARD_STATE",
        title: input.title ? String(input.title).trim() : "Whiteboard Snapshot",
        payloadJson: input.payloadJson || {},
      },
    });
    return serializeArtifact(row);
  },

  async uploadBoardFile(userId: string, boardId: string, input: any) {
    const teacherBoard = await this.getTeacherBoard(userId, boardId);
    const stored = await storeTeacherHubFile("board-files", {
      fileName: String(input.fileName || "board-file"),
      mimeType: String(input.mimeType || "application/octet-stream"),
      fileBase64: String(input.fileBase64 || ""),
    });
    const row = await boardArtifactModel().create({
      data: {
        teacherBoardId: teacherBoard.board.id,
        sessionId: input.sessionId || null,
        artifactType: "FILE_PRESENTATION",
        title: input.title ? String(input.title).trim() : stored.fileName,
        storageUrl: stored.fileUrl,
        mimeType: stored.mimeType,
        payloadJson: {
          fileName: stored.fileName,
          byteSize: stored.byteSize,
        },
      },
    });
    return serializeArtifact(row);
  },
};
