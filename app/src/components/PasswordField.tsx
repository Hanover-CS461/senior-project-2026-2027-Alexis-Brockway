import { useId, useState } from 'react'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  /** 'current-password' on sign-in, 'new-password' where one is being set. */
  autoComplete?: 'current-password' | 'new-password'
  required?: boolean
}

/**
 * A password input with a Show/Hide toggle.
 *
 * Three details that are easy to get wrong:
 * - `type="button"` on the toggle, or a click would submit the form it sits in.
 * - `onMouseDown` preventDefault, so revealing the password does not pull focus
 *   out of the field being typed into.
 * - `aria-pressed`, so the toggle announces its state instead of relying on the
 *   word "Show" alone.
 *
 * The toggle is a sibling of the label, never a child: anything labelable
 * inside a <label> becomes part of its control, which would rename the input to
 * "Password Show password" for a screen reader and for `getByLabel`.
 */
function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  required,
}: Props) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="password-field">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
        />
        <button
          type="button"
          className="password-toggle"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((wasVisible) => !wasVisible)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </div>
  )
}

export default PasswordField
