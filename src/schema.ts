class ZodTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZodTypeError';
  }
}

interface ZodUnknown {
  type: 'unknown';
  parse(value: unknown): unknown;
}
interface ZodString {
  type: 'string';
  parse(value: unknown): string;
}
interface ZodNumber {
  type: 'number';
  parse(value: unknown): number;
}
interface ZodArray<T extends ZodType> {
  type: 'array';
  element: T;
  parse(value: unknown): Array<TypeOf<T>>;
}
interface ZodObject<T extends Record<string, ZodType>> {
  type: 'object';
  fields: T;
  parse(value: unknown): InferZodObject<ZodObject<T>>;
}
type ZodType =
  | ZodUnknown
  | ZodString
  | ZodNumber
  | ZodArray<ZodType>
  | ZodObject<Record<string, ZodType>>;

type InferZodObject<T extends ZodObject<any>> = {
  [K in keyof T['fields']]: TypeOf<T['fields'][K]>;
};
export type TypeOf<T extends ZodType> = T extends ZodUnknown
  ? unknown
  : T extends ZodString
    ? string
    : T extends ZodNumber
      ? number
      : T extends ZodArray<infer E>
        ? Array<TypeOf<E>>
        : T extends ZodObject<Record<string, ZodType>>
          ? InferZodObject<T>
          : never;

export const string = (): ZodString => ({
  type: 'string',
  parse(value: unknown) {
    if (typeof value !== 'string') {
      throw new ZodTypeError('Invalid string');
    }

    return value;
  },
});

export const number = (): ZodNumber => ({
  type: 'number',
  parse(value: unknown) {
    if (typeof value !== 'number') {
      throw new ZodTypeError('Invalid number');
    }

    return value;
  },
});

export const unknown = (): ZodUnknown => ({
  type: 'unknown',
  parse(value) {
    return value;
  },
});

export const array = <T extends ZodType>(element: T): ZodArray<T> => ({
  type: 'array',
  element,
  parse(value: unknown) {
    if (!Array.isArray(value)) {
      throw new ZodTypeError('Invalid array');
    }

    return value.map((item) => element.parse(item) as TypeOf<T>);
  },
});

export const object = <T extends Record<string, ZodType>>(
  fields: T,
): ZodObject<T> => ({
  type: 'object',
  fields,
  parse(value: unknown) {
    if (typeof value !== 'object' || value === null) {
      throw new ZodTypeError('Invalid object');
    }

    const recordValue = value as Record<string, unknown>;
    Object.entries(recordValue).forEach(([key, value]) =>
      fields[key].parse(value),
    );

    return value as InferZodObject<ZodObject<T>>;
  },
});

export type { TypeOf as infer };
