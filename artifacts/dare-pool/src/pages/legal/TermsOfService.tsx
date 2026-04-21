import { LegalPage } from "./LegalPage";

export function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Last Updated: April 2025"
      intro="Welcome to DarePool. By creating an account or using DarePool, you agree to these Terms of Service."
      sections={[
        {
          heading: "1. Eligibility",
          body: "You must be at least 18 years old to use DarePool. By using this app, you confirm that you meet this requirement and that you are legally able to enter into this agreement.",
        },
        {
          heading: "2. Use at Your Own Risk",
          body: "DarePool allows users to create dares, fund dares, submit videos, vote on submissions, and receive payouts according to app rules. Participation is completely voluntary. You are never required to participate in any dare, and any action you take is your own decision and responsibility.",
        },
        {
          heading: "3. No Dangerous or Illegal Content",
          body: "You may not post, promote, fund, submit, or encourage dares involving self-harm, illegal activity, violence, abuse, harassment, hate speech, sexual exploitation, dangerous conduct, or any content that violates our rules or applicable law.",
        },
        {
          heading: "4. No Guarantee of Earnings",
          body: "Using DarePool does not guarantee that you will receive any payout, reward, or profit. Outcomes depend on user activity, votes, moderation, participation, and app rules.",
        },
        {
          heading: "5. Pool and Payout Rules",
          body: "Dares may receive funding from users. If a dare ends with a valid winning submission, the pool is distributed as follows:\n• 80% to the winning submission user\n• 10% to the original dare creator\n• 10% to the platform\n\nIf a dare ends with no valid submissions, the full pool may be transferred to another eligible active dare according to app rules. No refunds are guaranteed.",
        },
        {
          heading: "6. Payments and Wallet",
          body: "Deposits, withdrawals, and payouts may be processed through third-party payment providers. DarePool does not store raw payment card or bank information. Withdrawals may require identity verification or additional review.",
        },
        {
          heading: "7. User Content",
          body: "You are solely responsible for any dare, video, comment, username, profile content, or other material you post through the app. You retain ownership of your content, but by posting it, you grant DarePool a non-exclusive license to host, display, distribute, and promote that content within the app and in connection with the service.",
        },
        {
          heading: "8. Moderation and Enforcement",
          body: "We may remove content, restrict visibility, suspend features, limit accounts, or permanently ban users at our discretion if content or conduct violates our rules, legal requirements, safety standards, or platform integrity.",
        },
        {
          heading: "9. Account Responsibility",
          body: "You are responsible for maintaining the security of your account and login credentials. You may not impersonate others, manipulate votes, abuse funding systems, or attempt to exploit the platform.",
        },
        {
          heading: "10. No Refunds",
          body: "Except where required by law, contributions, funding actions, purchases, boosts, and similar transactions are final and non-refundable.",
        },
        {
          heading: "11. Limitation of Liability",
          body: "To the maximum extent permitted by law, DarePool and its operators are not liable for injuries, damages, losses, disputes, user conduct, user-generated content, participation decisions, missed winnings, transferred pools, or any indirect or consequential damages arising from use of the app.",
        },
        {
          heading: "12. Changes to Terms",
          body: "We may update these Terms from time to time. Continued use of DarePool after changes take effect means you accept the updated Terms.",
        },
        {
          heading: "13. Contact",
          body: "For support or questions, use the Report a Problem option in Settings.",
        },
      ]}
    />
  );
}
