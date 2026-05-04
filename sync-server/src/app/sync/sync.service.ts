import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private prisma!: PrismaClient;

  async onModuleInit() {
    const url = process.env['DATABASE_URL'];
    console.log(`[SyncService] Initializing Prisma with URL: ${url ? 'FOUND' : 'MISSING'}`);
    
    if (!url) {
      throw new Error('DATABASE_URL is not defined');
    }

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    
    this.prisma = new PrismaClient({ adapter });
    await this.prisma.$connect();
    console.log('[SyncService] Prisma connected successfully via PG Adapter');
  }

  async onModuleDestroy() {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }

  async pullChanges(lastPulledAt: number) {
    const timestamp = new Date(lastPulledAt || 0);

    const createdItems = await this.prisma.inventoryItem.findMany({
      where: { createdAt: { gt: timestamp } },
    });

    const updatedItems = await this.prisma.inventoryItem.findMany({
      where: { updatedAt: { gt: timestamp }, createdAt: { lte: timestamp } },
    });

    const deletedItems = await this.prisma.inventoryItem.findMany({
      where: { deletedAt: { gt: timestamp } },
    });

    return {
      changes: {
        inventory_items: {
          created: createdItems,
          updated: updatedItems,
          deleted: deletedItems.map((item: any) => item.id),
        },
      },
      timestamp: Date.now(),
    };
  }

  async pushChanges(changes: any) {
    const { inventory_items } = changes;

    if (inventory_items) {
      if (inventory_items.created.length > 0) {
        await this.prisma.inventoryItem.createMany({
          data: inventory_items.created.map((item: any) => ({
            id: item.id,
            barcode: item.barcode,
            name: item.name,
            quantity: item.quantity,
            status: item.status,
            userId: item.userId,
            location: item.location,
            createdAt: new Date(item.created_at || Date.now()),
            updatedAt: new Date(item.updated_at || Date.now()),
          })),
          skipDuplicates: true,
        });
      }

      if (inventory_items.updated.length > 0) {
        for (const item of inventory_items.updated) {
          await this.prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              barcode: item.barcode,
              name: item.name,
              quantity: item.quantity,
              status: item.status,
              userId: item.userId,
              location: item.location,
              updatedAt: new Date(item.updated_at || Date.now()),
            },
          });
        }
      }

      if (inventory_items.deleted.length > 0) {
        await this.prisma.inventoryItem.updateMany({
          where: { id: { in: inventory_items.deleted } },
          data: { deletedAt: new Date() },
        });
      }
    }
  }
}
