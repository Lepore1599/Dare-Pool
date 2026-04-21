import { LegalPage } from "./LegalPage";

export function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="DarePool collects and uses certain information to operate the app, process transactions, protect users, and improve the service."
      sections={[
        {
          heading: "1. Information We Collect",
          body: "We may collect information such as:\n• Username\n• Email address\n• Profile information\n• Uploaded content\n• Comments\n• Wallet and transaction records\n• Device/session information\n• Legal/policy acceptance records",
        },
        {
          heading: "2. Payments",
          body: "Payment and payout processing may be handled by third-party payment providers. DarePool does not store raw payment card or bank account details.",
        },
        {
          heading: "3. How We Use Information",
          body: "We may use information to:\n• Create and manage accounts\n• Process funding, payouts, and withdrawals\n• Moderate content\n• Prevent fraud and abuse\n• Send important account or transaction notifications\n• Improve the app",
        },
        {
          heading: "4. Sharing",
          body: "We may share limited information with service providers that help operate the app, such as payment processors, hosting providers, analytics tools, moderation tools, and customer support systems.",
        },
        {
          heading: "5. Retention",
          body: "We may retain account, content, moderation, and transaction data as needed for security, legal, fraud-prevention, and operational purposes.",
        },
        {
          heading: "6. Security",
          body: "We take reasonable measures to protect user data, but no system can be guaranteed perfectly secure.",
        },
        {
          heading: "7. Your Choices",
          body: "Users may be able to manage account details, privacy settings, notification preferences, and account deletion options within the app Settings.",
        },
        {
          heading: "8. Policy Updates",
          body: "This Privacy Policy may be updated from time to time. Continued use of the app after changes take effect means you accept the updated version.",
        },
      ]}
    />
  );
}
