"use client";

import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQs() {
  const faqItems = [
    {
      answer:
        "Free includes the builder, connected tables, and limited AI so you can validate a page. Upgrade when you need more seats, domains, or heavier AI usage.",
      id: "item-1",
      question: "How does the free plan work?",
    },
    {
      answer:
        "Plus includes generous AI drafting and edits. If usage is consistently high, we will recommend Pro or set sensible limits so costs stay predictable.",
      id: "item-2",
      question: 'What does "fair use" of AI mean on Plus?',
    },
    {
      answer:
        "Yes. Model your tables in Suplex and reference them via mentions. We support common data types out of the box and keep them in sync across pages.",
      id: "item-3",
      question: "Can I connect my own data?",
    },
    {
      answer:
        "Founders and ops teams can ship without writing code. When you need deeper logic, developers can extend Suplex with custom components and data sources.",
      id: "item-4",
      question: "Do I need engineers to launch pages?",
    },
    {
      answer:
        "Plus and Pro include custom domains. Free projects publish on a Suplex subdomain so you can share quickly.",
      id: "item-5",
      question: "Can I use a custom domain?",
    },
  ];

  return (
    <section className="py-16 md:py-24" id="faq">
      <div className="mx-auto max-w-2xl px-6">
        <div className="space-y-12">
          <h2 className="text-center font-semibold text-4xl text-foreground">
            Your questions answered
          </h2>

          <Accordion className="-mx-2 sm:mx-0" collapsible type="single">
            {faqItems.map((item) => (
              <div className="group" key={item.id}>
                <AccordionItem
                  className="peer rounded-xl border-none px-5 py-1 data-[state=open]:border-none data-[state=open]:bg-muted md:px-7"
                  value={item.id}
                >
                  <AccordionTrigger className="cursor-pointer text-base hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-base">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
                <hr className="mx-5 -mb-px group-last:hidden peer-data-[state=open]:opacity-0 md:mx-7" />
              </div>
            ))}
          </Accordion>

          <p className="text-center text-muted-foreground">
            Can't find what you're looking for? Contact our{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="mailto:hello@suplex.app"
            >
              customer support team
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
