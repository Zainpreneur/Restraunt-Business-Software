import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { lowStock } = req.query;
    const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
    const result = lowStock === "true" ? items.filter((i) => i.quantity <= i.reorderLevel) : items;
    res.json(result);
  })
);

const inventoryItemSchema = z.object({
  name: z.string().min(1),
  unit: z.string().default("unit"),
  quantity: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  costPerUnit: z.number().min(0).default(0),
  supplier: z.string().optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = inventoryItemSchema.parse(req.body);
    const item = await prisma.inventoryItem.create({ data });
    res.status(201).json(item);
  })
);

router.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const data = inventoryItemSchema.partial().parse(req.body);
    const item = await prisma.inventoryItem.update({ where: { id: req.params.id }, data });
    res.json(item);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

const txnSchema = z.object({
  type: z.enum(["PURCHASE", "USAGE", "ADJUSTMENT", "WASTE"]),
  quantity: z.number(),
  note: z.string().optional(),
});

router.post(
  "/:id/transactions",
  requireAuth,
  requireRole("ADMIN", "MANAGER", "CHEF"),
  asyncHandler(async (req, res) => {
    const data = txnSchema.parse(req.body);
    const delta = data.type === "PURCHASE" ? Math.abs(data.quantity) : -Math.abs(data.quantity);

    const [txn, item] = await prisma.$transaction([
      prisma.inventoryTransaction.create({ data: { ...data, quantity: delta, inventoryItemId: req.params.id } }),
      prisma.inventoryItem.update({ where: { id: req.params.id }, data: { quantity: { increment: delta } } }),
    ]);
    res.status(201).json({ txn, item });
  })
);

router.get(
  "/:id/transactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const txns = await prisma.inventoryTransaction.findMany({
      where: { inventoryItemId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(txns);
  })
);

// Recipe (ingredient) links for a menu item.
const recipeSchema = z.object({
  menuItemId: z.string().min(1),
  inventoryItemId: z.string().min(1),
  quantityUsed: z.number().positive(),
});

router.post(
  "/recipes",
  requireAuth,
  requireRole("ADMIN", "MANAGER", "CHEF"),
  asyncHandler(async (req, res) => {
    const data = recipeSchema.parse(req.body);
    const recipe = await prisma.recipeItem.upsert({
      where: { menuItemId_inventoryItemId: { menuItemId: data.menuItemId, inventoryItemId: data.inventoryItemId } },
      update: { quantityUsed: data.quantityUsed },
      create: data,
    });
    res.status(201).json(recipe);
  })
);

router.delete(
  "/recipes/:id",
  requireAuth,
  requireRole("ADMIN", "MANAGER", "CHEF"),
  asyncHandler(async (req, res) => {
    await prisma.recipeItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
