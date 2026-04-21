import { LegalPage } from "./LegalPage";

export function SafetyDisclaimer() {
  return (
    <LegalPage
      title="Safety & Risk Disclaimer"
      intro="DarePool is a user-generated platform. Users are fully responsible for their own actions."
      sections={[
        {
          heading: "1. Voluntary Participation",
          body: "You are never required to participate in any dare. Any action you take is completely voluntary and at your own risk.",
        },
        {
          heading: "2. Personal Responsibility",
          body: "You are solely responsible for your decisions, actions, safety, surroundings, and consequences related to participation in any dare or submission.",
        },
        {
          heading: "3. No Endorsement of Harm",
          body: "DarePool does not endorse dangerous, illegal, reckless, abusive, or harmful behavior.",
        },
        {
          heading: "4. Moderation Is Not a Guarantee",
          body: "Although DarePool may moderate, filter, flag, or remove content, no moderation system is perfect. Users must use their own judgment and common sense at all times.",
        },
        {
          heading: "5. Assumption of Risk",
          body: "By using DarePool, you acknowledge that you may encounter user-generated content that is offensive, irresponsible, or inappropriate, and you agree that DarePool is not responsible for your decision to engage with any activity.",
        },
      ]}
    />
  );
}
