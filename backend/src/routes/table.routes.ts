import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tables = await prisma.restaurantTable.findMany({
      orderBy: { number: "asc" },
      include: {
        orders: {
          where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
          include: { items: { include: { menuItem: true } } },
        },
      },
    });
    res.json(tables);
  })
);

const tableSchema = z.object({
  number: z.number().int().positive(),
  capacity: z.number().int().positive().default(2),
  location: z.string().optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"]).optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = tableSchema.parse(req.body);
    const table = await prisma.restaurantTable.create({ data });
    res.status(201).json(table);
  })
);

router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER", "WAITER", "CASHIER"),
  asyncHandler(async (req, res) => {
    const data = tableSchema.partial().parse(req.body);
    const table = await prisma.restaurantTable.update({ where: { id: req.params.id }, data });
    res.json(table);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.restaurantTable.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
