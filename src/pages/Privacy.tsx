import { Link } from 'react-router'
import { LegalPage, type LegalSection } from '../components/LegalPage'

const SECTIONS: LegalSection[] = [
  {
    title: 'What we collect',
    body: (
      <ul>
        <li><strong>Account details</strong>: your name, email address and password when you sign up.</li>
        <li><strong>Booking requests</strong>: the car, dates and message you send us through the contact form.</li>
        <li><strong>Contact messages</strong>: your name, email and whatever you write to us.</li>
      </ul>
    ),
  },
  {
    title: 'Where your data is stored',
    body: (
      <>
        <p>Your account and sign-in session are stored locally in your own browser (local storage). Passwords are never stored as plain text: only a one-way SHA-256 hash of your password is kept.</p>
        <p>Because the data lives in your browser, an account created on one device or browser is not available on another, and clearing your browser's site data deletes it.</p>
      </>
    ),
  },
  {
    title: 'How we use it',
    body: (
      <ul>
        <li>To sign you in and show your name in the account menu.</li>
        <li>To pre-fill the contact form with your name and email.</li>
        <li>To respond to booking requests and questions.</li>
      </ul>
    ),
  },
  {
    title: 'What we do not do',
    body: <p>We do not sell your personal data, show you third-party advertising, or use tracking cookies. The site does not use analytics.</p>,
  },
  {
    title: 'Third-party content',
    body: <p>Car and team photos are loaded from Unsplash, the font from Google Fonts and pick-up maps from OpenStreetMap. When your browser loads them, those services receive standard request information such as your IP address, under their own privacy policies.</p>,
  },
  {
    title: 'Your choices',
    body: (
      <ul>
        <li>Sign out at any time from the account menu.</li>
        <li>Delete everything we store in your browser by clearing site data for this website.</li>
        <li>Ask us what we hold about you or request its deletion by contacting us.</li>
      </ul>
    ),
  },
  {
    title: 'Changes and contact',
    body: <p>If this policy changes, we will update the date at the top of this page. Questions about your privacy? <Link to="/contact">Contact us</Link> or write to hello@rentmotors.com.</p>,
  },
]

export function Privacy() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="October 1, 2026"
      intro="We collect only what we need to let you sign in and book a car, and we never sell it. This page explains what that means in practice."
      sections={SECTIONS}
    />
  )
}
