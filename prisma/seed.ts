import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.refundVoid.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.productModifierGroup.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.register.deleteMany();
  await prisma.storeSetting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  const [adminPassword, managerPassword, cashierPassword, baristaPassword] = await Promise.all([
    bcrypt.hash("password", 10),
    bcrypt.hash("password", 10),
    bcrypt.hash("password", 10),
    bcrypt.hash("password", 10),
  ]);

  const [adminPin, managerPin, cashierPin, baristaPin] = await Promise.all([
    bcrypt.hash("123456", 10),
    bcrypt.hash("333333", 10),
    bcrypt.hash("111111", 10),
    bcrypt.hash("222222", 10),
  ]);

  const store = await prisma.store.create({
    data: {
      name: "Solvix Roastery & Coffee",
      slug: "solvix-coffee",
      address: "Jl. Kemang Raya No.10, Jakarta",
      phone: "+62 812-3456-7890",
      taxRate: 11,
      serviceChargeRate: 5,
      roundingUnit: 100,
      receiptHeader: "Fresh coffee crafted daily",
      receiptFooter: "Thank you for choosing Solvix POS",
      settings: {
        create: {
          printerName: "EPSON-TM-m30",
          receiptCopies: 1,
          allowTips: true,
        },
      },
    },
  });

  const register = await prisma.register.create({
    data: {
      storeId: store.id,
      name: "Main Counter",
      code: "REG-001",
      isActive: true,
    },
  });

  const [coffeeCategory, nonCoffeeCategory, bakeryCategory] = await Promise.all([
    prisma.category.create({ data: { storeId: store.id, name: "Coffee", sortOrder: 1 } }),
    prisma.category.create({ data: { storeId: store.id, name: "Non-Coffee", sortOrder: 2 } }),
    prisma.category.create({ data: { storeId: store.id, name: "Pastry", sortOrder: 3 } }),
  ]);

  const sizeGroup = await prisma.modifierGroup.create({
    data: {
      storeId: store.id,
      name: "Size",
      required: true,
      minSelect: 1,
      maxSelect: 1,
      isMulti: false,
      sortOrder: 1,
      options: {
        create: [
          { name: "Small", priceDelta: 0, sortOrder: 1 },
          { name: "Medium", priceDelta: 3000, sortOrder: 2 },
          { name: "Large", priceDelta: 6000, sortOrder: 3 },
        ],
      },
    },
  });

  const tempGroup = await prisma.modifierGroup.create({
    data: {
      storeId: store.id,
      name: "Temperature",
      required: true,
      minSelect: 1,
      maxSelect: 1,
      isMulti: false,
      sortOrder: 2,
      options: {
        create: [
          { name: "Hot", priceDelta: 0, sortOrder: 1 },
          { name: "Iced", priceDelta: 0, sortOrder: 2 },
        ],
      },
    },
  });

  const milkGroup = await prisma.modifierGroup.create({
    data: {
      storeId: store.id,
      name: "Milk",
      required: false,
      minSelect: 0,
      maxSelect: 1,
      isMulti: false,
      sortOrder: 3,
      options: {
        create: [
          { name: "Dairy", priceDelta: 0, sortOrder: 1 },
          { name: "Oat", priceDelta: 4000, sortOrder: 2 },
          { name: "Almond", priceDelta: 4000, sortOrder: 3 },
        ],
      },
    },
  });

  const sugarGroup = await prisma.modifierGroup.create({
    data: {
      storeId: store.id,
      name: "Sugar",
      required: false,
      minSelect: 0,
      maxSelect: 1,
      isMulti: false,
      sortOrder: 4,
      options: {
        create: [
          { name: "No sugar", priceDelta: 0, sortOrder: 1 },
          { name: "Less sugar", priceDelta: 0, sortOrder: 2 },
          { name: "Regular sugar", priceDelta: 0, sortOrder: 3 },
        ],
      },
    },
  });

  const addonsGroup = await prisma.modifierGroup.create({
    data: {
      storeId: store.id,
      name: "Add-ons",
      required: false,
      minSelect: 0,
      maxSelect: 3,
      isMulti: true,
      sortOrder: 5,
      options: {
        create: [
          { name: "Extra shot", priceDelta: 5000, sortOrder: 1 },
          { name: "Vanilla syrup", priceDelta: 3000, sortOrder: 2 },
          { name: "Caramel syrup", priceDelta: 3000, sortOrder: 3 },
        ],
      },
    },
  });

  const productSeeds = [
    { name: "Espresso", basePrice: 18000, categoryId: coffeeCategory.id, imageSeed: "espresso" },
    {
      name: "Americano",
      basePrice: 24000,
      categoryId: coffeeCategory.id,
      imageSeed: "americano",
    },
    {
      name: "Cappuccino",
      basePrice: 30000,
      categoryId: coffeeCategory.id,
      imageSeed: "cappuccino",
      isFavorite: true,
    },
    {
      name: "Latte",
      basePrice: 32000,
      categoryId: coffeeCategory.id,
      imageSeed: "latte",
      isFavorite: true,
    },
    {
      name: "Flat White",
      basePrice: 33000,
      categoryId: coffeeCategory.id,
      imageSeed: "flatwhite",
    },
    { name: "Mocha", basePrice: 35000, categoryId: coffeeCategory.id, imageSeed: "mocha" },
    {
      name: "Caramel Macchiato",
      basePrice: 37000,
      categoryId: coffeeCategory.id,
      imageSeed: "caramelmacchiato",
      isFavorite: true,
    },
    {
      name: "Hazelnut Latte",
      basePrice: 36000,
      categoryId: coffeeCategory.id,
      imageSeed: "hazelnutlatte",
    },
    {
      name: "Matcha Latte",
      basePrice: 34000,
      categoryId: nonCoffeeCategory.id,
      imageSeed: "matchalatte",
      isFavorite: true,
    },
    {
      name: "Chocolate Latte",
      basePrice: 31000,
      categoryId: nonCoffeeCategory.id,
      imageSeed: "chocolatelatte",
    },
    {
      name: "Taro Latte",
      basePrice: 32000,
      categoryId: nonCoffeeCategory.id,
      imageSeed: "tarolatte",
    },
    {
      name: "Red Velvet Latte",
      basePrice: 33000,
      categoryId: nonCoffeeCategory.id,
      imageSeed: "redvelvetlatte",
    },
    { name: "Thai Tea", basePrice: 28000, categoryId: nonCoffeeCategory.id, imageSeed: "thaitea" },
    {
      name: "Lemon Tea",
      basePrice: 24000,
      categoryId: nonCoffeeCategory.id,
      imageSeed: "lemontea",
    },
    {
      name: "Fresh Orange",
      basePrice: 26000,
      categoryId: nonCoffeeCategory.id,
      imageSeed: "freshorange",
    },
    {
      name: "Butter Croissant",
      basePrice: 22000,
      categoryId: bakeryCategory.id,
      imageSeed: "buttercroissant",
      isFavorite: true,
    },
    {
      name: "Chocolate Croissant",
      basePrice: 24000,
      categoryId: bakeryCategory.id,
      imageSeed: "chocolatecroissant",
    },
    {
      name: "Almond Danish",
      basePrice: 25000,
      categoryId: bakeryCategory.id,
      imageSeed: "almonddanish",
    },
    {
      name: "Cinnamon Roll",
      basePrice: 26000,
      categoryId: bakeryCategory.id,
      imageSeed: "cinnamonroll",
    },
    {
      name: "Chicken Puff",
      basePrice: 23000,
      categoryId: bakeryCategory.id,
      imageSeed: "chickenpuff",
    },
  ];

  const products = await Promise.all(
    productSeeds.map((product, index) =>
      prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: product.categoryId,
          name: product.name,
          basePrice: product.basePrice,
          costPrice: Math.max(product.basePrice - 5000, 0),
          stock: 100,
          imageUrl: `https://picsum.photos/seed/${product.imageSeed}/480/320`,
          isFavorite: product.isFavorite ?? false,
          sortOrder: index + 1,
        },
      }),
    ),
  );

  const liquidProductIds = products
    .filter((product) => product.categoryId !== bakeryCategory.id)
    .map((product) => product.id);

  for (const productId of liquidProductIds) {
    await prisma.productModifierGroup.createMany({
      data: [
        { productId, groupId: sizeGroup.id, sortOrder: 1 },
        { productId, groupId: tempGroup.id, sortOrder: 2 },
        { productId, groupId: milkGroup.id, sortOrder: 3 },
        { productId, groupId: sugarGroup.id, sortOrder: 4 },
        { productId, groupId: addonsGroup.id, sortOrder: 5 },
      ],
      skipDuplicates: true,
    });
  }

  const [admin, , cashier] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Owner Admin",
        email: "admin@solvixpos.local",
        username: "admin",
        passwordHash: adminPassword,
        pinHash: adminPin,
        role: Role.ADMIN,
        defaultStoreId: store.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Manager One",
        email: "manager@solvixpos.local",
        username: "manager1",
        passwordHash: managerPassword,
        pinHash: managerPin,
        role: Role.MANAGER,
        defaultStoreId: store.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Cashier One",
        email: "cashier@solvixpos.local",
        username: "cashier1",
        passwordHash: cashierPassword,
        pinHash: cashierPin,
        role: Role.CASHIER,
        defaultStoreId: store.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Barista One",
        email: "barista@solvixpos.local",
        username: "barista1",
        passwordHash: baristaPassword,
        pinHash: baristaPin,
        role: Role.BARISTA,
        defaultStoreId: store.id,
      },
    }),
  ]);

  const walkIn = await prisma.customer.create({
    data: {
      storeId: store.id,
      name: "Walk-in",
      isWalkIn: true,
    },
  });

  await prisma.customer.createMany({
    data: [
      { storeId: store.id, name: "Andi Wijaya", phone: "+628111223344" },
      { storeId: store.id, name: "Nadia Putri", phone: "+628555667788" },
    ],
  });

  const shift = await prisma.shift.create({
    data: {
      storeId: store.id,
      registerId: register.id,
      userId: cashier.id,
      openingCash: 500000,
      status: "OPEN",
    },
  });

  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: "SVX-DEMO-0001",
      storeId: store.id,
      registerId: register.id,
      shiftId: shift.id,
      cashierId: cashier.id,
      customerId: walkIn.id,
      status: "NEW",
      subtotal: 62000,
      itemDiscount: 0,
      orderDiscount: 0,
      taxAmount: 6820,
      serviceChargeAmount: 3100,
      tipAmount: 0,
      roundingAmount: 80,
      totalAmount: 72000,
      items: {
        create: [
          {
            productId: products.find((product) => product.name === "Latte")?.id,
            productName: "Latte",
            unitPrice: 32000,
            quantity: 1,
            discountAmount: 0,
            lineTotal: 32000,
            modifiers: {
              create: [
                {
                  modifierGroupName: "Size",
                  modifierOptionName: "Large",
                  priceDelta: 6000,
                },
                {
                  modifierGroupName: "Temperature",
                  modifierOptionName: "Iced",
                  priceDelta: 0,
                },
              ],
            },
          },
          {
            productId: products.find((product) => product.name === "Butter Croissant")?.id,
            productName: "Butter Croissant",
            unitPrice: 22000,
            quantity: 1,
            discountAmount: 0,
            lineTotal: 22000,
          },
        ],
      },
      payments: {
        create: [
          {
            shiftId: shift.id,
            method: "CASH",
            amount: 72000,
          },
        ],
      },
      auditLogs: {
        create: {
          storeId: store.id,
          userId: cashier.id,
          action: "ORDER_CREATED",
          entity: "Order",
          entityId: "SVX-DEMO-0001",
          message: "Demo order created by seed script",
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      storeId: store.id,
      userId: admin.id,
      orderId: sampleOrder.id,
      action: "SYSTEM_SEED",
      entity: "Store",
      entityId: store.id,
      message: "Seed completed with demo data",
    },
  });

  console.log("Seed complete");
  console.log("Admin login: admin@solvixpos.local / password / PIN 123456");
  console.log("Manager login: manager@solvixpos.local / password / PIN 333333");
  console.log("Cashier login: cashier@solvixpos.local / password / PIN 111111");
  console.log("Barista login: barista@solvixpos.local / password / PIN 222222");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
