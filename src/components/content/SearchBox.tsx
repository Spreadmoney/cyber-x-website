import { TYPE } from "@/components/kit/Kit";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";

/**
 * The search box (Figma SEARCH). A plain form that asks the server, so it
 * works before any script has loaded. 16px text on phones: iPhone zooms in
 * on anything smaller.
 */
export function SearchBox({
  action,
  label,
  placeholder,
  query = "",
}: {
  action: string;
  label: string;
  placeholder: string;
  query?: string;
}) {
  return (
    <form role="search" action={action} method="get" className="w-full lg:w-[640px]">
      <label htmlFor={`${action}-q`} className="sr-only">
        {label}
      </label>
      <div className="focus-within:border-accent focus-within:outline-accent flex h-[52px] items-center gap-3 rounded-full border border-[#d5dce8] bg-white pr-5 pl-[18px] shadow-[0_6px_18px_rgb(10_19_56/0.08)] focus-within:outline-2 focus-within:outline-offset-2 lg:h-[60px]">
        <Icon name="search" className="size-5" />
        <input
          id={`${action}-q`}
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          maxLength={100}
          className="text-fg min-w-0 flex-1 appearance-none bg-transparent text-base outline-none placeholder:text-[#737d8f] lg:text-[17px] [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query ? (
          <SiteLink
            href={action}
            aria-label="Clear the search"
            className={`${TYPE.h4} text-muted-fg hover:text-fg -mr-1 flex size-8 items-center justify-center rounded-full`}
          >
            ×
          </SiteLink>
        ) : null}
        <button type="submit" className="sr-only">
          Search
        </button>
      </div>
    </form>
  );
}
