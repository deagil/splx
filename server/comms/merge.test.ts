import { describe, expect, it } from "vitest";
import { escapeHtml, mergeEmailString } from "@/lib/comms/merge";
import { resolveTemplateVariables } from "@/lib/comms/variables";
import { renderEmailTemplate } from "./render";

describe("mergeEmailString", () => {
  it("replaces dotted keys inline", () => {
    expect(
      mergeEmailString("Hi {{customer.firstName}}!", {
        "customer.firstName": "Alex",
      })
    ).toBe("Hi Alex!");
  });

  it("leaves unknown tokens intact", () => {
    expect(mergeEmailString("Hi {{missing}}", {})).toBe("Hi {{missing}}");
  });
});

describe("escapeHtml", () => {
  it("escapes markup", () => {
    expect(escapeHtml(`<a href="x">`)).toBe("&lt;a href=&quot;x&quot;&gt;");
  });
});

describe("renderEmailTemplate", () => {
  it("escapes special characters exactly once", async () => {
    const rendered = await renderEmailTemplate({
      blocks: [
        { id: "b1", text: "{{company}} said it's <fine>", type: "text" },
      ],
      subject: "{{company}} & you",
      values: { company: "Acme & Co" },
    });

    // React escapes the children itself; a second pass through escapeHtml would
    // leak literal `&amp;` / `&#39;` into the delivered mail.
    expect(rendered.html).toContain(
      "Acme &amp; Co said it&#x27;s &lt;fine&gt;"
    );
    expect(rendered.html).not.toContain("&amp;amp;");
    expect(rendered.html).not.toContain("&amp;#39;");
    expect(rendered.subject).toBe("Acme & Co & you");
  });
});

describe("resolveTemplateVariables", () => {
  it("requires mapped values", () => {
    expect(() =>
      resolveTemplateVariables(
        [
          {
            key: "name",
            label: "Name",
            required: true,
            type: "string",
          },
        ],
        {}
      )
    ).toThrow("Missing required variable");
  });

  it("coerces numbers", () => {
    expect(
      resolveTemplateVariables(
        [
          {
            key: "n",
            label: "N",
            required: true,
            type: "number",
          },
        ],
        { n: "12" }
      )
    ).toEqual({ n: 12 });
  });
});
