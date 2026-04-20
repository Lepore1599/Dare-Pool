import { Router, type IRouter } from "express";
import path from "path";
import { fileURLToPath } from "url";
import healthRouter from "./health";
import authRouter from "./auth";
import daresRouter from "./dares";
import entriesRouter from "./entries";
import votesRouter from "./votes";
import reportsRouter from "./reports";
import usersRouter from "./users";
import adminRouter from "./admin";
import seedRouter from "./seed";
import { entryCommentsRouter, dareCommentsRouter } from "./comments";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/dares", daresRouter);
router.use("/dares/:dareId/entries", entriesRouter);
router.use("/dares/:dareId/vote", votesRouter);
router.use("/dares/:dareId/comments", dareCommentsRouter);
router.use("/reports", reportsRouter);
router.use("/users", usersRouter);
router.use("/admin", adminRouter);
router.use("/seed", seedRouter);
router.use("/entries/:entryId/comments", entryCommentsRouter);

// Serve uploaded files
import express from "express";
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");
router.use("/uploads", express.static(UPLOAD_DIR));

export default router;
