import { Note, Rows, Steps, TYPE } from "@/components/kit/Kit";
import { SiteLink } from "@/components/site/SiteLink";
import type { Block, Inline } from "@/lib/content/markdown";

/** Words with links, drawn by React (nothing from a file becomes HTML). */
export function InlineText({ content }: { content: readonly Inline[] }) {
  return (
    <>
      {content.map((part, index) =>
        part.href ? (
          part.href.startsWith("https://") ? (
            <a key={index} href={part.href} className="text-accent underline underline-offset-2">
              {part.text}
            </a>
          ) : (
            <SiteLink
              key={index}
              href={part.href}
              className="text-accent underline underline-offset-2"
            >
              {part.text}
            </SiteLink>
          )
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** A post or help article (Figma article column): the first paragraph leads. */
export function ArticleBody({ blocks }: { blocks: readonly Block[] }) {
  const lead = blocks.findIndex((block) => block.kind === "paragraph");
  return (
    <div className="flex flex-col gap-3.5 lg:gap-[18px]">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <h2 key={index} className={`${TYPE.h3} pt-2`}>
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p
                key={index}
                className={`${TYPE.body} ${index === lead ? "text-fg" : "text-muted-fg"}`}
              >
                <InlineText content={block.content} />
              </p>
            );
          case "note":
            return (
              <Note key={index} tone={block.tone} icon={block.tone === "blue" ? "lock" : undefined}>
                <InlineText content={block.content} />
              </Note>
            );
          case "steps":
            return (
              <Steps
                key={index}
                items={block.items.map((item) => [
                  <InlineText key="t" content={item.title} />,
                  item.text ? <InlineText key="d" content={item.text} /> : undefined,
                ])}
              />
            );
          case "rows":
            return (
              <Rows
                key={index}
                labelWidth={block.items.every((item) => item.label.length <= 6) ? 120 : 200}
                items={block.items.map((item) => [
                  item.label,
                  <InlineText key="r" content={item.text} />,
                ])}
              />
            );
          case "list":
            return (
              <ul
                key={index}
                className={`flex list-disc flex-col gap-2 pl-6 ${TYPE.body} text-muted-fg`}
              >
                {block.items.map((item, i) => (
                  <li key={i}>
                    <InlineText content={item} />
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}
