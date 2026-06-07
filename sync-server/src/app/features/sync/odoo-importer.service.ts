import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../core/drizzle';
import * as schema from '@burma-inventory/shared-types';
import { eq, and, isNull } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class OdooImporterService {
  constructor(private readonly drizzle: DrizzleService) {}

  async importOdoo(
    csvText: string,
  ): Promise<{ importedCount: number; warnings: string[] }> {
    const parseCSV = (text: string): $Any[] => {
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) return [];

      const headers = lines[0]
        .split(',')
        .map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const parsedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values: string[] = [];
        let insideQuote = false;
        let currentVal = '';

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            insideQuote = !insideQuote;
          } else if (char === ',' && !insideQuote) {
            values.push(currentVal.trim());
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal.trim());

        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          let val = values[index] || '';
          val = val.replace(/^["']|["']$/g, '');
          rowData[header] = val;
        });
        parsedRows.push(rowData);
      }
      return parsedRows;
    };

    const rows = parseCSV(csvText);
    let importedCount = 0;
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row['Name'] || row['name'];
      const address = row['Address'] || row['address'];
      const regionName = row['Region'] || row['region'];
      const division = row['Division'] || row['division'] || 'Unknown Division';
      const contactName =
        row['ContactName'] ||
        row['contactName'] ||
        row['Contact Name'] ||
        row['contact_name'];
      const phoneNumber =
        row['PhoneNumber'] ||
        row['phoneNumber'] ||
        row['Phone Number'] ||
        row['phone_number'];
      const email = row['Email'] || row['email'];
      const priceTier =
        row['PriceTier'] ||
        row['priceTier'] ||
        row['Price Tier'] ||
        row['price_tier'] ||
        'Retailer';
      const ltvVal =
        row['LifetimeValue'] ||
        row['lifetimeValue'] ||
        row['Lifetime Value'] ||
        row['lifetime_value'] ||
        '0';

      if (!name || !phoneNumber) {
        warnings.push(
          `Row ${i + 2}: Skipped due to missing Name or Phone Number.`,
        );
        continue;
      }

      const contacts = await this.drizzle.db
        .select()
        .from(schema.pgSchema.contacts)
        .where(eq(schema.pgSchema.contacts.phone_number, phoneNumber))
        .limit(1);
      const existingContact = contacts[0] || null;

      if (existingContact) {
        const existingShops = await this.drizzle.db
          .select({ name: schema.pgSchema.shops.name })
          .from(schema.pgSchema.shops)
          .where(
            and(
              eq(schema.pgSchema.shops.id, existingContact.shop_id),
              isNull(schema.pgSchema.shops.deleted_at),
            ),
          )
          .limit(1);
        const existingShop = existingShops[0] || null;
        warnings.push(
          `Row ${i + 2}: Skipped duplicate phone number '${phoneNumber}' (exists for contact '${
            existingContact.name
          }' at shop '${existingShop?.name || 'Unknown'}').`,
        );
        continue;
      }

      let region = null;
      if (regionName) {
        const regions = await this.drizzle.db
          .select()
          .from(schema.pgSchema.regions)
          .where(eq(schema.pgSchema.regions.name, regionName))
          .limit(1);
        region = regions[0] || null;

        if (!region) {
          const newRegionId = `region-${regionName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          const newRegions = await this.drizzle.db
            .insert(schema.pgSchema.regions)
            .values({
              id: newRegionId,
              name: regionName,
              division: division,
              created_at: Date.now(),
              updated_at: Date.now(),
            })
            .returning();
          region = newRegions[0];
        }
      }

      const finalRegionId = region ? region.id : 'region-yangon';

      const shopId = `shop-${crypto.randomUUID()}`;
      const newShops = await this.drizzle.db
        .insert(schema.pgSchema.shops)
        .values({
          id: shopId,
          name,
          address: address || 'No Address',
          region_id: finalRegionId,
          price_tier: priceTier,
          lifetime_value: parseFloat(ltvVal) || 0.0,
          sentiment_trend: 'STABLE',
          created_at: Date.now(),
          updated_at: Date.now(),
        })
        .returning();
      const shop = newShops[0];

      const contactId = `contact-${crypto.randomUUID()}`;
      await this.drizzle.db.insert(schema.pgSchema.contacts).values({
        id: contactId,
        shop_id: shop.id,
        name: contactName || 'Primary Contact',
        phone_number: phoneNumber,
        email: email || null,
        is_primary: true,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      importedCount++;
    }

    return { importedCount, warnings };
  }
}
