import { redirect } from "next/navigation";

/** SoW §8.3 lists a dedicated invoices route; the Fees page owns that tab. */
export default function Page() {
  redirect("/parent/payments");
}
