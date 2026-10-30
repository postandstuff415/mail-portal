"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// "Who pays?" for staff forms: a partner nonprofit, or the client (self-pay,
// with a monthly price). Field names: billingType, orgId, monthlyPrice.
export function BillingFields({
  idPrefix,
  orgs,
  defaultOrgId = "",
  selfPay = false,
  defaultPrice = "15.00",
}: {
  idPrefix: string;
  orgs: { id: string; name: string }[];
  defaultOrgId?: string;
  selfPay?: boolean;
  defaultPrice?: string;
}) {
  const [type, setType] = useState(selfPay ? "SELF_PAY" : "NONPROFIT");
  return (
    <>
      <Label htmlFor={`billing-${idPrefix}`}>Who pays?</Label>
      <select
        id={`billing-${idPrefix}`}
        name="billingType"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="h-12 rounded-md border bg-transparent px-3"
      >
        <option value="NONPROFIT" className="text-black">
          A partner nonprofit
        </option>
        <option value="SELF_PAY" className="text-black">
          The client (self-pay)
        </option>
      </select>
      {type === "NONPROFIT" ? (
        <>
          <Label htmlFor={`org-${idPrefix}`}>Nonprofit</Label>
          <select
            id={`org-${idPrefix}`}
            name="orgId"
            required
            defaultValue={defaultOrgId}
            className="h-12 rounded-md border bg-transparent px-3"
          >
            <option value="" className="text-black">
              Pick one
            </option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id} className="text-black">
                {o.name}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <Label htmlFor={`price-${idPrefix}`}>Monthly price ($)</Label>
          <Input
            id={`price-${idPrefix}`}
            name="monthlyPrice"
            inputMode="decimal"
            required
            defaultValue={defaultPrice}
            className="h-12"
          />
          <p className="text-sm opacity-70">
            3-month minimum, then month to month. The first bill goes out today by email (and text, if they agreed).
          </p>
        </>
      )}
    </>
  );
}
