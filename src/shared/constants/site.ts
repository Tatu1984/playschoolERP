/**
 * Public site constants: canonical URL, contact points and social handles.
 *
 * Social entries with an empty `href` are treated as "not set up yet" and are
 * hidden rather than rendered as dead `#` links — fill them in and they appear.
 */
export const SITE = {
  name: "Climb Kiddo",
  tagline: "Daycare · Playschool · Kids Activity Centre",
  description:
    "A warm, safe, playful daycare, playschool and kids activity centre in Kolkata — small batches, trained teachers and live classroom cameras for parents.",
  /** Override with NEXT_PUBLIC_SITE_URL once the ERP has its own domain. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://playschool-erp.vercel.app",
  phones: ["+917003708969", "+919831440029"],
  whatsapp: "+917003708969",
  email: "hello@climbkiddo.in",
} as const;

export interface SocialLink {
  label: string;
  href: string;
  icon: "instagram" | "facebook" | "youtube";
}

export const SOCIALS: SocialLink[] = [
  { label: "Instagram", href: "", icon: "instagram" },
  { label: "Facebook", href: "", icon: "facebook" },
  { label: "YouTube", href: "", icon: "youtube" },
];

/** Only the ones that have actually been set up. */
export const ACTIVE_SOCIALS = SOCIALS.filter((s) => s.href.length > 0);

export interface BranchLocation {
  id: string;
  name: string;
  address: string;
  /** Google Maps embed query — no API key needed for the classic embed. */
  mapQuery: string;
  phone: string;
  hours: string;
}

export const BRANCH_LOCATIONS: BranchLocation[] = [
  {
    id: "kathgola",
    name: "Kathgola Branch",
    address: "12/A Kathgola Road, Beleghata, Kolkata 700010",
    mapQuery: "Kathgola Road, Beleghata, Kolkata 700010",
    phone: "+917003708969",
    hours: "Mon–Sat · 8:00 AM – 6:30 PM",
  },
  {
    id: "dhakuria",
    name: "Dhakuria Branch",
    address: "7 Selimpur Lane, Dhakuria, Kolkata 700031",
    mapQuery: "Selimpur Lane, Dhakuria, Kolkata 700031",
    phone: "+919831440029",
    hours: "Mon–Sat · 8:30 AM – 6:00 PM",
  },
];
