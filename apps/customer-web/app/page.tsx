"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Landmark,
  Loader2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
} from "lucide-react";
import { formatKobo } from "@zebepay/shared";

const API_BASE = process.env.NEXT_PUBLIC_ZEBEPAY_API_URL ?? "http://localhost:4000";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  kycTier: string;
  kycStatus: string;
};

type Account = {
  id: string;
  accountNumber: string;
  accountName: string;
  balanceKobo: number;
  availableBalanceKobo: number;
  status: string;
};

type Transfer = {
  id: string;
  reference: string;
  amountKobo: number;
  beneficiaryName: string;
  beneficiaryBankCode: string;
  status: string;
  riskLevel: string;
  createdAt: string;
};

type Beneficiary = {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  status: string;
};

type NotificationMessage = {
  id: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
};

type Summary = {
  customer: Customer;
  accounts: Account[];
  beneficiaries: Beneficiary[];
  transfers: Transfer[];
};

type StatementEntry = {
  id: string;
  entryType: string;
  amountKobo: number;
  narration: string;
  createdAt: string;
};

type Statement = {
  openingBalanceKobo: number;
  closingBalanceKobo: number;
  totalDebitsKobo: number;
  totalCreditsKobo: number;
  entries: StatementEntry[];
};

const demoSummary: Summary = {
  customer: {
    id: "cus_001",
    firstName: "Adaeze",
    lastName: "Okafor",
    email: "adaeze@example.com",
    kycTier: "tier_2",
    kycStatus: "approved",
  },
  accounts: [
    {
      id: "acct_001",
      accountNumber: "1023456789",
      accountName: "Adaeze Okafor",
      balanceKobo: 245000000,
      availableBalanceKobo: 245000000,
      status: "active",
    },
  ],
  beneficiaries: [
    {
      id: "ben_001",
      name: "Chinedu Okeke",
      accountNumber: "0123456789",
      bankName: "Standard Chartered Bank Nigeria",
      status: "active",
    },
  ],
  transfers: [],
};

const demoNotifications: NotificationMessage[] = [
  {
    id: "note_demo_1",
    subject: "Security-ready sandbox",
    body: "Login, customer reads, OTP, device trust, transfers, and notifications are API-backed when the backend is running.",
    status: "queued",
    createdAt: new Date().toISOString(),
  },
];

async function apiRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message ?? body.error ?? `Request failed with ${response.status}`);
  }

  return body as T;
}

export default function CustomerHome() {
  const [email, setEmail] = useState("adaeze@example.com");
  const [password, setPassword] = useState("ZebepayDemo!2026");
  const [token, setToken] = useState("");
  const [summary, setSummary] = useState<Summary>(demoSummary);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>(demoNotifications);
  const [amount, setAmount] = useState("45000");
  const [narration, setNarration] = useState("Supplier settlement");
  const [status, setStatus] = useState("Demo mode loaded. Start API, then sign in to use live sandbox data.");
  const [busy, setBusy] = useState(false);

  const customer = summary.customer;
  const account = summary.accounts[0];
  const balanceLabel = account ? formatKobo(account.balanceKobo) : "NGN 0.00";

  const activity = useMemo(() => {
    const transferRows = summary.transfers.map((transfer) => ({
      id: transfer.id,
      title: `${transfer.beneficiaryName} transfer`,
      detail: `${transfer.reference} - ${transfer.status} - ${transfer.riskLevel} risk`,
      amountKobo: -transfer.amountKobo,
    }));
    const statementRows =
      statement?.entries.slice(-3).map((entry) => ({
        id: entry.id,
        title: entry.narration,
        detail: `${entry.entryType} ledger entry`,
        amountKobo: entry.entryType === "credit" ? entry.amountKobo : -entry.amountKobo,
      })) ?? [];
    return [...transferRows, ...statementRows].slice(0, 5);
  }, [summary.transfers, statement]);

  async function signIn() {
    setBusy(true);
    try {
      const login = await apiRequest<{ data: { customer: Customer; session: { accessToken: string } } }>(
        "/v1/auth/customer/login",
        undefined,
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      const accessToken = login.data.session.accessToken;
      setToken(accessToken);
      setStatus(`Signed in as ${login.data.customer.firstName}. Loading protected banking data...`);
      await loadCustomerData(accessToken, login.data.customer.id);
    } catch (error) {
      setStatus(`Sign-in failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadCustomerData(accessToken = token, customerId = customer.id) {
    if (!accessToken) {
      setStatus("Sign in first to load protected customer data.");
      return;
    }

    setBusy(true);
    try {
      const [summaryResponse, beneficiaryResponse, notificationResponse] = await Promise.all([
        apiRequest<{ data: Summary }>(`/v1/customers/${customerId}/summary`, accessToken),
        apiRequest<{ data: Beneficiary[] }>(`/v1/customers/${customerId}/beneficiaries`, accessToken),
        apiRequest<{ data: NotificationMessage[] }>(`/v1/notifications?customerId=${customerId}`, accessToken),
      ]);
      const primaryAccount = summaryResponse.data.accounts[0];
      const statementResponse = primaryAccount
        ? await apiRequest<{ data: Statement }>(`/v1/accounts/${primaryAccount.id}/statement`, accessToken)
        : null;

      setSummary({ ...summaryResponse.data, beneficiaries: beneficiaryResponse.data });
      setNotifications(notificationResponse.data.length ? notificationResponse.data : demoNotifications);
      setStatement(statementResponse?.data ?? null);
      setStatus("Live API data loaded into customer workspace.");
    } catch (error) {
      setStatus(`Could not load API data: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function trustDeviceAndPrepareOtp() {
    if (!token || !account) {
      setStatus("Sign in first to register device and OTP context.");
      return;
    }

    setBusy(true);
    try {
      const device = await apiRequest<{ data: { id: string } }>("/v1/security/devices/trust", token, {
        method: "POST",
        body: JSON.stringify({ label: "Customer portal browser", fingerprint: "customer-web-demo-device" }),
      });
      const otp = await apiRequest<{ data: { id: string; code?: string } }>("/v1/security/otp-challenges", token, {
        method: "POST",
        body: JSON.stringify({ purpose: "transfer", targetId: account.id }),
      });
      setStatus(`Trusted device ${device.data.id}. OTP challenge ${otp.data.id} created with code redacted from API response.`);
    } catch (error) {
      setStatus(`Security setup failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitTransfer() {
    if (!token || !account) {
      setStatus("Sign in first to submit a transfer.");
      return;
    }

    setBusy(true);
    try {
      const transfer = await apiRequest<{ data: Transfer }>("/v1/transfers", token, {
        method: "POST",
        body: JSON.stringify({
          sourceAccountId: account.id,
          amountKobo: Math.round(Number(amount) * 100),
          beneficiaryName: summary.beneficiaries[0]?.name ?? "Chinedu Okeke",
          beneficiaryAccountNumber: summary.beneficiaries[0]?.accountNumber ?? "0123456789",
          beneficiaryBankCode: "000027",
          narration,
          channel: "nip_mock",
          customerDeviceId: "dev_001",
          idempotencyKey: `customer-web-${Date.now()}`,
        }),
      });
      setStatus(`Transfer ${transfer.data.reference} submitted: ${transfer.data.status}, ${transfer.data.riskLevel} risk.`);
      await loadCustomerData();
    } catch (error) {
      setStatus(`Transfer failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="mark">OB</span>
          <div>
            <strong>Zebepay</strong>
            <small>Customer portal</small>
          </div>
        </div>
        <nav aria-label="Customer sections">
          <a className="active">Overview</a>
          <a>Transfers</a>
          <a>Beneficiaries</a>
          <a>Statements</a>
          <a>Security</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Retail banking cockpit</p>
            <h1>{customer.firstName} {customer.lastName}</h1>
          </div>
          <div className="topActions">
            <button className="iconButton" onClick={() => loadCustomerData()} aria-label="Refresh customer data">
              {busy ? <Loader2 size={20} className="spin" /> : <Bell size={20} />}
            </button>
          </div>
        </header>

        <section className="loginStrip">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary" onClick={signIn} disabled={busy}>
            <LockKeyhole size={18} /> Sign in
          </button>
        </section>

        <section className="heroBand">
          <div>
            <p className="label">Primary savings account</p>
            <h2>{balanceLabel}</h2>
            <p className="muted">
              Available: {account ? formatKobo(account.availableBalanceKobo) : "NGN 0.00"} - {account?.accountNumber ?? "No account"}
            </p>
          </div>
          <div className="assurance">
            <ShieldCheck size={24} />
            <span>{customer.kycTier.toUpperCase()} {customer.kycStatus} - {account?.status ?? "offline"}</span>
          </div>
        </section>

        <section className="quickGrid">
          {[
            { label: "API session", value: token ? "Live" : "Demo", icon: UserRoundCheck },
            { label: "Statements", value: statement ? `${statement.entries.length} rows` : "Ready", icon: ReceiptText },
            { label: "Alerts", value: notifications.length, icon: Bell },
            { label: "Devices", value: "Trust flow", icon: Smartphone },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article className="metric" key={item.label}>
                <Icon size={20} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            );
          })}
        </section>

        <section className="contentGrid">
          <div className="panel">
            <div className="sectionTitle">
              <h3>Activity and statement</h3>
              <button onClick={() => loadCustomerData()}>Refresh</button>
            </div>
            <div className="transactionList">
              {(activity.length ? activity : [{ id: "opening", title: "Opening balance", detail: "Seed ledger entry", amountKobo: account?.balanceKobo ?? 0 }]).map(
                (transaction) => (
                  <article className="transaction" key={transaction.id}>
                    <Landmark size={18} />
                    <div>
                      <strong>{transaction.title}</strong>
                      <span>{transaction.detail}</span>
                    </div>
                    <b className={transaction.amountKobo > 0 ? "credit" : "debit"}>{formatKobo(transaction.amountKobo)}</b>
                  </article>
                ),
              )}
            </div>
          </div>

          <div className="panel transferPanel">
            <div className="sectionTitle">
              <h3>Money movement</h3>
              <CreditCard size={19} />
            </div>
            <label>
              Beneficiary
              <input value={summary.beneficiaries[0]?.name ?? "Chinedu Okeke"} readOnly />
            </label>
            <label>
              Amount NGN
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
            </label>
            <label>
              Narration
              <input value={narration} onChange={(event) => setNarration(event.target.value)} />
            </label>
            <button className="secondary" onClick={trustDeviceAndPrepareOtp} disabled={busy}>
              <ShieldCheck size={18} /> Trust device and create OTP
            </button>
            <button className="primary" onClick={submitTransfer} disabled={busy}>
              <ArrowRight size={18} /> Submit transfer
            </button>
          </div>
        </section>

        <section className="contentGrid secondaryGrid">
          <div className="panel">
            <div className="sectionTitle">
              <h3>Beneficiaries</h3>
              <ClipboardList size={19} />
            </div>
            <div className="beneficiaryList">
              {summary.beneficiaries.map((beneficiary) => (
                <article className="beneficiary" key={beneficiary.id}>
                  <strong>{beneficiary.name}</strong>
                  <span>{beneficiary.bankName}</span>
                  <b>{beneficiary.accountNumber}</b>
                </article>
              ))}
            </div>
          </div>

          <div className="panel notificationPanel">
            <div className="sectionTitle">
              <h3>Notification outbox</h3>
              <CheckCircle2 size={19} />
            </div>
            <div className="noticeList">
              {notifications.map((notification) => (
                <article key={notification.id}>
                  <strong>{notification.subject}</strong>
                  <span>{notification.body}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="statusBar">{status}</footer>
      </section>
    </main>
  );
}
