"use client";

import { useId, useState } from "react";

import { getCountryPack } from "@/config/countries";
import { SERVICES, feeFor, isService, type Service } from "@/content/fees";
import { formatMoney, parseMoney } from "@/lib/money";

/**
 * "Work out a fee" (Figma Fees and limits). Works it out in the browser:
 * nothing is sent anywhere. The fields use 16px text on phones (Figma has
 * 15px): iPhone Safari zooms the page in on any smaller field.
 */
const NAIRA = getCountryPack().currency;

export function FeeCalculator() {
  const id = useId();
  const [service, setService] = useState<Service>("withdraw");
  const [text, setText] = useState("25,000");
  const amount = parseMoney(text, NAIRA);
  const result = amount === null ? null : feeFor(service, amount);

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <h2 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
        Work out a fee
      </h2>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-service`} className="text-[13px] leading-[1.2] font-medium">
          What are you doing?
        </label>
        <select
          id={`${id}-service`}
          value={service}
          onChange={(event) => {
            if (isService(event.target.value)) setService(event.target.value);
          }}
          className="focus-visible:outline-accent h-[52px] rounded-[14px] border border-[#d5dce8] bg-white px-4 text-base focus-visible:outline-2 lg:text-[17px]"
        >
          {Object.entries(SERVICES).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-amount`} className="text-[13px] leading-[1.2] font-medium">
          Amount
        </label>
        <span className="focus-within:outline-accent flex h-[52px] items-center gap-1 rounded-[14px] border border-[#d5dce8] bg-white px-4 focus-within:outline-2">
          <span aria-hidden="true" className="text-base lg:text-[17px]">
            ₦
          </span>
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            autoComplete="off"
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-describedby={`${id}-result`}
            className="w-full bg-transparent text-base outline-none lg:text-[17px]"
          />
        </span>
      </div>
      <div id={`${id}-result`} aria-live="polite">
        {result ? (
          <>
            <div className="flex items-center gap-3 border-t border-[rgb(10_19_56/0.08)] py-2.5 text-[15px] leading-[1.5]">
              <span className="text-muted-fg">Fee</span>
              <span className="flex-1 text-right">{formatMoney(result.fee, NAIRA)}</span>
            </div>
            <div className="flex items-center gap-3 py-2.5 text-[15px] leading-[1.5]">
              <span className="text-muted-fg">Total</span>
              <span className="flex-1 text-right">{formatMoney(result.total, NAIRA)}</span>
            </div>
          </>
        ) : (
          <p className="text-error-text text-[15px] leading-[1.5]">
            Type an amount in naira, like 25,000.
          </p>
        )}
      </div>
    </form>
  );
}
