'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'

export default function FAQs() {
    const faqItems = [
        {
            id: 'item-1',
            question: 'How does the free plan work?',
            answer: 'Free includes the builder, connected tables, and limited AI so you can validate a page. Upgrade when you need more seats, domains, or heavier AI usage.',
        },
        {
            id: 'item-2',
            question: 'What does "fair use" of AI mean on Plus?',
            answer: 'Plus includes generous AI drafting and edits. If usage is consistently high, we will recommend Pro or set sensible limits so costs stay predictable.',
        },
        {
            id: 'item-3',
            question: 'Can I connect my own data?',
            answer: 'Yes. Model your tables in Suplex and reference them via mentions. We support common data types out of the box and keep them in sync across pages.',
        },
        {
            id: 'item-4',
            question: 'Do I need engineers to launch pages?',
            answer: 'Founders and ops teams can ship without writing code. When you need deeper logic, developers can extend Suplex with custom components and data sources.',
        },
        {
            id: 'item-5',
            question: 'Can I use a custom domain?',
            answer: 'Plus and Pro include custom domains. Free projects publish on a Suplex subdomain so you can share quickly.',
        },
    ]

    return (
        <section
            id="faq"
            className="py-16 md:py-24">
            <div className="mx-auto max-w-2xl px-6">
                <div className="space-y-12">
                    <h2 className="text-foreground text-center text-4xl font-semibold">Your questions answered</h2>

                    <Accordion
                        type="single"
                        collapsible
                        className="-mx-2 sm:mx-0">
                        {faqItems.map((item) => (
                            <div
                                className="group"
                                key={item.id}>
                                <AccordionItem
                                    value={item.id}
                                    className="data-[state=open]:bg-muted peer rounded-xl border-none px-5 py-1 data-[state=open]:border-none md:px-7">
                                    <AccordionTrigger className="cursor-pointer text-base hover:no-underline">{item.question}</AccordionTrigger>
                                    <AccordionContent>
                                        <p className="text-base">{item.answer}</p>
                                    </AccordionContent>
                                </AccordionItem>
                                <hr className="mx-5 -mb-px group-last:hidden peer-data-[state=open]:opacity-0 md:mx-7" />
                            </div>
                        ))}
                    </Accordion>

                    <p className="text-muted-foreground text-center">
                        Can't find what you're looking for? Contact our{' '}
                        <Link
                            href="mailto:hello@suplex.app"
                            className="text-primary font-medium hover:underline">
                            customer support team
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    )
}
