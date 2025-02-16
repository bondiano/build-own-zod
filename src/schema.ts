import { AddQuestionMarks, Flatten } from './util';

class ZodTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZodTypeError';
  }
}

abstract class ZodType<Output = unknown> {
  readonly _type: Output;

  constructor(definition?: Output) {}

  optional() {
    return ZodOptional.create(this);
  }

  abstract parse(value: unknown): Output;
}

class ZodOptional<T extends ZodType = ZodType> extends ZodType<
  TypeOf<T> | undefined
> {
  static create<T extends ZodType>(type: T) {
    return new ZodOptional(type);
  }

  constructor(readonly type: ZodType) {
    super();
  }

  parse(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return this.type.parse(value);
  }
}

class ZodString extends ZodType<string> {
  static create() {
    return new ZodString();
  }

  parse(value: unknown) {
    if (typeof value !== 'string') {
      throw new ZodTypeError('Invalid string');
    }

    return value;
  }
}

class ZodNumber extends ZodType<number> {
  static create() {
    return new ZodNumber();
  }

  parse(value: unknown) {
    if (typeof value !== 'number') {
      throw new ZodTypeError('Invalid number');
    }

    return value;
  }
}

class ZodUnknown extends ZodType<unknown> {
  static create() {
    return new ZodUnknown();
  }

  parse(value: unknown) {
    return value;
  }
}

class ZodArray<T extends ZodType> extends ZodType<Array<TypeOf<T>>> {
  static create<T extends ZodType>(element: T) {
    return new ZodArray(element);
  }

  constructor(readonly element: T) {
    super();
  }

  parse(value: unknown) {
    if (!Array.isArray(value)) {
      throw new ZodTypeError('Invalid array');
    }

    return value;
  }
}

class ZodObject<T extends Record<string, ZodType>> extends ZodType<
  InferZodObject<T>
> {
  static create<T extends Record<string, ZodType>>(fields: T) {
    return new ZodObject(fields);
  }

  constructor(readonly fields: T) {
    super();
  }

  parse(value: unknown) {
    if (typeof value !== 'object' || value == null) {
      throw new ZodTypeError('Not an object');
    }

    const recordValue = value as Record<string, unknown>;

    for (const [k, v] of Object.entries(this.fields)) {
      v.parse(recordValue[k]);
    }

    return value as InferZodObject<T>;
  }
}

type InferZodObject<T extends Record<string, ZodType>> = Flatten<
  AddQuestionMarks<{
    [Key in keyof T]: TypeOf<T[Key]>;
  }>
>;

export type TypeOf<T extends ZodType> = T['_type'];

type TestT = TypeOf<ZodOptional<ZodObject<{ a: ZodOptional<ZodString> }>>>;

export const number = ZodNumber.create;

export const string = ZodString.create;

export const unknown = ZodUnknown.create;

export const array = ZodArray.create;

export const object = ZodObject.create;

export const optional = ZodOptional.create;

export type { TypeOf as infer };
