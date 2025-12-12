import { Button } from '@/components/ui/button'
import { Check, Sparkles, Star } from 'lucide-react'
import Link from 'next/link'

const tiers = [
    { name: 'Free', price: '£0', note: 'Limited AI, core builder' },
    { name: 'Plus', price: '£8 / user / month', note: 'All features, fair-use AI' },
    { name: 'Pro', price: '£20 / user / month', note: 'Everything, higher limits' },
]

const featureRows = [
    { feature: 'Visual builder + templates', free: true, plus: true, pro: true },
    { feature: 'Connected tables & data mentions', free: true, plus: true, pro: true },
    { feature: 'AI drafting & edits', free: 'Limited', plus: 'Fair use', pro: 'Unlimited' },
    { feature: 'Custom domains', free: false, plus: true, pro: true },
    { feature: 'Role-based access & approvals', free: false, plus: true, pro: true },
    { feature: 'Version history', free: false, plus: true, pro: true },
]

const supportRows = [
    { feature: 'Workspace seats', free: 'Up to 3 users', plus: 'Unlimited', pro: 'Unlimited' },
    { feature: 'Publishing environments', free: 'Single', plus: 'Two', pro: 'Multiple' },
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
                                            variant={tier.name === 'Plus' ? 'default' : 'outline'}>
                                            <Link href="#pricing">Choose {tier.name}</Link>
                                        </Button>
                                        {index === 1 ? (
                                            <div className="text-primary text-xs font-medium">Popular</div>
                                        ) : null}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
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
