import { DEMO_ACCOUNTS } from '../lib/demoAccounts'

// The only module that knows the published demo credentials exist.
//
// LoginPage renders this behind DEMO_ACCESS_ENABLED, and a production build with
// VITE_DEMO_MODE=false drops both this component and its import, so the passwords
// never reach the bundle. Keeping the credentials in one leaf component is what
// makes that drop possible — inline them into the page and they survive any
// guard. See lib/demoMode.ts and issue #7.
interface Props {
  onPick: (email: string, password: string) => void
  disabled: boolean
}

function DemoAccessBox({ onPick, disabled }: Props) {
  return (
    <div className="demo-box">
      <h2>Demo access</h2>
      <p className="hint">
        Throwaway accounts on sample data — every submission, author and manuscript
        in it is fictional. Sign in as either one to look around.
      </p>
      <ul className="demo-list">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email} className="demo-account">
            <span className="demo-detail">
              <strong>{account.label}</strong>
              <span className="demo-blurb">{account.blurb}</span>
              <code className="demo-credentials">
                {account.email} · {account.password}
              </code>
            </span>
            <button
              type="button"
              className="btn btn-small"
              aria-label={`Sign in as ${account.label}`}
              disabled={disabled}
              onClick={() => onPick(account.email, account.password)}
            >
              Use this account
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DemoAccessBox
