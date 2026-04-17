// --- Auth domain entities ---

export type Account = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: string;
};

// --- Auth request/response types ---

export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type RegisterResponse = {
  account: Account;
  token: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  account: Account;
  token: string;
};
