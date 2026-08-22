import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

router.get(
  "/summary",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const todayStart = startOfDay(new Date());
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const [todayOrders, completedToday, tables, lowStockItems, recentOrders] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.findMany({ where: { createdAt: { gte: todayStart }, status: "COMPLETED" } }),
      prisma.restaurantTable.findMany(),
      prisma.inventoryItem.findMany(),
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, total: true, status: true },
      }),
    ]);

    const revenueToday = completedToday.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = completedToday.length ? revenueToday / completedToday.length : 0;

    const tableStats = {
      total: tables.length,
      available: tables.filter((t) => t.status === "AVAILABLE").length,
      occupied: tables.filter((t) => t.status === "OCCUPIED").length,
      reserved: tables.filter((t) => t.status === "RESERVED").length,
    };

    const lowStock = lowStockItems.filter((i) => i.quantity <= i.reorderLevel);

    // Build a 7-day revenue series
    const series: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo);
      day.setDate(day.getDate() + i);
      const dayKey = day.toISOString().slice(0, 10);
      const dayOrders = recentOrders.filter(
        (o) => o.createdAt.toISOString().slice(0, 10) === dayKey && o.status === "COMPLETED"
      );
      series.push({
        date: dayKey,
        revenue: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      });
    }

    const topItemsRaw = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
      where: { order: { createdAt: { gte: sevenDaysAgo }, status: { not: "CANCELLED" } } },
    });
    const topMenuItems = await Promise.all(
      topItemsRaw.map(async (t) => {
        const item = await prisma.menuItem.findUnique({ where: { id: t.menuItemId } });
        return { name: item?.name ?? "Unknown", quantity: t._sum.quantity ?? 0 };
      })
    );

    res.json({
      ordersToday: todayOrders.length,
      completedToday: completedToday.length,
      revenueToday,
      avgOrderValue,
      tableStats,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 10),
      revenueSeries: series,
      topMenuItems,
    });
  })
);

export default router;
