"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  FileSearch,
  Loader2,
  LockKeyhole,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { formatKobo } from "@zebepay/shared";

const API_BASE = process.env.NEXT_PUBLIC_ZEBEPAY_API_URL ?? "http://localhost:4000";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  kycTier: string;
  kycStatus: string;
};

type Transfer = {
  id: string;
  reference: string;
  sourceAccountId: string;
  amountKobo: number;
  beneficiaryName: string;
  status: string;
  riskLevel: string;
  riskScore: number;
  failureReason?: string;
};

type AuditEvent = {
  id: string;
  actorId: string;
  action: string;
  severity: string;
  message: string;
  createdAt: string;
};

type KycCase = {
  id: string;
  customerId: string;
  status: string;
  submittedTier: string;
  assignedTo?: string;
};

type ReconciliationSummary = {
  ledgerDebitKobo: number;
  ledgerCreditKobo: number;
  providerSettlementStatus: string;
};

const demoAdmin: AdminUser = {
  id: "adm_001",
  name: "Operations Manager",
  email: "ops@zebepay.example",
  role: "operations_manager",
  active: true,
};

const demoCustomers: Customer[] = [
  {
    id: "cus_001",
    firstName: "Adaeze",
    lastName: "Okafor",
    email: "adaeze@example.com",
    kycTier: "tier_2",
    kycStatus: "approved",
  },
];

const demoAudit: AuditEvent[] = [
  {
    id: "aud_demo_1",
    actorId: "system",
    action: "release.audit",
    severity: "info",
    message: "Admin console uses protected bearer routes when the API is running.",
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

export default function AdminHome() {
  const [email, setEmail] = useState("ops@zebepay.example");
  const [password, setPassword] = useState("ZebepayAdmin!2026");
  const [token, setToken] = useState("");
  const [admin, setAdmin] = useState<AdminUser>(demoAdmin);
  const [customers, setCustomers] = useState<Customer[]>(demoCustomers);
  const [reviewQueue, setReviewQueue] = useState<Transfer[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(demoAudit);
  const [kycCases, setKycCases] = useState<KycCase[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [status, setStatus] = useState("Demo control room loaded. Start API, then sign in for protected operations.");
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const reviewValue = reviewQueue.reduce((sum, transfer) => sum + transfer.amountKobo, 0);
    return {
      customers: customers.length,
      reviews: reviewQueue.length,
      reviewValue,
      kyc: kycCases.length,
    };
  }, [customers.length, kycCases.length, reviewQueue]);

  async function signIn() {
    setBusy(true);
    try {
      const login = await apiRequest<{ data: { admin: AdminUser; session: { accessToken: string } } }>(
        "/v1/auth/admin/login",
        undefined,
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      setAdmin(login.data.admin);
      setToken(login.data.session.accessToken);
      setStatus(`Signed in as ${login.data.admin.name}. Loading protected operations data...`);
      await loadAdminData(login.data.session.accessToken);
    } catch (error) {
      setStatus(`Admin sign-in failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminData(accessToken = token) {
    if (!accessToken) {
      setStatus("Sign in first to load protected admin data.");
      return;
    }

    setBusy(true);
    try {
      const [customerResponse, queueResponse, auditResponse, kycResponse, reconciliationResponse] = await Promise.all([
        apiRequest<{ data: Customer[] }>("/v1/customers", accessToken),
        apiRequest<{ data: Transfer[] }>("/v1/admin/transfers/review-queue", accessToken),
        apiRequest<{ data: AuditEvent[] }>("/v1/admin/audit-events", accessToken),
        apiRequest<{ data: KycCase[] }>("/v1/admin/kyc-reviews", accessToken),
        apiRequest<{ data: ReconciliationSummary }>("/v1/admin/reconciliation/summary", accessToken),
      ]);
      setCustomers(customerResponse.data);
      setReviewQueue(queueResponse.data);
      setAuditEvents(auditResponse.data.length ? auditResponse.data.slice(-8).reverse() : demoAudit);
      setKycCases(kycResponse.data);
      setReconciliation(reconciliationResponse.data);
      setStatus("Live admin data loaded from protected API routes.");
    } catch (error) {
      setStatus(`Could not load admin API data: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function createReviewTransfer() {
    setStatus("Create a risky transfer from the customer portal, then refresh this queue.");
  }

  async function reviewTransfer(transferId: string, action: "release" | "reject") {
    if (!token) {
      setStatus("Sign in first to review transfers.");
      return;
    }

    setBusy(true);
    try {
      await apiRequest<{ data: Transfer }>(`/v1/admin/transfers/${transferId}/${action}`, token, {
        method: "POST",
        body: action === "reject" ? JSON.stringify({ reason: "Rejected during admin console review." }) : undefined,
      });
      setStatus(`Transfer ${transferId} ${action === "release" ? "released" : "rejected"}.`);
      await loadAdminData();
    } catch (error) {
      setStatus(`Review action failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function decideKyc(customerId: string, decision: "approved" | "needs_more_info") {
    if (!token) {
      setStatus("Sign in first to update KYC.");
      return;
    }

    setBusy(true);
    try {
      await apiRequest(`/v1/admin/customers/${customerId}/kyc-decision`, token, {
        method: "POST",
        body: JSON.stringify({
          decision,
          approvedTier: "tier_2",
          reason: decision === "approved" ? "Approved from admin console workflow." : "More documents requested from admin console.",
        }),
      });
      setStatus(`KYC ${decision} recorded for ${customerId}.`);
      await loadAdminData();
    } catch (error) {
      setStatus(`KYC action failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="console">
      <header className="masthead">
        <div>
          <p>Operations console</p>
          <h1>Zebepay Control Room</h1>
        </div>
        <span className="status"><BadgeCheck size={18} /> {token ? "Bearer session active" : "Demo standby"}</span>
      </header>

      <section className="loginStrip">
        <label>
          Admin email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button onClick={signIn} disabled={busy}>
          <LockKeyhole size={18} /> Sign in
        </button>
        <button className="ghost" onClick={() => loadAdminData()} disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />} Refresh
        </button>
      </section>

      <section className="queueGrid">
        {[
          { label: "Customers", count: totals.customers, icon: Users },
          { label: "KYC cases", count: totals.kyc, icon: FileSearch },
          { label: "Risk holds", count: totals.reviews, icon: LockKeyhole },
          { label: "Held value", count: formatKobo(totals.reviewValue), icon: Banknote },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article className="metric" key={item.label}>
              <Icon size={22} />
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </article>
          );
        })}
      </section>

      <section className="workGrid">
        <div className="panel wide">
          <div className="panelHead">
            <h2>Transfer review queue</h2>
            <button onClick={createReviewTransfer}>Create from customer app</button>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Beneficiary</th>
                  <th>Amount</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {(reviewQueue.length ? reviewQueue : [
                  {
                    id: "demo_review",
                    reference: "Awaiting live transfer",
                    sourceAccountId: "acct_001",
                    beneficiaryName: "Customer portal",
                    amountKobo: 0,
                    status: "requires_review",
                    riskLevel: "high",
                    riskScore: 60,
                  },
                ]).map((transfer) => (
                  <tr key={transfer.id}>
                    <td>{transfer.reference}</td>
                    <td>{transfer.beneficiaryName}</td>
                    <td>{formatKobo(transfer.amountKobo)}</td>
                    <td><span className={transfer.riskLevel === "high" ? "pill warn" : "pill"}>{transfer.riskLevel}</span></td>
                    <td><span className="pill warn">{transfer.status}</span></td>
                    <td>
                      <div className="decisionRow">
                        <button disabled={transfer.id === "demo_review"} onClick={() => reviewTransfer(transfer.id, "release")} aria-label="Release transfer">
                          <PlayCircle size={17} />
                        </button>
                        <button disabled={transfer.id === "demo_review"} onClick={() => reviewTransfer(transfer.id, "reject")} aria-label="Reject transfer">
                          <PauseCircle size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel risk">
          <AlertTriangle size={28} />
          <h2>Risk gate</h2>
          <p>Admin decisions use signed bearer sessions. Spoofed `x-admin-id` calls are denied by the API smoke tests.</p>
          <button onClick={() => loadAdminData()}>Open protected queue</button>
        </div>
      </section>

      <section className="governanceGrid">
        <div className="panel">
          <div className="panelHead">
            <h2>Customer and KYC command lane</h2>
            <UserCheck size={22} />
          </div>
          <div className="customerList">
            {customers.map((customer) => (
              <article key={customer.id}>
                <div>
                  <strong>{customer.firstName} {customer.lastName}</strong>
                  <span>{customer.email} - {customer.kycTier} - {customer.kycStatus}</span>
                </div>
                <div className="decisionRow">
                  <button onClick={() => decideKyc(customer.id, "approved")}>Approve</button>
                  <button onClick={() => decideKyc(customer.id, "needs_more_info")}>More info</button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">
            <h2>Audit trail</h2>
            <button onClick={() => loadAdminData()}>Reload</button>
          </div>
          {reconciliation ? (
            <p className="recon">
              Reconciliation: {reconciliation.providerSettlementStatus} - credits {formatKobo(reconciliation.ledgerCreditKobo)} / debits{" "}
              {formatKobo(reconciliation.ledgerDebitKobo)}
            </p>
          ) : null}
          <div className="auditList">
            {auditEvents.map((event) => (
              <span key={event.id}>
                <b>{event.action}</b>
                {event.message}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="statusBar">{status} Operator: {admin.name} / {admin.role}</footer>
    </main>
  );
}
