import { describe, it, expect } from 'vitest';

import { z } from '..';

describe('z', () => {
  it('should validate object', () => {
    const User = z.object({
      username: z.string(),
    });
    type TUser = z.infer<typeof User>;

    const user: TUser = { username: 'Ludwig' };
    expect(User.parse(user)).toEqual(user);
  });

  it('should throw error when invalid', () => {
    const User = z.object({
      username: z.string(),
    });
    type TUser = z.infer<typeof User>;

    // @ts-expect-error username is not a string
    const user: TUser = { username: 123 };
    expect(() => User.parse(user)).toThrow();
  });

  it('should mark optional type as undefined', () => {
    const User = z.object({
      username: z.string().optional(),
    });
    type TUser = z.infer<typeof User>;

    const user: TUser = {};
    expect(User.parse(user)).toEqual(user);
  });

  it('should check min-max string length', () => {
    const User = z.object({
      username: z.string().min(3).max(6),
    });
    type TUser = z.infer<typeof User>;

    const user: TUser = { username: 'Lu' };
    expect(() => User.parse(user)).toThrow();

    const user2: TUser = { username: 'Octavian' };
    expect(() => User.parse(user2)).toThrow();
  });

  it('should check min-max for number', () => {
    const User = z.object({
      age: z.number().min(18).max(99),
    });
    type TUser = z.infer<typeof User>;

    const user: TUser = { age: 17 };
    expect(() => User.parse(user)).toThrow();

    const user2: TUser = { age: 100 };
    expect(() => User.parse(user2)).toThrow();
  });

  it('should support unions', () => {
    const User = z
      .object({
        username: z.string().min(3).max(6),
        age: z.number().min(18).max(99),
      })
      .or(z.object({ username: z.string().min(3).max(6) }));
    type TUser = z.infer<typeof User>;

    const user: TUser = { username: 'Ludwig', age: 18 };
    expect(User.parse(user)).toEqual(user);

    const user2: TUser = { username: 'Ludwig' };
    expect(User.parse(user2)).toEqual(user2);
  });

  it('should support intersections', () => {
    const User = z
      .object({
        username: z.string().min(3).max(6),
      })
      .and(z.object({ age: z.number().min(18).max(99) }));
    type TUser = z.infer<typeof User>;

    const user: TUser = { username: 'Ludwig', age: 18 };
    expect(User.parse(user)).toEqual(user);
  });

  it('should support complex case', () => {
    const User = z
      .object({
        username: z.string().min(3).max(6),
        infos: z
          .array(z.object({ age: z.number().min(18).max(99) }))
          .optional(),
      })
      .and(z.object({ age: z.number().min(18).max(99) }))
      .or(z.object({ username: z.string().min(3).max(6) }));

    type TUser = z.infer<typeof User>;

    const user: TUser = { username: 'Ludwig', age: 18 };
    expect(User.parse(user)).toEqual(user);
  });
});
