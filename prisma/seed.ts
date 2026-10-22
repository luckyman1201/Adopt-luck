import { PrismaClient } from "@prisma/client";
import { PETS, itemsValue, makeItem } from "../lib/pets";

const db = new PrismaClient();

const BOTS: Array<[string, string, number]> = [
  ["bot_1", "LunaTrade", 20],
  ["bot_2", "NeonFoxx", 47],
  ["bot_3", "ShadowKing", 64],
  ["bot_4", "Frostie", 111],
  ["bot_5", "AdoptAce", 158],
];

async function main() {
  for (const [id, name, hue] of BOTS) {
    await db.user.upsert({
      where: { id },
      update: { name, hue: Number(hue), isBot: true },
      create: { id, name, hue: Number(hue), isBot: true, wagered: 200, profit: 40, wins: 4, games: 10 },
    });
  }

  const existing = await db.game.count({ where: { status: "open" } });
  if (existing === 0) {
    const setups = [
      { id: "cf_seed_1", userId: "bot_1", side: "heads", petId: "turtle" },
      { id: "cf_seed_2", userId: "bot_3", side: "tails", petId: "arctic-reindeer" },
      { id: "cf_seed_3", userId: "bot_5", side: "heads", petId: "evil-unicorn" },
    ];
    for (const setup of setups) {
      const item = makeItem(setup.petId, { fly: true, ride: true });
      await db.inventoryItem.create({
        data: {
          id: item.uid,
          userId: setup.userId,
          petId: item.petId,
          fly: true,
          ride: true,
          locked: true,
        },
      });
      await db.game.create({
        data: {
          id: setup.id,
          mode: "coinflip",
          status: "open",
          entries: {
            create: {
              id: `${setup.id}_e`,
              userId: setup.userId,
              itemsJson: JSON.stringify([item]),
              side: setup.side,
            },
          },
        },
      });
    }

    const jpItem = makeItem("hedgehog", { ride: true });
    await db.inventoryItem.create({
      data: { id: jpItem.uid, userId: "bot_2", petId: jpItem.petId, ride: true, locked: true },
    });
    await db.game.create({
      data: {
        id: "jp_seed_1",
        mode: "jackpot",
        status: "open",
        entries: {
          create: { id: "jp_seed_1_e", userId: "bot_2", itemsJson: JSON.stringify([jpItem]) },
        },
      },
    });

    const rcItem = makeItem("flamingo", { fly: true });
    await db.inventoryItem.create({
      data: { id: rcItem.uid, userId: "bot_4", petId: rcItem.petId, fly: true, locked: true },
    });
    await db.game.create({
      data: {
        id: "rc_seed_1",
        mode: "race",
        status: "open",
        entries: {
          create: { id: "rc_seed_1_e", userId: "bot_4", itemsJson: JSON.stringify([rcItem]) },
        },
      },
    });
  }

  const chats = await db.chatMessage.count();
  if (chats === 0) {
    await db.chatMessage.create({
      data: { id: "msg_seed_1", userId: "bot_1", text: "lobby is live — values are Elvebredd" },
    });
  }

  console.log(`Seeded ${PETS.length} catalog pets in code, open games ready. Sample value ${itemsValue([makeItem("turtle")])}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
