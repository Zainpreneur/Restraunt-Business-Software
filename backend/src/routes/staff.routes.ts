import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
    });
    res.json(users);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"]).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { password, ...rest } = updateSchema.parse(req.body);
    const data: any = { ...rest };
    if (password) data.passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    });
    res.json(user);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.status(204).send();
  })
);

// --- Shifts (clock in / clock out) ---

router.get(
  "/shifts",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (_req, res) => {
    const shifts = await prisma.shift.findMany({
      orderBy: { clockIn: "desc" },
      include: { user: { select: { id: true, name: true, role: true } } },
      take: 100,
    });
    res.json(shifts);
  })
);

router.post(
  "/shifts/clock-in",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const open = await prisma.shift.findFirst({ where: { userId: req.user!.sub, clockOut: null } });
    if (open) throw new ApiError(400, "Already clocked in");
    const shift = await prisma.shift.create({ data: { userId: req.user!.sub } });
    res.status(201).json(shift);
  })
);

router.post(
  "/shifts/clock-out",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const open = await prisma.shift.findFirst({ where: { userId: req.user!.sub, clockOut: null } });
    if (!open) throw new ApiError(400, "Not clocked in");
    const shift = await prisma.shift.update({ where: { id: open.id }, data: { clockOut: new Date() } });
    res.json(shift);
  })
);

export default router;
