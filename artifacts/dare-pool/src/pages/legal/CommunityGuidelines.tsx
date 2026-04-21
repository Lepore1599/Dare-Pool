import { LegalPage } from "./LegalPage";

export function CommunityGuidelines() {
  return (
    <LegalPage
      title="Community Guidelines"
      intro="DarePool is meant to be competitive, creative, and entertaining. To keep the platform safe, all users must follow these rules."
      sections={[
        {
          heading: "1. No Self-Harm or Dangerous Dares",
          body: "Do not post or encourage dares involving self-harm, serious injury, choking, overdose, starvation, cutting, reckless stunts, or other dangerous conduct.",
        },
        {
          heading: "2. No Illegal Activity",
          body: "Do not post or promote dares involving theft, vandalism, trespassing, fraud, drugs, weapons misuse, or any other illegal behavior.",
        },
        {
          heading: "3. No Harassment or Bullying",
          body: "Do not target, threaten, humiliate, harass, bully, or abuse other users.",
        },
        {
          heading: "4. No Hate Speech or Slurs",
          body: "Racism, hate speech, slurs, dehumanizing language, or attacks on protected groups are not allowed.",
        },
        {
          heading: "5. No Sexual or Exploitative Content",
          body: "Do not post sexual content, exploitative content, or anything involving minors in unsafe or inappropriate ways.",
        },
        {
          heading: "6. Keep It Competitive, Not Harmful",
          body: "Creativity is encouraged. Harm, abuse, intimidation, and dangerous behavior are not.",
        },
        {
          heading: "7. Respect Moderation",
          body: "Content may be blocked, flagged, removed, or reviewed. Repeated violations may result in account restrictions or permanent bans.",
        },
        {
          heading: "8. Comments Must Stay Within the Rules",
          body: "Mild profanity in non-abusive contexts may be allowed, but bullying, targeted insults, hate speech, threats, and excessive abusive language are not allowed.",
        },
        {
          heading: "9. No Manipulation",
          body: "Do not attempt to rig votes, spam the platform, abuse boosts, create fake engagement, or exploit the app.",
        },
        {
          heading: "10. Enforcement",
          body: "Violations may lead to content removal, loss of features, pool disqualification, suspension, or permanent account bans.",
        },
      ]}
    />
  );
}
