import { AddQuestionMarks, Flatten } from './util';

interface ZodTypeDefine {}

interface ZodChecker<T> {
  message: string;
  checker: (value: T) => boolean;
}

abstract class ZodType<
  Output = unknown,
  Definition extends ZodTypeDefine = ZodTypeDefine,
> {
  readonly _type!: Output;

  constructor(readonly definition?: Definition) {}

  optional() {
    return ZodOptional.create(this);
  }

  or<T extends ZodType>(type: T) {
    return ZodUnion.create([this, type]);
  }

  and<T extends ZodType>(type: T) {
    return ZodIntersection.create(this, type);
  }

  abstract parse(value: unknown): Output;
}

class ZodOptional<T extends ZodType = ZodType> extends ZodType<
  TypeOf<T> | undefined
> {
  static create<T extends ZodType>(type: T) {
    return new ZodOptional(type);
  }

  constructor(readonly type: T) {
    super();
  }

  parse(value: unknown) {
    if (value === undefined) {
      return;
    }
    return this.type.parse(value);
  }
}

class ZodUnion<T extends Array<ZodType>> extends ZodType<TypeOf<T[number]>> {
  static create<T extends Array<ZodType>>(types: T) {
    return new ZodUnion(types);
  }

  constructor(readonly types: T) {
    super();
  }

  parse(value: unknown) {
    const errors: Array<TypeError> = [];

    for (const type of this.types) {
      try {
        return type.parse(value);
      } catch (error) {
        if (error instanceof TypeError) {
          errors.push(error);
        }
      }
    }

    if (errors.length === this.types.length) {
      const messages = errors.map((error) => error.message).join('\n');
      throw new Error(`Invalid values: \n ${messages}`);
    }
  }
}

class ZodIntersection<T extends ZodType, U extends ZodType> extends ZodType<
  TypeOf<T> & TypeOf<U>
> {
  static create<T extends ZodType, U extends ZodType>(left: T, right: U) {
    return new ZodIntersection(left, right);
  }

  constructor(
    readonly left: T,
    readonly right: U,
  ) {
    super();
  }

  parse(value: unknown) {
    const errors = [];

    try {
      this.left.parse(value);
    } catch (error) {
      if (error instanceof TypeError) {
        errors.push(error);
      }
    }

    try {
      this.right.parse(value);
    } catch (error) {
      if (error instanceof TypeError) {
        errors.push(error);
      }
    }

    if (errors.length === 2) {
      const messages = errors.map((error) => error.message).join('\n');
      throw new Error(`Invalid values: \n ${messages}`);
    }

    return value as TypeOf<T> & TypeOf<U>;
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

interface ZodStringDefine extends ZodTypeDefine {
  checkers?: Array<ZodChecker<string>>;
}

class ZodString extends ZodType<string, ZodStringDefine> {
  static create<Definition extends ZodTypeDefine>(definition?: Definition) {
    return new ZodString(definition);
  }

  parse(value: unknown) {
    if (typeof value !== 'string') {
      throw new TypeError('Not a string');
    }

    const checkers = this.definition?.checkers ?? [];
    for (const checker of checkers) {
      if (!checker.checker(value)) {
        throw new Error(checker.message);
      }
    }

    return value;
  }

  min(min: number) {
    const checkers = this.definition?.checkers ?? [];

    return ZodString.create({
      checkers: [
        ...checkers,
        {
          message: `Must be at least ${min} characters`,
          checker: (value: string) => value.length >= min,
        },
      ],
    });
  }

  max(max: number) {
    const checkers = this.definition?.checkers ?? [];

    return ZodString.create({
      checkers: [
        ...checkers,
        {
          message: `Must be at most ${max} characters`,
          checker: (value: string) => value.length <= max,
        },
      ],
    });
  }
}

interface ZodNumberDefine extends ZodTypeDefine {
  checkers?: Array<ZodChecker<number>>;
}

class ZodNumber extends ZodType<number, ZodNumberDefine> {
  static create<Definition extends ZodTypeDefine>(definition?: Definition) {
    return new ZodNumber(definition);
  }

  parse(value: unknown) {
    if (typeof value !== 'number') {
      throw new TypeError('Not a number');
    }

    const checkers = this.definition?.checkers ?? [];
    for (const checker of checkers) {
      if (!checker.checker(value)) {
        throw new Error(checker.message);
      }
    }

    return value;
  }

  min(min: number) {
    const checkers = this.definition?.checkers ?? [];

    return ZodNumber.create({
      checkers: [
        ...checkers,
        {
          message: `Must be at least ${min}`,
          checker: (value: number) => value >= min,
        },
      ],
    });
  }

  max(max: number) {
    const checkers = this.definition?.checkers ?? [];

    return ZodNumber.create({
      checkers: [
        ...checkers,
        {
          message: `Must be at most ${max}`,
          checker: (value: number) => value <= max,
        },
      ],
    });
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
      throw new TypeError('Not an array');
    }

    for (const v of value) {
      this.element.parse(v);
    }

    return value;
  }
}

type InferObject<T extends Record<string, ZodType>> = Flatten<
  AddQuestionMarks<{
    [Key in keyof T]: T[Key] extends ZodOptional<infer U>
      ? TypeOf<U> | undefined
      : T[Key] extends ZodType
      ? TypeOf<T[Key]>
      : never;
  }>
>;

class ZodObject<T extends Record<string, ZodType>> extends ZodType<
  InferObject<T>
> {
  static create<T extends Record<string, ZodType>>(fields: T) {
    return new ZodObject(fields);
  }

  constructor(readonly fields: T) {
    super();
  }

  parse(value: unknown) {
    if (typeof value !== 'object' || value == null) {
      throw new Error('Not an object');
    }

    const recordValue = value as Record<string, unknown>;

    for (const [k, v] of Object.entries(this.fields)) {
      v.parse(recordValue[k]);
    }

    return value as InferObject<T>;
  }
}

export type TypeOf<T extends ZodType<unknown>> = T['_type'];

export const string = ZodString.create;

export const number = ZodNumber.create;

export const unknown = ZodUnknown.create;

export const array = ZodArray.create;

export const object = ZodObject.create;

export type { TypeOf as infer };
