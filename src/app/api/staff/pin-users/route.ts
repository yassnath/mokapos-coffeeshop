import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
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
    return Response.json({ users: [] });
  }
}
