export type Identity<T> = T;
export type Flatten<T> = Identity<{ [k in keyof T]: T[k] }>;

type RequiredKeys<T extends object> = {
  [k in keyof T]: undefined extends T[k] ? never : k;
}[keyof T];

export type AddQuestionMarks<
  T extends object,
  R extends keyof T = RequiredKeys<T>,
> = Pick<Required<T>, R> & Partial<T>;
