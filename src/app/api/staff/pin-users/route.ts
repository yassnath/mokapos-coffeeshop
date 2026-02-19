import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        pinHash: { not: null },
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return Response.json({ users });
  } catch (error) {
    console.error("[staff.pin-users] failed", error);
    return Response.json(
      {
        error: "Failed to fetch staff PIN users",
        ...(process.env.NODE_ENV !== "production" && error instanceof Error
          ? { detail: error.message }
          : {}),
      },
      { status: 500 },
    );
  }
}
