// Terms of Service page for GecorpID
// Place this file at src/app/terms/page.tsx

import React from 'react';

export const metadata = {
  title: 'Terms of Service | GecorpID',
};

export default function TermsPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-4">Terms of Service</h1>
      <p className="italic mb-6">Effective date: September 10, 2025</p>

      <p className="mb-4">
        These Terms of Service (“Terms”) form a legal agreement between you (“you” or “User”) and
        GecorpID (“we,” “us,” or “our”). By accessing or using the GecorpID platform (the “Service”),
        you agree to be bound by these Terms. If you do not agree to these Terms, do not use the
        Service. If you are using the Service on behalf of an organization, you represent that you
        have authority to bind that organization and that the terms “you” and “User” refer to that
        organization.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Service Description</h2>
      <p className="mb-4">
        The Service allows registered clients (“Issuers”) to create and issue verifiable PDF
        credentials and allows third parties (“Verifiers”) to verify such credentials using QR codes
        and metadata. The Service operates in conjunction with third‑party infrastructure providers
        such as Supabase for data storage and Vercel for hosting, and an active internet connection
        is required. We may update or modify the Service at any time.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Account and Credential Security</h2>
      <p className="mb-4">
        We provide login credentials (username and password) to each Issuer. Issuers are
        responsible for maintaining the confidentiality of these credentials and for all activities
        that occur under their accounts. You must notify us immediately of any unauthorized use of
        your credentials or any other breach of security. You may not share your login information
        or allow others to access your account.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. User Responsibilities</h2>
      <p className="mb-4">
        You agree to:
      </p>
      <ul className="list-disc pl-6 mb-4 space-y-2">
        <li>
          Use the Service only for lawful purposes and in compliance with all applicable laws and
          regulations.
        </li>
        <li>
          Ensure that any information you provide to the Service is accurate and that you have all
          necessary rights and permissions to issue credentials.
        </li>
        <li>
          Not misrepresent a credential or issue a credential on behalf of another party without
          authorization.
        </li>
        <li>
          Not use the Service in a manner that interferes with, disrupts or imposes a
          disproportionate load on our servers or those of our third‑party providers.
        </li>
        <li>
          Not attempt to gain unauthorized access to the Service or to any accounts, systems or
          networks related to the Service.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Third‑Party Services and Links</h2>
      <p className="mb-4">
        Our Service may contain links to or rely on third‑party services (including, without
        limitation, hosting, data storage, authentication and QR scanning services). We have no
        control over the content, privacy policies or practices of these third parties and we do
        not assume any responsibility for them:contentReference[oaicite:0]{index=0}. You acknowledge and agree that we will not be responsible or liable for any damage or loss
        caused by the availability or unavailability of these services or your use of them.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Disclaimer of Warranties</h2>
      <p className="mb-4">
        Your use of the Service is at your sole risk. The Service is provided on an “AS IS” and
        “AS AVAILABLE” basis. We expressly disclaim all warranties of any kind, whether express,
        implied, statutory or otherwise, including, without limitation, any warranties of
        merchantability, fitness for a particular purpose, non‑infringement and uninterrupted
        operation:contentReference[oaicite:1]{index=1}. We do not warrant that the Service will meet your requirements, be
        uninterrupted, timely, secure or error‑free, or that any errors will be corrected.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">6. Limitation of Liability</h2>
      <p className="mb-4">
        To the maximum extent permitted by law, we will not be liable to you for any indirect,
        incidental, special, consequential or punitive damages (including, without limitation,
        damages for loss of profits, data, goodwill or other intangible losses) resulting from or
        relating to your use of or inability to use the Service:contentReference[oaicite:2]{index=2}. In no event will our total
        liability for all claims arising out of or relating to the Service exceed the greater of
        (i) the amount paid by you for the Service in the twelve months preceding the claim or
        (ii) USD 100. You acknowledge that we will not be liable for any loss or damage resulting
        from the failure of third‑party services, network outages or other events beyond our
        reasonable control:contentReference[oaicite:3]{index=3}.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">7. Data and Privacy</h2>
      <p className="mb-4">
        We process personal data in accordance with our Privacy Policy, which explains what data we
        collect and how we use and protect it. By using the Service, you consent to our collection
        and use of personal data as described in the Privacy Policy.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">8. Modifications to the Service and Terms</h2>
      <p className="mb-4">
        We may modify or discontinue the Service at any time. We may also modify these Terms at
        our sole discretion. If we make changes to these Terms that we consider material, we will
        notify you by posting a notice on the Service. Your continued use of the Service after the
        effective date of the revised Terms constitutes your acceptance of the revised Terms:contentReference[oaicite:4]{index=4}.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">9. Governing Law and Dispute Resolution</h2>
      <p className="mb-4">
        These Terms are governed by the laws of the jurisdiction in which GecorpID is established,
        without regard to its conflict of law principles. You agree to first attempt to resolve any
        dispute informally by contacting us. If we cannot resolve a dispute through informal
        negotiation, the parties agree to submit to the exclusive jurisdiction of the courts
        located in that jurisdiction. If you are a consumer residing in the European Union or
        another jurisdiction that provides mandatory consumer protections, you will benefit from
        any mandatory provisions of the law of your country of residence:contentReference[oaicite:5]{index=5}.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">10. Translation</h2>
      <p className="mb-4">
        These Terms may be provided in multiple languages for convenience. In the event of any
        discrepancy or conflict between the English version and a translation, the English version
        will prevail:contentReference[oaicite:6]{index=6}.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">11. Contact Us</h2>
      <p className="mb-4">
        If you have any questions about these Terms or the Service, please contact us at
        <a href="mailto:support@gecorpid.com" className="text-blue-600 hover:underline">
          &nbsp;support@gecorpid.com
        </a>
        .
      </p>
    </main>
  );
}
