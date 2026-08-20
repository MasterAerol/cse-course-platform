import {
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Link, useLocation } from 'react-router'

import type { User } from '../lib/api'

function getInitials(user: User): string {
  return `${user.firstName.trim()[0] ?? ''}${user.lastName.trim()[0] ?? ''}`
    .toUpperCase()
}

function ProfileGlyph({ initials }: { initials: string }) {
  if (initials.length > 0) {
    return <>{initials}</>
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
    >
      <circle cx="12" cy="8" r="3.5" fill="currentColor" />
      <path
        d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function AccountMenu({
  user,
  submitting,
  onSignOut,
}: {
  user: User
  submitting: boolean
  onSignOut: () => void
}) {
  const [openPath, setOpenPath] = useState<string | null>(null)
  const menuId = useId()
  const location = useLocation()
  const open = openPath === location.pathname
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const initials = getInitials(user)
  const fullName = `${user.firstName} ${user.lastName}`.trim()

  useEffect(() => {
    if (!open) {
      return
    }

    function closeOnOutsidePointer(event: PointerEvent): void {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target) === false
      ) {
        setOpenPath(null)
      }
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenPath(null)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function closeMenu(): void {
    setOpenPath(null)
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="account-menu__trigger"
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close account menu' : 'Open account menu'}
        title={fullName}
        onClick={() =>
          setOpenPath((current) =>
            current === location.pathname ? null : location.pathname,
          )
        }
      >
        <span className="account-menu__avatar" aria-hidden="true">
          <ProfileGlyph initials={initials} />
        </span>
      </button>

      <div
        id={menuId}
        className="account-menu__panel"
        hidden={!open}
      >
        <div className="account-menu__identity">
          <span className="account-menu__avatar" aria-hidden="true">
            <ProfileGlyph initials={initials} />
          </span>
          <p>
            <strong>{fullName}</strong>
            <span>{user.email}</span>
          </p>
        </div>
        <nav aria-label="Account navigation">
          <Link to="/dashboard" onClick={closeMenu}>Dashboard</Link>
          <Link to="/courses/cse-professional" onClick={closeMenu}>Course</Link>
          <Link to="/account" onClick={closeMenu}>Profile &amp; Account</Link>
          <Link to="/exam-calendar" onClick={closeMenu}>Exam Calendar</Link>
          {user.role === 'admin' && (
            <Link to="/admin" onClick={closeMenu}>Admin</Link>
          )}
        </nav>
        <button
          type="button"
          className="account-menu__sign-out"
          disabled={submitting}
          onClick={() => {
            closeMenu()
            onSignOut()
          }}
        >
          {submitting ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
