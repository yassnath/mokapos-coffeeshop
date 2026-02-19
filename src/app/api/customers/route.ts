import { customerCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  const q = searchParams.get("q")?.trim();

  if (!storeId) return Response.json({ customers: [] });

  const customers = await prisma.customer.findMany({
    where: {
      storeId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 30,
    select: { id: true, name: true, phone: true, email: true },
  });

  return Response.json({ customers });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = customerCreateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: parsed.data,
    select: { id: true, name: true, phone: true, email: true },
  });

  return Response.json({ customer }, { status: 201 });
}
