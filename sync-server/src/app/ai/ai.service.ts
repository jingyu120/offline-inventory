import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  /**
   * Mock Gemma 4 implementation for parsing unstructured notes.
   */
  async parseInteractionNote(note: string) {
    // In a real scenario, this would call the Google Gemma 4 API.
    // For now, we use a simple heuristic to simulate Gemma 4 extraction.
    const lowerNote = note.toLowerCase();
    
    let commercialStatus = 'FOLLOWED_UP';
    if (lowerNote.includes('order') || lowerNote.includes('bought')) {
      commercialStatus = 'ORDER_PLACED';
    } else if (lowerNote.includes('interest')) {
      commercialStatus = 'INTERESTED';
    } else if (lowerNote.includes('not interest') || lowerNote.includes('reject')) {
      commercialStatus = 'NOT_INTERESTED';
    }

    const items = [];
    if (lowerNote.includes('premium beer')) {
      items.push({ sku: 'SKU-PB-640', quantity: 5 }); // Mocked value based on standard text
    }

    return {
      commercialStatus,
      items,
      summary: note.substring(0, 50),
    };
  }

  async verifyViberScreenshot(base64Image: string) {
    // Mock Gemma 4 Vision OCR
    return {
      verified: true,
      extractedText: "Order confirmed for 5 Premium Beers",
    };
  }
}
