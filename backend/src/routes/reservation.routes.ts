import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { date, status } = req.query;
    const where: any = {};
    if (typeof status === "string") where.status = status;
    if (typeof date === "string") {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.date = { gte: start, lt: end };
    }
    const reservations = await prisma.reservation.findMany({
      where,
      include: { table: true, customer: true },
      orderBy: { date: "asc" },
    });
    res.json(reservations);
  })
);

const reservationSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  partySize: z.number().int().positive(),
  date: z.coerce.date(),
  tableId: z.string().optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "SEATED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
  notes: z.string().optional(),
});

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = reservationSchema.parse(req.body);
    const reservation = await prisma.reservation.create({ data, include: { table: true } });
    if (data.tableId) {
      await prisma.restaurantTable.update({
        where: { id: data.tableId },
        data: { status: "RESERVED" },
      });
    }
    res.status(201).json(reservation);
  })
);

router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = reservationSchema.partial().parse(req.body);
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data,
      include: { table: true },
    });

    if (data.status === "SEATED" && reservation.tableId) {
      await prisma.restaurantTable.update({
        where: { id: reservation.tableId },
        data: { status: "OCCUPIED" },
      });
    }
    if ((data.status === "CANCELLED" || data.status === "COMPLETED") && reservation.tableId) {
      await prisma.restaurantTable.update({
        where: { id: reservation.tableId },
        data: { status: "AVAILABLE" },
      });
    }
    res.json(reservation);
  })
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.reservation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

export default router;
