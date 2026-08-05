import { redirect } from "next/navigation";
import {
  SettingsLayout,
  type SettingsSection,
} from "@/components/settings/settings-layout";
import { ThemeSelector } from "@/components/settings/theme-selector";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getUserProfile } from "../profile/actions";
import { ProfileForm } from "../profile/profile-form";

export default async function PreferencesPage() {
  const user = await getUserProfile();

  if (!user) {
    redirect("/signin");
  }

  const sections: SettingsSection[] = [
    {
      content: <ProfileForm user={user} />,
      description:
        "Update your name, contact information, and avatar. These details are visible to your teammates across Splx.",
      id: "profile",
      title: "Profile",
    },
    {
      content: (
        <form action="#" className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="language">Language</FieldLabel>
              <Input
                aria-describedby="language-description"
                defaultValue="English (US)"
                id="language"
                name="language"
                type="text"
              />
              <FieldDescription id="language-description">
                Used for menus, notifications, and generated content.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="timezone">Time zone</FieldLabel>
              <Input
                aria-describedby="timezone-description"
                defaultValue="UTC"
                id="timezone"
                name="timezone"
                type="text"
              />
              <FieldDescription id="timezone-description">
                Determines when scheduled automations and reminders run.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <div className="flex justify-end">
            <Button type="submit" variant="primary">
              Save general preferences
            </Button>
          </div>
        </form>
      ),
      description:
        "Configure how the product behaves for you across all experiences.",
      id: "general",
      title: "General",
    },
    {
      content: (
        <form action="#" className="space-y-6">
          <div
            aria-labelledby="notification-preferences"
            className="space-y-4"
            role="group"
          >
            <div className="space-y-3">
              <h3 className="font-medium text-sm" id="notification-preferences">
                Delivery channels
              </h3>
              <label className="flex items-start gap-3 rounded-lg border p-4">
                <input
                  className="mt-1 h-4 w-4 rounded border-muted-foreground/40"
                  defaultChecked
                  name="notifications_email"
                  type="checkbox"
                />
                <span className="text-sm leading-relaxed">
                  <span className="font-medium">Email</span>
                  <br />
                  Receive summaries and alerts in your inbox.
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-4">
                <input
                  className="mt-1 h-4 w-4 rounded border-muted-foreground/40"
                  defaultChecked
                  name="notifications_push"
                  type="checkbox"
                />
                <span className="text-sm leading-relaxed">
                  <span className="font-medium">In-app</span>
                  <br />
                  Show alerts while you are working in the product.
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-4">
                <input
                  className="mt-1 h-4 w-4 rounded border-muted-foreground/40"
                  name="notifications_sms"
                  type="checkbox"
                />
                <span className="text-sm leading-relaxed">
                  <span className="font-medium">SMS</span>
                  <br />
                  Send high-priority alerts to your phone.
                </span>
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Save notification settings</Button>
          </div>
        </form>
      ),
      description:
        "Fine tune when and where you are notified about important updates.",
      id: "notifications",
      title: "Notifications",
    },
    {
      content: (
        <div className="space-y-6">
          <ThemeSelector />
          <form action="#" className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="content-density">
                  Content density
                </FieldLabel>
                <Input
                  defaultValue="Comfortable"
                  id="content-density"
                  name="content-density"
                  type="text"
                />
                <FieldDescription>
                  Controls spacing for tables, lists, and other data-heavy
                  views.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="accessibility-notes">
                  Accessibility notes
                </FieldLabel>
                <Textarea
                  id="accessibility-notes"
                  name="accessibility-notes"
                  placeholder="Describe any assistive technologies or preferences we should consider."
                  rows={4}
                />
              </Field>
            </FieldGroup>
            <div className="flex justify-end">
              <Button type="submit">Save appearance settings</Button>
            </div>
          </form>
        </div>
      ),
      description:
        "Personalise the interface to make working more comfortable.",
      id: "appearance",
      title: "Appearance & accessibility",
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SettingsLayout
        description="Update how Splx behaves just for you. Changes here only affect your personal experience."
        sections={sections}
        title="Preferences"
      />
    </div>
  );
}
