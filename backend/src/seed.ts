import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@restaurant.com" },
    update: {},
    create: { name: "Alex Admin", email: "admin@restaurant.com", passwordHash, role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "manager@restaurant.com" },
    update: {},
    create: { name: "Maria Manager", email: "manager@restaurant.com", passwordHash, role: "MANAGER" },
  });

  const waiter = await prisma.user.upsert({
    where: { email: "waiter@restaurant.com" },
    update: {},
    create: { name: "Will Waiter", email: "waiter@restaurant.com", passwordHash, role: "WAITER" },
  });

  await prisma.user.upsert({
    where: { email: "chef@restaurant.com" },
    update: {},
    create: { name: "Carla Chef", email: "chef@restaurant.com", passwordHash, role: "CHEF" },
  });

  const categories = await Promise.all(
    ["Starters", "Main Course", "Desserts", "Beverages"].map((name, i) =>
      prisma.category.upsert({ where: { name }, update: {}, create: { name, sortOrder: i } })
    )
  );

  const [starters, mains, desserts, beverages] = categories;

  const menuData = [
    { name: "Bruschetta", price: 8.5, cost: 2.5, categoryId: starters.id, isVeg: true, description: "Grilled bread topped with tomato, garlic and basil." },
    { name: "Calamari Fritti", price: 11.0, cost: 4.0, categoryId: starters.id, description: "Crispy fried squid with marinara sauce." },
    { name: "Margherita Pizza", price: 14.0, cost: 4.5, categoryId: mains.id, isVeg: true, description: "San Marzano tomatoes, mozzarella, basil." },
    { name: "Grilled Salmon", price: 22.0, cost: 8.0, categoryId: mains.id, description: "Served with seasonal vegetables and lemon butter." },
    { name: "Ribeye Steak", price: 28.0, cost: 11.0, categoryId: mains.id, spiceLevel: 1, description: "12oz ribeye, garlic mash, red wine jus." },
    { name: "Mushroom Risotto", price: 16.5, cost: 5.0, categoryId: mains.id, isVeg: true, description: "Creamy arborio rice with wild mushrooms." },
    { name: "Tiramisu", price: 7.5, cost: 2.0, categoryId: desserts.id, isVeg: true, description: "Classic Italian coffee-flavored dessert." },
    { name: "Chocolate Lava Cake", price: 8.0, cost: 2.2, categoryId: desserts.id, isVeg: true, description: "Warm cake with a molten chocolate center." },
    { name: "Sparkling Water", price: 3.5, cost: 0.5, categoryId: beverages.id, isVeg: true, description: "500ml bottle." },
    { name: "House Red Wine", price: 9.0, cost: 3.0, categoryId: beverages.id, isVeg: true, description: "Glass of the house red blend." },
  ];

  // MenuItem.name isn't a unique column, so find-or-create to keep the seed idempotent.
  const menuItems: { id: string; name: string }[] = [];
  for (const item of menuData) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    const created = existing ?? (await prisma.menuItem.create({ data: item }));
    menuItems.push(created);
  }

  const inventoryData = [
    { name: "Tomatoes", unit: "kg", quantity: 20, reorderLevel: 5, costPerUnit: 2.1 },
    { name: "Mozzarella", unit: "kg", quantity: 15, reorderLevel: 4, costPerUnit: 6.5 },
    { name: "Salmon Fillet", unit: "kg", quantity: 10, reorderLevel: 3, costPerUnit: 14.0 },
    { name: "Ribeye Beef", unit: "kg", quantity: 8, reorderLevel: 3, costPerUnit: 18.0 },
    { name: "Arborio Rice", unit: "kg", quantity: 12, reorderLevel: 3, costPerUnit: 3.2 },
    { name: "Mixed Mushrooms", unit: "kg", quantity: 6, reorderLevel: 2, costPerUnit: 7.0 },
    { name: "Coffee (Espresso)", unit: "kg", quantity: 4, reorderLevel: 1, costPerUnit: 12.0 },
    { name: "House Red Wine", unit: "bottle", quantity: 24, reorderLevel: 6, costPerUnit: 8.0 },
  ];
  const inventoryItems: { id: string; name: string }[] = [];
  for (const item of inventoryData) {
    const created = await prisma.inventoryItem.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
    inventoryItems.push(created);
  }

  const tables = await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      prisma.restaurantTable.upsert({
        where: { number: i + 1 },
        update: {},
        create: { number: i + 1, capacity: (i % 4) + 2, location: i < 5 ? "Main Hall" : "Patio" },
      })
    )
  );

  const customer = await prisma.customer.upsert({
    where: { phone: "555-0100" },
    update: {},
    create: { name: "Jamie Diner", phone: "555-0100", email: "jamie@example.com" },
  });

  // Link a few menu items to the inventory they consume, so placing an
  // order automatically deducts stock.
  const byName = (list: { id: string; name: string }[], name: string) =>
    list.find((x) => x.name === name)!.id;

  const recipeLinks: { menuItem: string; inventoryItem: string; qty: number }[] = [
    { menuItem: "Margherita Pizza", inventoryItem: "Tomatoes", qty: 0.2 },
    { menuItem: "Margherita Pizza", inventoryItem: "Mozzarella", qty: 0.15 },
    { menuItem: "Grilled Salmon", inventoryItem: "Salmon Fillet", qty: 0.25 },
    { menuItem: "Ribeye Steak", inventoryItem: "Ribeye Beef", qty: 0.35 },
    { menuItem: "Mushroom Risotto", inventoryItem: "Arborio Rice", qty: 0.15 },
    { menuItem: "Mushroom Risotto", inventoryItem: "Mixed Mushrooms", qty: 0.1 },
    { menuItem: "Tiramisu", inventoryItem: "Coffee (Espresso)", qty: 0.02 },
    { menuItem: "House Red Wine", inventoryItem: "House Red Wine", qty: 1 },
  ];

  for (const link of recipeLinks) {
    const menuItemId = byName(menuItems, link.menuItem);
    const inventoryItemId = byName(inventoryItems, link.inventoryItem);
    await prisma.recipeItem.upsert({
      where: { menuItemId_inventoryItemId: { menuItemId, inventoryItemId } },
      update: { quantityUsed: link.qty },
      create: { menuItemId, inventoryItemId, quantityUsed: link.qty },
    });
  }

  console.log("Seed complete:", {
    admin: admin.email,
    waiter: waiter.email,
    categories: categories.length,
    menuItems: menuItems.length,
    inventoryItems: inventoryItems.length,
    tables: tables.length,
    customer: customer.name,
  });
  console.log("\nLogin with any seeded user + password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
