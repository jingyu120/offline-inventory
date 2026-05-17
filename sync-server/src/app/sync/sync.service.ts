import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import type {
  InventoryItemRecord,
  PullChangesResponse,
  PushChangesBody,
  WatermelonChangeSet,
} from '@burma-inventory/shared-types';

type PrismaInventoryItem = {
  id: string;
  barcode: string;
  name: string;
  quantity: number;
  status: string;
  userId: string | null;
  location: string | null;
  receivedAt: Date | null;
  soldAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private prisma!: PrismaClient;

  async onModuleInit() {
    const url = process.env['DATABASE_URL'];
    console.log(
      `[SyncService] Initializing Prisma with URL: ${url ? 'FOUND' : 'MISSING'}`,
    );

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

  private mapToRecord(item: PrismaInventoryItem): InventoryItemRecord {
    return {
      id: item.id,
      barcode: item.barcode,
      name: item.name,
      quantity: item.quantity,
      status: item.status as InventoryItemRecord['status'],
      user_id: item.userId,
      location: item.location,
      received_at: item.receivedAt ? item.receivedAt.getTime() : null,
      sold_at: item.soldAt ? item.soldAt.getTime() : null,
      created_at: item.createdAt.getTime(),
      updated_at: item.updatedAt.getTime(),
    };
  }

  async pullChanges(lastPulledAt: number): Promise<PullChangesResponse> {
    const timestamp = new Date(lastPulledAt || 0);

    const [createdItems, updatedItems, deletedItems] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { createdAt: { gt: timestamp } },
      }),
      this.prisma.inventoryItem.findMany({
        where: { updatedAt: { gt: timestamp }, createdAt: { lte: timestamp } },
      }),
      this.prisma.inventoryItem.findMany({
        where: { deletedAt: { gt: timestamp } },
      }),
    ]);

    const changeset: WatermelonChangeSet<InventoryItemRecord> = {
      created: createdItems.map((item) => this.mapToRecord(item)),
      updated: updatedItems.map((item) => this.mapToRecord(item)),
      deleted: deletedItems.map((item) => item.id),
    };

    return {
      changes: { inventory_items: changeset },
      timestamp: Date.now(),
    };
  }

  async pushChanges(changes: PushChangesBody['changes']): Promise<void> {
    const { inventory_items } = changes;
    if (!inventory_items) return;

    const { created, updated, deleted } = inventory_items;

    if (created.length > 0) {
      await this.prisma.inventoryItem.createMany({
        data: created.map((item) => ({
          id: item.id,
          barcode: item.barcode,
          name: item.name,
          quantity: item.quantity,
          status: item.status,
          userId: item.user_id,
          location: item.location,
          receivedAt: item.received_at ? new Date(item.received_at) : null,
          soldAt: item.sold_at ? new Date(item.sold_at) : null,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at),
        })),
        skipDuplicates: true,
      });
    }

    for (const item of updated) {
      await this.prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          barcode: item.barcode,
          name: item.name,
          quantity: item.quantity,
          status: item.status,
          userId: item.user_id,
          location: item.location,
          receivedAt: item.received_at ? new Date(item.received_at) : null,
          soldAt: item.sold_at ? new Date(item.sold_at) : null,
          updatedAt: new Date(item.updated_at),
        },
      });
    }

    if (deleted.length > 0) {
      await this.prisma.inventoryItem.updateMany({
        where: { id: { in: deleted } },
        data: { deletedAt: new Date() },
      });
    }
  }
}
