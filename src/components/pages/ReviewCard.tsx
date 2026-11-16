import { DataRow, Frost, MockButton, TYPE } from "@/components/kit/Kit";

/** A sample withdrawal, as the app's review screen shows it (Figma REVIEW). */
export function ReviewCard({ title, button }: { title: string; button: string }) {
  return (
    <Frost className="lg:w-[480px]">
      <p className={`${TYPE.cap} text-muted-fg`}>{title}</p>
      <div>
        <DataRow label="To" value="GTBank · •••• 4821" />
        <DataRow label="Name" value="Ayora Okafor" line />
        <DataRow label="Amount" value="₦25,000.00" line />
        <DataRow label="Fee" value="₦10.00" line />
        <DataRow label="Total" value="₦25,010.00" line />
      </div>
      <MockButton label={button} />
    </Frost>
  );
}
