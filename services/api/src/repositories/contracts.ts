import type {
  AccountStatement,
  BankAccount,
  Beneficiary,
  CustomerProfile,
  CustomerUser,
  LedgerEntry,
  TransferRecord,
} from "@zebepay/shared";

export interface TransactionContext {
  id: string;
}

export interface CustomerRepository {
  findCustomerById(customerId: string): CustomerProfile | undefined;
  findCustomerUserByEmail(email: string): CustomerUser | undefined;
}

export interface AccountRepository {
  findAccountById(accountId: string): BankAccount | undefined;
  listCustomerAccounts(customerId: string): BankAccount[];
}

export interface BeneficiaryRepository {
  listByCustomer(customerId: string): Beneficiary[];
  create(beneficiary: Beneficiary): Beneficiary;
  disable(customerId: string, beneficiaryId: string): Beneficiary;
}

export interface LedgerRepository {
  listAccountEntries(accountId: string): LedgerEntry[];
  buildStatement(accountId: string, from: Date, to: Date): AccountStatement;
}

export interface TransferRepository {
  findById(transferId: string): TransferRecord | undefined;
  save(transfer: TransferRecord): TransferRecord;
}

export interface UnitOfWork {
  transaction<T>(name: string, work: (context: TransactionContext) => T): T;
}

export interface AsyncCustomerRepository {
  findCustomerById(customerId: string): Promise<CustomerProfile | undefined>;
  findCustomerUserByEmail(email: string): Promise<CustomerUser | undefined>;
}

export interface AsyncAccountRepository {
  findAccountById(accountId: string): Promise<BankAccount | undefined>;
  listCustomerAccounts(customerId: string): Promise<BankAccount[]>;
}

export interface AsyncBeneficiaryRepository {
  listByCustomer(customerId: string): Promise<Beneficiary[]>;
  create(beneficiary: Beneficiary): Promise<Beneficiary>;
  disable(customerId: string, beneficiaryId: string): Promise<Beneficiary>;
}

export interface AsyncLedgerRepository {
  listAccountEntries(accountId: string): Promise<LedgerEntry[]>;
  buildStatement(accountId: string, from: Date, to: Date): Promise<AccountStatement>;
}

export interface AsyncTransferRepository {
  findById(transferId: string): Promise<TransferRecord | undefined>;
  listBySourceAccounts(accountIds: string[]): Promise<TransferRecord[]>;
  save(transfer: TransferRecord): Promise<TransferRecord>;
}

export interface AsyncUnitOfWork {
  transaction<T>(name: string, work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
