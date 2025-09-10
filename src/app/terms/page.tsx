// Terms of Service page for GecorpID
// Place this file at src/app/terms/page.tsx

import React from 'react';

export const metadata = {
  title: 'Terms of Service | GecorpID',
  description:
    'GecorpID Terms of Service: use rules, third-party dependence, no-warranty disclaimer, and limitation of liability.',
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-4">Terms of Service</h1>
      <p className="italic mb-6">Effective date: September 10, 2025</p>

      <p className="mb-4">
        These Terms of Service (“Terms”) form a legal agreement between you (“you” or “User”) and
        GecorpID (“we,” “us,” or “our”). By accessing or using the GecorpID platform (the
        “Service”), you agree to be bound by these Terms. If you do not agree, do not use the
        Service. If you use the Service on behalf of an organization, you represent that you have
        authority to bind that organization and that “you” refers to that organization.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Service Description</h2>
      <p className="mb-4">
        The Service enables registered clients (“Issuers”) to create and issue verifiable PDF
        credentials and enables third parties (“Verifiers”) to validate them via QR codes and
        metadata. The Service relies on third-party providers (for example, hosting and data
        storage) and requires an active internet connection. We may update or modify the Service at
        any time.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Account and Credential Security</h2>
      <p className="mb-4">
        We provide login credentials (username and password) to each Issuer. Issuers are
        responsible for maintaining the confidentiality of these credentials and for all activities
        under their accounts. Notify us immediately of any unauthorized use or security breach. Do
        not share your login information or allow others to access your account.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. User Responsibilities</h2>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>Use the Service lawfully and in compliance with applicable regulations.</li>
        <li>Ensure you have all rights and permissions to issue any credential.</li>
        <li>Do not misrepresent a credential or issue on behalf of another party without authorization.</li>
        <li>Do not interfere with or overload our or our providers’ systems.</li>
        <li>Do not attempt to gain unauthorized access to accounts or networks related to the Service.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Third-Party Services and Links</h2>
      <p className="mb-4">
        The Service may contain links to or depend on third-party services (including hosting, data
        storage, authentication, and QR scanning). We do not control and are not responsible for
        third-party content, availability, or practices. You agree that we will not be liable for
        any damage or loss caused by the availability or unavailability of such services or your use
        of them.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Disclaimer of Warranties</h2>
      <p className="mb-4">
        Your use of the Service is at your sole risk. The Service is provided on an “AS IS” and “AS
        AVAILABLE” basis. We disclaim all warranties, whether express, implied, statutory, or
        otherwise, including implied warranties of merchantability, fitness for a particular
        purpose, non-infringement, and uninterrupted operation. We do not warrant that the Service
        will meet your requirements, be uninterrupted, secure, or error-free, or that errors will be
        corrected.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Limitation of Liability</h2>
      <p className="mb-4">
        To the maximum extent permitted by law, we will not be liable for any indirect, incidental,
        special, consequential, or punitive damages (including lost profits, data loss, business
        interruption, or loss of goodwill) arising from or related to your use of or inability to
        use the Service. In no event will our total liability for all claims exceed the greater of
        (i) the amount paid by you for the Service in the twelve months preceding the claim or
        (ii) USD 100. We are not liable for any loss or damage resulting from failures of third-party
        services, network outages, or other events beyond our reasonable control.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Data and Privacy</h2>
      <p className="mb-4">
        We process personal data in accordance with our Privacy Policy, which explains what data we
        collect and how we use and protect it. By using the Service, you consent to our collection
        and use of personal data as described in the Privacy Policy.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Modifications</h2>
      <p className="mb-4">
        We may modify or discontinue the Service at any time. We may also modify these Terms at our
        discretion. If changes we consider material are made, we will provide notice (for example,
        by posting on the Service). Your continued use after the effective date of the revised Terms
        constitutes acceptance.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">9. Governing Law and Dispute Resolution</h2>
      <p className="mb-4">
        These Terms are governed by the laws of the jurisdiction in which GecorpID is established,
        without regard to conflict of laws. You agree to first attempt to resolve any dispute
        informally by contacting us. If unresolved, the parties submit to the exclusive jurisdiction
        of the courts in that jurisdiction. Mandatory consumer protections in your country of
        residence will apply where required.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">10. Translation</h2>
      <p className="mb-4">
        These Terms may be provided in multiple languages for convenience. In case of any
        discrepancy, the English version will prevail.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">11. Contact Us</h2>
      <p className="mb-4">
        Questions about these Terms? Contact{' '}
        <a href="mailto:support@gecorpid.com" className="text-blue-600 hover:underline">
          support@gecorpid.com
        </a>
        .
      </p>
    </main>
  );
}
