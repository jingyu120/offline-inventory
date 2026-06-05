import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const testSchema = z.object({
    username: z.string(),
    age: z.number(),
  });

  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(testSchema);
  });

  it('should return value when validation passes', () => {
    const input = { username: 'testuser', age: 25 };
    expect(pipe.transform(input, { type: 'body' })).toEqual(input);
  });

  it('should throw BadRequestException when validation fails', () => {
    const input = { username: 'testuser', age: 'invalid-age' };
    expect(() => pipe.transform(input, { type: 'body' })).toThrow(
      BadRequestException,
    );
  });
});
