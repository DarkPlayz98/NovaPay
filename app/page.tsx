'use client';

import { useEffect, useState } from 'react';
import { auth, firebaseEnabled } from '@/lib/firebase';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';

type Data = {
  network?: {
    id: string;
    status: string;
    name: string;
  };
  links: any[];
  payments: any[];
  keys: any[];
  events: any[];
};

const tabs = [
  ['Overview', '⌂'],
  ['Payment links', '↗'],
  ['Transactions', '⇄'],
  ['Developers', '⌘'],
  ['Network events', '⌁'],
  ['Settings', '⚙']
];

export default function Home() {
  const [data, setData] = useState<Data>({
    links: [],
    payments: [],
    keys: [],
    events: []
  });
  const [tab, setTab] = useState('Overview');
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [toast, setToast] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [secret, setSecret] = useState('');

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 3200);
  }

  async function refresh() {
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const body = await response.json();
      if (response.ok) setData(body);
      else notify(body.error || 'Could not load NovaPay');
    } catch {
      notify('Could not connect to NovaPay');
    }
  }

  useEffect(() => {
    refresh();
    if (!auth) return;
    return onAuthStateChanged(auth, setUser);
  }, []);

  async function action(body: any) {
    const response = await fetch('/api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok && response.status !== 202) {
      notify(result.error || 'Request failed');
      return null;
    }

    await refresh();
    return result;
  }

  async function create() {
    const result = await action({
      action: 'createLink',
      title,
      amount,
      description: desc
    });

    if (result) {
      setModal(false);
      setTitle('');
      setAmount('');
      setDesc('');
      notify('Payment link created');
    }
  }

  async function createKey() {
    const result = await action({
      action: 'apiKey',
      label: 'NovaPay API key'
    });

    if (result) {
      setSecret(result.secret);
      notify('NovaPay API key created — copy it now');
    }
  }

  const networkAuthorized = data.network?.status === 'AUTHORIZED';
  const total = data.payments
    .filter(payment => payment.status === 'SUCCEEDED')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const succeeded = data.payments.filter(payment => payment.status === 'SUCCEEDED').length;
  const refunded = data.payments.filter(payment => payment.status === 'REFUNDED').length;
  const active = data.links.filter(link => link.status === 'ACTIVE').length;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">N</div>
          <span className="brandname">NovaPay</span>
        </div>

        <div className="workspace">
          <span className="workspaceDot" />
          NovaPay Network
          <span className="chev">⌄</span>
        </div>

        <nav className="nav">
          {tabs.map(([name, icon]) => (
            <button
              key={name}
              data-icon={icon}
              className={tab === name ? 'active' : ''}
              onClick={() => setTab(name)}
            >
              {icon}
              <span className="navlabel">{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidefoot">
          <span className={networkAuthorized ? 'liveDot' : 'workspaceDot'} />
          {networkAuthorized ? 'Network authorized' : 'Authorization pending'}
          <div>
            {networkAuthorized
              ? 'NovaPay Network is enabled for live settlement.'
              : 'Live settlement is locked until the network is authorized.'}
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <span className="mobileLogo">N</span>
            {tab}
          </div>

          <div className="profile">
            <span className="modeBadge">
              <i />
              {networkAuthorized ? 'Live network' : 'Network setup'}
            </span>
            <div className="avatar">
              {user?.displayName?.[0]?.toUpperCase() || 'N'}
            </div>
            <span className="profileName">
              {user?.displayName || 'NovaPay Network'}
            </span>

            {firebaseEnabled && (
              <button
                className="textBtn"
                onClick={() =>
                  user
                    ? signOut(auth!)
                    : signInWithPopup(auth!, new GoogleAuthProvider())
                }
              >
                {user ? 'Sign out' : 'Sign in'}
              </button>
            )}
          </div>
        </header>

        <div className="content">
          {tab === 'Overview' && (
            <Overview
              data={data}
              total={total}
              succeeded={succeeded}
              refunded={refunded}
              active={active}
              setTab={setTab}
              refund={async id => {
                const result = await action({ action: 'refund', paymentId: id });
                if (result) notify('Refund request recorded');
              }}
            />
          )}

          {tab === 'Payment links' && (
            <section className="panel pagePanel">
              <div className="panelhead">
                <div>
                  <h2>Payment links</h2>
                  <p className="panelSub">
                    Create shareable NovaPay checkout pages.
                  </p>
                </div>
                <button className="btn primary" onClick={() => setModal(true)}>
                  ＋ New link
                </button>
              </div>
              <Links
                links={data.links}
                notify={notify}
                action={action}
              />
            </section>
          )}

          {tab === 'Transactions' && (
            <section className="panel pagePanel">
              <div className="panelhead">
                <div>
                  <h2>Transactions</h2>
                  <p className="panelSub">
                    Settlement state recorded by NovaPay Network.
                  </p>
                </div>
                <button className="btn" onClick={refresh}>↻ Refresh</button>
              </div>
              <Transactions
                payments={data.payments}
                refund={async id => {
                  const result = await action({
                    action: 'refund',
                    paymentId: id
                  });
                  if (result) notify('Refund request recorded');
                }}
              />
            </section>
          )}

          {tab === 'Developers' && (
            <Developers
              data={data}
              secret={secret}
              keyAction={createKey}
              setSecret={setSecret}
              notify={notify}
              action={action}
            />
          )}

          {tab === 'Network events' && (
            <NetworkEvents data={data} />
          )}

          {tab === 'Settings' && (
            <Settings
              user={user}
              firebaseEnabled={firebaseEnabled}
              network={data.network}
            />
          )}
        </div>
      </main>

      {modal && (
        <div className="modalback" onClick={() => setModal(false)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="modalIcon">↗</div>
            <h2>Create payment link</h2>
            <p className="panelSub">
              This creates a NovaPay checkout page for the network.
            </p>

            <div className="field">
              <label>Payment title</label>
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="e.g. Website design"
              />
            </div>

            <div className="field">
              <label>
                Amount <span>INR</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                placeholder="499.00"
              />
            </div>

            <div className="field">
              <label>
                Description <em>optional</em>
              </label>
              <input
                value={desc}
                onChange={event => setDesc(event.target.value)}
                placeholder="A short description"
              />
            </div>

            <div className="actions end">
              <button className="btn" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={create}
                disabled={!title || !amount}
              >
                Create link
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function Overview({
  data,
  total,
  succeeded,
  refunded,
  active,
  setTab,
  refund
}: {
  data: Data;
  total: number;
  succeeded: number;
  refunded: number;
  active: number;
  setTab: (value: string) => void;
  refund: (id: string) => void;
}) {
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">NOVAPAY NETWORK</div>
          <h1>Good evening <span>👋</span></h1>
          <div className="sub">
            Your payment infrastructure at a glance.
          </div>
        </div>

        <button
          className="btn primary"
          onClick={() => setTab('Payment links')}
        >
          ＋ Create payment link
        </button>
      </div>

      <div className="cards">
        <div className="card stat">
          <div className="statlabel">Successful volume <span>↗</span></div>
          <div className="statvalue">
            ₹{(total / 100).toLocaleString('en-IN', {
              minimumFractionDigits: 2
            })}
          </div>
          <div className="positive">NovaPay-settled transactions</div>
        </div>

        <div className="card stat">
          <div className="statlabel">Successful payments</div>
          <div className="statvalue">{succeeded}</div>
          <div className="muted small">Confirmed settlements</div>
        </div>

        <div className="card stat">
          <div className="statlabel">Active payment links</div>
          <div className="statvalue">{active}</div>
          <div className="muted small">NovaPay checkout pages</div>
        </div>

        <div className="card miniStat">
          <span className="miniIcon">↩</span>
          <div>
            <b>{refunded}</b>
            <small>Refunded payments</small>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>Recent transactions</h2>
            <p className="panelSub">Latest NovaPay Network activity</p>
          </div>
          <button className="btn" onClick={() => setTab('Transactions')}>
            View all
          </button>
        </div>

        <Transactions
          payments={data.payments.slice(0, 6)}
          refund={refund}
        />
      </section>

      <section className="panel">
        <div className="panelhead">
          <div>
            <h2>Payment links</h2>
            <p className="panelSub">Your latest checkout pages</p>
          </div>
          <button className="btn" onClick={() => setTab('Payment links')}>
            Manage links
          </button>
        </div>

        <Links
          links={data.links.slice(0, 3)}
          notify={() => {}}
          action={async () => null}
        />
      </section>
    </>
  );
}

function Links({
  links,
  notify,
  action
}: {
  links: any[];
  notify: (message: string) => void;
  action: (body: any) => Promise<any>;
}) {
  if (links.length === 0) {
    return (
      <div className="empty">
        <div className="emptyIcon">↗</div>
        <b>No payment links yet</b>
        <span>Create one to publish a NovaPay checkout page.</span>
      </div>
    );
  }

  return (
    <>
      {links.map(link => (
        <div key={link.id} className="linkrow">
          <div className="linkMain">
            <div className="linktitle">
              {link.title} <span className="pill">{link.status}</span>
            </div>
            <div className="linkurl">
              ₹{(link.amount / 100).toFixed(2)} · {link.payments?.length || 0}{' '}
              payments · /pay/{link.id}
            </div>
          </div>

          <div className="actions">
            <button
              className="btn"
              onClick={() => {
                navigator.clipboard?.writeText(
                  window.location.origin + '/pay/' + link.id
                );
                notify('Payment link copied');
              }}
            >
              Copy
            </button>

            <a
              className="btn"
              href={'/pay/' + link.id}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>

            {link.status === 'ACTIVE' && (
              <button
                className="btn dangerBtn"
                onClick={async () => {
                  const result = await action({
                    action: 'deactivateLink',
                    id: link.id
                  });
                  if (result) notify('Link disabled');
                }}
              >
                Disable
              </button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function Transactions({
  payments,
  refund
}: {
  payments: any[];
  refund: (id: string) => void;
}) {
  if (payments.length === 0) {
    return (
      <div className="empty">
        <div className="emptyIcon">⇄</div>
        <b>No transactions yet</b>
        <span>NovaPay transactions will appear here after settlement.</span>
      </div>
    );
  }

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Payment</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {payments.map(payment => (
            <tr key={payment.id}>
              <td>
                <b>{payment.id.slice(-8).toUpperCase()}</b>
                <div className="muted tiny">
                  {payment.link?.title || 'NovaPay payment'}
                </div>
              </td>
              <td>{payment.customerEmail || '—'}</td>
              <td className="amount">
                ₹{(payment.amount / 100).toFixed(2)}
              </td>
              <td>
                <span
                  className={
                    'pill ' +
                    (payment.status === 'FAILED'
                      ? 'failed'
                      : payment.status === 'PENDING' ||
                          payment.status === 'PROCESSING'
                        ? 'pending'
                        : payment.status === 'REFUNDED'
                          ? 'refunded'
                          : '')
                  }
                >
                  {payment.status}
                </span>
              </td>
              <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
              <td>
                {payment.status === 'SUCCEEDED' && (
                  <button className="btn" onClick={() => refund(payment.id)}>
                    Request refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Developers({
  data,
  secret,
  keyAction,
  setSecret,
  notify,
  action
}: {
  data: Data;
  secret: string;
  keyAction: () => void;
  setSecret: (value: string) => void;
  notify: (message: string) => void;
  action: (body: any) => Promise<any>;
}) {
  const curl = [
    'curl -X POST /api/v1/payment-links \\',
    '  -H "Authorization: Bearer np_..." \\',
    '  -H "Content-Type: application/json" \\',
    '  -d \'{"title":"Order #123","amount":499}\''
  ].join('\n');

  return (
    <>
      <section className="panel pagePanel">
        <div className="panelhead">
          <div>
            <h2>API keys</h2>
            <p className="panelSub">
              Credentials created and verified by NovaPay.
            </p>
          </div>
          <button className="btn primary" onClick={keyAction}>
            ＋ Create API key
          </button>
        </div>

        {secret && (
          <div className="secretBox">
            <div>
              <b>New secret — shown once</b>
              <span>{secret}</span>
            </div>
            <button
              className="btn"
              onClick={() => {
                navigator.clipboard?.writeText(secret);
                notify('Secret copied');
                setSecret('');
              }}
            >
              Copy & hide
            </button>
          </div>
        )}

        {data.keys.length === 0 ? (
          <div className="empty">No API keys yet.</div>
        ) : (
          data.keys.map(key => (
            <div className="linkrow" key={key.id}>
              <div>
                <b>{key.label}</b>
                <div className="linkurl">
                  {key.prefix}•••••••• · {key.revoked ? 'Revoked' : 'Active'}
                </div>
              </div>

              {!key.revoked && (
                <button
                  className="btn dangerBtn"
                  onClick={async () => {
                    const result = await action({
                      action: 'revokeKey',
                      id: key.id
                    });
                    if (result) notify('Key revoked');
                  }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <section className="panel pagePanel">
        <div className="panelhead">
          <div>
            <h2>NovaPay API</h2>
            <p className="panelSub">
              Merchant API for NovaPay payment-link management.
            </p>
          </div>
        </div>

        <pre>{curl}</pre>

        <div className="notice">
          Payment settlement is handled only by the NovaPay Network settlement
          protocol. No Razorpay or other payment-provider SDK is used.
        </div>
      </section>
    </>
  );
}

function NetworkEvents({ data }: { data: Data }) {
  return (
    <section className="panel pagePanel">
      <div className="panelhead">
        <div>
          <h2>Network events</h2>
          <p className="panelSub">
            Signed payment and refund events recorded by NovaPay.
          </p>
        </div>
      </div>

      {data.events.length === 0 ? (
        <div className="empty">
          <div className="emptyIcon">⌁</div>
          <b>No network events</b>
          <span>NovaPay events will appear here as payments progress.</span>
        </div>
      ) : (
        data.events.map(event => (
          <details className="event" key={event.id}>
            <summary>
              <div>
                <b>{event.type}</b>
                <span>
                  {new Date(event.createdAt).toLocaleString()} ·{' '}
                  {event.delivered ? 'Recorded' : 'Awaiting delivery'}
                </span>
              </div>
              <code>{event.id.slice(-10)}</code>
            </summary>
            <pre>{JSON.stringify(event.payload, null, 2)}</pre>
          </details>
        ))
      )}
    </section>
  );
}

function Settings({
  user,
  firebaseEnabled,
  network
}: {
  user: User | null;
  firebaseEnabled: boolean;
  network?: Data['network'];
}) {
  return (
    <section className="panel pagePanel settings">
      <div className="eyebrow">NETWORK</div>
      <h2>NovaPay settings</h2>
      <p className="panelSub">
        Configuration for the NovaPay-owned payment network.
      </p>

      <div className="setting">
        <span>Network</span>
        <b>{network?.name || 'NovaPay Network'}</b>
      </div>

      <div className="setting">
        <span>Network ID</span>
        <b>{network?.id || 'novapay-in'}</b>
      </div>

      <div className="setting">
        <span>Settlement status</span>
        <b>
          <i />
          {network?.status === 'AUTHORIZED'
            ? 'Authorized for live settlement'
            : 'Authorization pending'}
        </b>
      </div>

      <div className="setting">
        <span>Authentication</span>
        <b>
          {firebaseEnabled
            ? user
              ? 'Signed in as ' + (user.email || user.displayName || 'user')
              : 'Firebase enabled'
            : 'Authentication not configured'}
        </b>
      </div>

      <div className="setting">
        <span>Currency</span>
        <b>INR (₹)</b>
      </div>

      <div className="notice">
        NovaPay does not use Razorpay, Stripe, PayPal, or another payment
        processor. The settlement protocol is proprietary to NovaPay and
        accepts only authenticated network confirmations.
      </div>
    </section>
  );
}
