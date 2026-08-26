import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const orderInclude = {
  items: { include: { menuItem: true } },
  table: true,
  customer: true,
  waiter: { select: { id: true, name: true } },
  payments: true,
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, tableId, type } = req.query;
    const orders = await prisma.order.findMany({
      where: {
        status: typeof status === "string" ? (status as any) : undefined,
        tableId: typeof tableId === "string" ? tableId : undefined,
        type: typeof type === "string" ? (type as any) : undefined,
      },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: req.params.id },
      include: orderInclude,
    });
    res.json(order);
  })
);

const orderItemInput = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("DINE_IN"),
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  taxRate: z.number().min(0).max(1).default(0.08),
  discount: z.number().min(0).default(0),
  items: z.array(orderItemInput).min(1),
});

async function computeTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const subtotal = items
    .filter((i) => i.status !== "CANCELLED")
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * order.taxRate;
  const total = Math.max(0, subtotal + tax - order.discount);
  return prisma.order.update({
    where: { id: orderId },
    data: { subtotal, tax, total },
    include: orderInclude,
  });
}

// Deducts recipe-linked inventory for every item on an order and logs a
// USAGE transaction per ingredient consumed.
async function deductInventoryForItems(items: { menuItemId: string; quantity: number }[]) {
  for (const item of items) {
    const recipeLinks = await prisma.recipeItem.findMany({ where: { menuItemId: item.menuItemId } });
    for (const link of recipeLinks) {
      const used = link.quantityUsed * item.quantity;
      await prisma.inventoryItem.update({
        where: { id: link.inventoryItemId },
        data: { quantity: { decrement: used } },
      });
      await prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: link.inventoryItemId,
          type: "USAGE",
          quantity: -used,
          note: `Order item x${item.quantity}`,
        },
      });
    }
  }
}

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const data = createOrderSchema.parse(req.body);

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: data.items.map((i) => i.menuItemId) } },
    });
    if (menuItems.length !== new Set(data.items.map((i) => i.menuItemId)).size) {
      throw new ApiError(400, "One or more menu items were not found");
    }
    const priceMap = new Map(menuItems.map((m) => [m.id, m.price]));

    const order = await prisma.order.create({
      data: {
        type: data.type,
        tableId: data.tableId,
        customerId: data.customerId,
        waiterId: req.user!.sub,
        taxRate: data.taxRate,
        discount: data.discount,
        items: {
          create: data.items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            price: priceMap.get(i.menuItemId)!,
            notes: i.notes,
          })),
        },
      },
      include: orderInclude,
    });

    if (data.tableId) {
      await prisma.restaurantTable.update({ where: { id: data.tableId }, data: { status: "OCCUPIED" } });
    }

    await deductInventoryForItems(data.items);
    const finalOrder = await computeTotals(order.id);
    res.status(201).json(finalOrder);
  })
);

const addItemsSchema = z.object({ items: z.array(orderItemInput).min(1) });

router.post(
  "/:id/items",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { items } = addItemsSchema.parse(req.body);
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: items.map((i) => i.menuItemId) } } });
    const priceMap = new Map(menuItems.map((m) => [m.id, m.price]));

    await prisma.orderItem.createMany({
      data: items.map((i) => ({
        orderId: req.params.id,
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        price: priceMap.get(i.menuItemId) ?? 0,
        notes: i.notes,
      })),
    });
    await deductInventoryForItems(items);
    const order = await computeTotals(req.params.id);
    res.json(order);
  })
);

router.patch(
  "/:id/items/:itemId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      status: z.enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"]).optional(),
      quantity: z.number().int().positive().optional(),
    });
    const data = schema.parse(req.body);
    await prisma.orderItem.update({ where: { id: req.params.itemId }, data });
    const order = await computeTotals(req.params.id);
    res.json(order);
  })
);

router.delete(
  "/:id/items/:itemId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.orderItem.delete({ where: { id: req.params.itemId } });
    const order = await computeTotals(req.params.id);
    res.json(order);
  })
);

const updateOrderSchema = z.object({
  status: z.enum(["OPEN", "PREPARING", "READY", "SERVED", "COMPLETED", "CANCELLED"]).optional(),
  discount: z.number().min(0).optional(),
});

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateOrderSchema.parse(req.body);
    await prisma.order.update({ where: { id: req.params.id }, data });
    const order = await computeTotals(req.params.id);

    if (data.status === "COMPLETED" || data.status === "CANCELLED") {
      if (order.tableId) {
        await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "AVAILABLE" } });
      }
    }
    res.json(order);
  })
);

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "ONLINE", "WALLET"]),
  amount: z.number().positive(),
  tip: z.number().min(0).default(0),
});

router.post(
  "/:id/payments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = paymentSchema.parse(req.body);
    await prisma.payment.create({ data: { ...data, orderId: req.params.id } });

    const payments = await prisma.payment.findMany({ where: { orderId: req.params.id } });
    const order = await prisma.order.findUniqueOrThrow({ where: { id: req.params.id } });
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    if (totalPaid >= order.total) {
      await prisma.order.update({ where: { id: req.params.id }, data: { status: "COMPLETED" } });
      if (order.tableId) {
        await prisma.restaurantTable.update({ where: { id: order.tableId }, data: { status: "AVAILABLE" } });
      }
      if (order.customerId) {
        await prisma.customer.update({
          where: { id: order.customerId },
          data: { loyaltyPoints: { increment: Math.floor(order.total) } },
        });
      }
    }

    const finalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: req.params.id },
      include: orderInclude,
    });
    res.status(201).json(finalOrder);
  })
);

export default router;
