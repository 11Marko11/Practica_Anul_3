import { Link } from 'react-router'
import { LegalPage, type LegalSection } from '../components/LegalPage'

const SECTIONS: LegalSection[] = [
  {
    title: 'About these terms',
    body: <p>These Terms of Service govern your use of the Rent Motors website and any booking you request through it. By creating an account or requesting a booking you agree to these terms. If you do not agree, please do not use the service.</p>,
  },
  {
    title: 'Our role',
    body: <p>Rent Motors is a marketplace. Cars listed on the site belong to independent hosts and rental agencies ("hosts"). We help you find a car and pass your booking request to the host; the rental agreement for each trip is between you and the host.</p>,
  },
  {
    title: 'Who can rent',
    body: (
      <ul>
        <li>You must be at least 21 years old, and at least 25 for cars priced above $500 per day.</li>
        <li>You must hold a full driving licence that has been valid for at least 2 years.</li>
        <li>The name on your account, licence and payment card must match.</li>
      </ul>
    ),
  },
  {
    title: 'Bookings and prices',
    body: (
      <>
        <p>Prices are shown per day in US dollars. The trip total shown on a listing is the daily price multiplied by the number of rental days between your pick-up and return dates.</p>
        <p>The daily price includes basic insurance and roadside assistance. Fuel or charging, tolls, parking, traffic fines and optional extras are not included.</p>
        <p>A booking is confirmed only when the host accepts it and we send you a confirmation. Until then, a request can be declined.</p>
      </>
    ),
  },
  {
    title: 'Cancellations',
    body: (
      <ul>
        <li>Free cancellation up to 24 hours before the pick-up time.</li>
        <li>Cancellations within 24 hours of pick-up are charged one rental day.</li>
        <li>If you do not show up, the full booking is charged.</li>
        <li>If a host cancels, you receive a full refund and we will help you find a similar car.</li>
      </ul>
    ),
  },
  {
    title: 'Pick-up, use and return',
    body: (
      <>
        <p>Bring your driving licence and the payment card used for the booking. Inspect the car with the host at pick-up and report any existing damage.</p>
        <p>Only drivers named on the booking may drive. The car may not be used for racing, towing, commercial transport or off-road driving, and may not leave the country without the host's written permission.</p>
        <p>Return the car on time, with the same fuel or charge level, and in the same condition. Late returns may be charged per extra hour, up to one rental day.</p>
      </>
    ),
  },
  {
    title: 'Damage and liability',
    body: <p>You are responsible for the car during the rental period. Damage not covered by the included insurance, and any excess stated in the rental agreement, is charged to you. To the extent permitted by law, Rent Motors is not liable for indirect losses arising from a rental.</p>,
  },
  {
    title: 'Your account',
    body: <p>Keep your password private and tell us if you think someone else has used your account. We may suspend accounts that break these terms or that we believe are being used fraudulently.</p>,
  },
  {
    title: 'Changes and contact',
    body: <p>We may update these terms from time to time; the date at the top of this page shows the latest version. Questions? <Link to="/contact">Contact us</Link> or write to hello@rentmotors.com.</p>,
  },
]

export function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="October 1, 2026"
      intro="The short version: rent responsibly, return the car as you found it, and cancel at least 24 hours ahead for a full refund. The details are below."
      sections={SECTIONS}
    />
  )
}
