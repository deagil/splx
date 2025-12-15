import { Button } from '@/components/ui/button'
import { Check, Sparkles, Star, Brain } from 'lucide-react'
import Link from 'next/link'
import { fa } from 'zod/v4/locales'

const tiers = [
    { name: 'Lite', price: 'Free', note: 'Put a face on your data' },
    { name: 'Plus', price: '£8 per user / month', note: 'Empower your team' },
    { name: 'Pro', price: '£15 / user / month', note: 'Maintain as you scale' },
]

const featureRows = [
    { feature: 'Block based page builder', free: true, plus: true, pro: true },
    { feature: 'Generate reports from chat', free: true, plus: true, pro: true },
    { feature: 'Monitor workflows, Zaps and Edge Functions ', free: true, plus: true, pro: true },
    { feature: 'Per-user assistant', free: 'Limited', plus: true, pro: true },
    { feature: 'Inline Insight', free: false, plus: true, pro: true },
    { feature: 'Auto-Documentation ', free: false, plus: false, pro: true },
    { feature: 'Data retention cleanup', free: false, plus: false, pro: true },
]

const aiRows = [
 { feature: 'Included usage', free: 'Limited', plus: 'Regular use', pro: 'Heavy use'},
 { feature: 'AI model selection', free: 'Mini', plus: 'Balanced', pro: 'Custom' },
 { feature: 'Enable extra usage', free: true, plus: true, pro: true },
 { feature: 'Usage budget', free: 'Per user', plus: 'Pooled', pro: 'Pooled' },
]

const supportRows = [
    { feature: 'Workspace users', free: '2', plus: 'Unlimited', pro: 'Unlimited' },
    { feature: 'Read-only viewers', free: 'Unlimited', plus: 'Unlimited', pro: 'Unlimited' },
    { feature: 'Support', free: 'Community', plus: 'Email', pro: 'Priority' },
]

export default function PricingComparator() {
    return (
        <section
            id="pricing"
            className="bg-muted py-16 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="w-full overflow-auto lg:overflow-visible">
                    <table className="w-[200vw] border-separate border-spacing-x-3 md:w-full dark:[--color-muted:var(--color-zinc-900)]">
                        <thead className="bg-muted/95 sticky top-0">
                            <tr className="*:py-4 *:text-left *:font-medium">
                                <th className="lg:w-2/5"></th>
                                {tiers.map((tier, index) => (
                                    <th
                                        key={tier.name}
                                        className="space-y-3">
                                        <span className="block text-lg font-semibold">{tier.name}</span>
                                        <div className="text-base text-muted-foreground">{tier.price}</div>
                                        <div className="text-sm text-muted-foreground">{tier.note}</div>
                                        <Button
                                            asChild
                                            variant={tier.name === 'Plus' ? 'primary' : 'outline'}>
                                            <Link href="#pricing">Choose {tier.name}</Link>
                                        </Button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Features */}
                            <tr className="*:py-4">
                                <td className="flex items-center gap-2 font-medium">
                                    <Star className="size-4" />
                                    <span>Features</span>
                                </td>
                                <td></td>
                                <td className="border-none px-4"></td>
                                <td></td>
                            </tr>
                            {featureRows.map((row) => (
                                <tr
                                    key={row.feature}
                                    className="*:border-b *:py-4">
                                    <td className="text-muted-foreground">{row.feature}</td>
                                    <td>{renderValue(row.free)}</td>
                                    <td>{renderValue(row.plus)}</td>
                                    <td>{renderValue(row.pro)}</td>
                                </tr>
                            ))}
                            {/* AI */}
                            <tr className="*:pb-4 *:pt-8">
                                <td className="flex items-center gap-2 font-medium">
                                    <Sparkles className="size-4" />
                                    <span>AI</span>
                                </td>
                                <td></td>
                                <td className="border-none px-4"></td>
                                <td></td>
                            </tr>
                            {aiRows.map((row) => (
                                <tr
                                    key={row.feature}
                                    className="*:border-b *:py-4">
                                    <td className="text-muted-foreground">{row.feature}</td>
                                    <td>{renderValue(row.free)}</td>
                                    <td>{renderValue(row.plus)}</td>
                                    <td>{renderValue(row.pro)}</td>
                                </tr>
                            ))}
                            {/* Usage & support */}
                            <tr className="*:pb-4 *:pt-8">
                                <td className="flex items-center gap-2 font-medium">
                                    <Sparkles className="size-4" />
                                    <span>Usage & support</span>
                                </td>
                                <td></td>
                                <td className="bg-muted border-none px-4"></td>
                                <td></td>
                            </tr>
                            {supportRows.map((row) => (
                                <tr
                                    key={row.feature}
                                    className="*:border-b *:py-4">
                                    <td className="text-muted-foreground">{row.feature}</td>
                                    <td>{renderValue(row.free)}</td>
                                    <td>{renderValue(row.plus)}</td>
                                    <td>{renderValue(row.pro)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}

function renderValue(value: boolean | string) {
    if (value === true) {
        return (
            <Check
                className="text-primary size-3"
                strokeWidth={3.5}
            />
        )
    }

    if (value === false) {
        return <span className="text-muted-foreground text-sm">—</span>
    }

    return <span className="text-sm text-foreground">{value}</span>
}
