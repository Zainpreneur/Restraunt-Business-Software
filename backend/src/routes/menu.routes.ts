import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { categoryId, available } = req.query;
    const menuItems = await prisma.menuItem.findMany({
      where: {
        categoryId: typeof categoryId === "string" ? categoryId : undefined,
        isAvailable: available === "true" ? true : available === "false" ? false : undefined,
      },
      include: { category: true },
      orderBy: { name: "asc" },
    });
    res.json(menuItems);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.menuItem.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { category: true, recipeItems: { include: { inventoryItem: true } } },
    });
    res.json(item);
  })
);

const menuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  cost: z.number().min(0).default(0),
  imageUrl: z.string().optional(),
  isAvailable: z.boolean().default(true),
  isVeg: z.boolean().default(false),
  spiceLevel: z.number().int().min(0).max(3).default(0),
  categoryId: z.string().min(1),
});

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = menuItemSchema.parse(req.body);
    const item = await prisma.menuItem.create({ data, include: { category: true } });
    res.status(201).json(item);
  })
);

router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = menuItemSchema.partial().parse(req.body);
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data,
      include: { category: true },
    });
    res.json(item);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
