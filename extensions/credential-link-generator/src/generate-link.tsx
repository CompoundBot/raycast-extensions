import { Form, ActionPanel, Action, showToast, Toast, Clipboard, showHUD } from "@raycast/api";

type Values = {
  apps: string;
  enquiryId: string;
  email: string;
};

function parseApps(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function buildUrl(apps: string[], enquiryId: string, email: string): string {
  const base = "https://secure-onboarding.tech-solution.io";
  const parts: string[] = [];

  apps.forEach((app, index) => {
    parts.push(`app${index + 1}=${encodeURIComponent(app)}`);
  });

  parts.push(`ID=${encodeURIComponent(enquiryId.trim())}`);
  parts.push(`email=${encodeURIComponent(email.trim())}`);

  return `${base}?${parts.join("&")}`;
}

function validate(apps: string[], enquiryId: string, email: string): string | null {
  if (apps.length === 0) {
    return "At least one app name is required.";
  }
  if (apps.length > 5) {
    return `Too many apps — max 5, you entered ${apps.length}.`;
  }
  if (!enquiryId.trim()) {
    return "Enquiry ID is required.";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

export default function Command() {
  async function handleSubmit(values: Values) {
    const apps = parseApps(values.apps);
    const error = validate(apps, values.enquiryId, values.email);

    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: error });
      return;
    }

    const url = buildUrl(apps, values.enquiryId, values.email);
    await Clipboard.copy(url);
    await showHUD("✅ Link copied to clipboard!");
  }

  async function handlePreview(values: Values) {
    const apps = parseApps(values.apps);
    const error = validate(apps, values.enquiryId, values.email);

    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: error });
      return;
    }

    const url = buildUrl(apps, values.enquiryId, values.email);
    await showToast({ style: Toast.Style.Success, title: "Generated Link", message: url });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Link to Clipboard" onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Preview Link"
            onSubmit={handlePreview}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="apps"
        title="Apps"
        placeholder="Salesforce, HubSpot, Slack"
        info="Comma-separated, 1–5 apps"
      />
      <Form.TextField id="enquiryId" title="Enquiry ID" placeholder="e.g. ENQ-20481" />
      <Form.TextField id="email" title="Contact Email" placeholder="e.g. john@example.com" />
    </Form>
  );
}
