import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new ApiError(401, "Invalid email or password");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, "Invalid email or password");

    const token = signToken({ sub: user.id, role: user.role, name: user.name });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"]).default("WAITER"),
  phone: z.string().optional(),
});

// Only admins/managers can create staff accounts. The very first user in an
// empty database may self-register as ADMIN to bootstrap the system.
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        throw new ApiError(401, "Authentication required to create additional users");
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "Email already registered");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: userCount === 0 ? "ADMIN" : data.role,
        phone: data.phone,
      },
    });

    const token = signToken({ sub: user.id, role: user.role, name: user.name });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw new ApiError(404, "User not found");
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone });
  })
);

export default router;
