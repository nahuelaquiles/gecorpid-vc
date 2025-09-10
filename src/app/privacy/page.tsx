// Privacy Policy page for GecorpID
// Place this file at src/app/privacy/page.tsx

import React from 'react';

export const metadata = {
  title: 'Privacy Policy | GecorpID',
  description:
    'GecorpID Privacy Policy: what we collect, how we use data, retention, security, and international transfers.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-4">Privacy Policy</h1>
      <p className="italic mb-6">Effective date: September 10, 2025</p>

      <p className="mb-4">
        This Privacy Policy explains how GecorpID (“we,” “us,” or “our”) collects, uses, and shares
        information when you use our service for issuing and verifying verifiable PDF credentials
        (the “Service”). By using the Service, you agree to the collection and use of information in
        accordance with this policy.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>
          <strong>Account Information:</strong> Email address, tenant ID, API key (or token) and
          hashed credentials used to authenticate Issuers.
        </li>
        <li>
          <strong>Credential Information:</strong> Metadata for issued credentials (issuer tenant
          ID, creation timestamp, file identifier, verification status). PDF contents remain under
          the Issuer’s control.
        </li>
        <li>
          <strong>Usage Information:</strong> IP address, device and browser info, date/time stamps,
          and pages visited for security, troubleshooting, and improvement.
        </li>
        <li>
          <strong>Cookies and Local Storage:</strong> Used to maintain sessions and preferences.
          You can control cookies in your browser; disabling may impact functionality.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Information</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Provide, operate, and maintain the Service.</li>
        <li>Authenticate access and manage accounts.</li>
        <li>Generate and verify credentials.</li>
        <li>Send updates, security alerts, and support responses.</li>
        <li>Analyze usage to improve the Service and protect against abuse.</li>
        <li>Comply with legal obligations and protect our rights.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Sharing of Information</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>
          <strong>Service Providers:</strong> Hosting, database, and related providers acting on our
          behalf under confidentiality and security obligations.
        </li>
        <li>
          <strong>Legal Compliance:</strong> When required by law, regulation, legal process, or
          governmental request.
        </li>
        <li>
          <strong>Protection of Rights:</strong> To enforce agreements or protect the rights,
          property, or safety of GecorpID, clients, verifiers, or others.
        </li>
        <li>
          <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of
          assets; we will provide notice before your information becomes subject to a different
          policy.
        </li>
        <li>
          <strong>Aggregated Data:</strong> We may disclose aggregated or de-identified data that
          cannot reasonably identify you.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Data Retention</h2>
      <p className="mb-4">
        We retain personal information only as long as necessary to provide the Service, comply with
        legal obligations, resolve disputes, and enforce agreements. Credential metadata and logs
        may be retained for audit and security. Upon account closure or deletion request, we will
        delete or anonymize personal information unless retention is required by law.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Data Security</h2>
      <p className="mb-4">
        We use administrative, technical, and physical safeguards to protect information. However,
        no method of transmission or storage is 100% secure. You are responsible for maintaining the
        security of your login credentials.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. International Data Transfers</h2>
      <p className="mb-4">
        GecorpID is based in Argentina and serves users worldwide. We and our providers may process
        data in countries outside your jurisdiction. We take steps to ensure appropriate protection
        consistent with applicable data protection laws.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Your Rights</h2>
      <p className="mb-4">
        Depending on your location, you may have rights to access, correct, update, delete, object
        to or restrict processing, and request portability. To exercise your rights, contact{' '}
        <a href="mailto:privacy@gecorpid.com" className="text-blue-600 hover:underline">
          privacy@gecorpid.com
        </a>
        . We will respond as required by law.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Children’s Privacy</h2>
      <p className="mb-4">
        The Service is not directed to children under 16, and we do not knowingly collect personal
        data from children. If we learn that a child under 16 has provided personal information, we
        will delete it.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">9. Changes to This Policy</h2>
      <p className="mb-4">
        We may update this Privacy Policy from time to time. If we make material changes, we will
        post the updated policy or notify you by other appropriate means. Continued use after the
        effective date constitutes acceptance.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">10. Contact Us</h2>
      <p className="mb-4">
        Questions about this Policy or our data practices? Contact{' '}
        <a href="mailto:privacy@gecorpid.com" className="text-blue-600 hover:underline">
          privacy@gecorpid.com
        </a>
        .
      </p>
    </main>
  );
}
