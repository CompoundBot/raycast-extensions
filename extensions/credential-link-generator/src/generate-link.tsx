import { Form, ActionPanel, Action, showToast, Toast, Clipboard, showHUD } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";

interface AppItem {
  id: string;
  name: string;
}

interface RequestItem {
  id: string;
  enquiryNumber: string;
}

interface ContactItem {
  id: string;
  name: string;
  email: string;
  phone: string;
}

type Values = {
  apps: string[];
  enquiryId: string;
  email: string;
  phone: string;
  whiteLabel: boolean;
};

const WORKER_URL = "https://credential-link-proxy.cdt-fa1.workers.dev";

const BASE_URLS = {
  whiteLabel: "https://credential-onboarding.tech-solutions.io",
  branded: "https://credential-onboarding.flowmondo.com",
};

function buildUrl(apps: string[], enquiryId: string, email: string, phone: string, whiteLabel: boolean): string {
  const base = whiteLabel ? BASE_URLS.whiteLabel : BASE_URLS.branded;
  const parts: string[] = [];

  apps.forEach((app, index) => {
    parts.push(`app${index + 1}=${encodeURIComponent(app)}`);
  });

  parts.push(`ID=${encodeURIComponent(enquiryId)}`);
  parts.push(`required=${encodeURIComponent(apps.join(","))}`);
  parts.push(`email=${encodeURIComponent(email)}`);
  if (phone.trim()) parts.push(`phone=${encodeURIComponent(phone.trim())}`);

  return `${base}?${parts.join("&")}`;
}

function validate(apps: string[], enquiryId: string, email: string): string | null {
  if (apps.length === 0) return "At least one app is required.";
  if (apps.length > 5) return `Max 5 apps — you selected ${apps.length}.`;
  if (!enquiryId) return "Please select an enquiry.";
  if (!email) return "Please select a contact.";
  return null;
}

export default function Command() {
  const [appSearch, setAppSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [phone, setPhone] = useState("");

  const { data: appsData, isLoading: appsLoading } = useFetch<{ items: AppItem[] }>(
    `${WORKER_URL}/apps?search=${encodeURIComponent(appSearch)}`,
  );

  const { data: requestsData, isLoading: requestsLoading } = useFetch<{ items: RequestItem[] }>(
    `${WORKER_URL}/requests?search=${encodeURIComponent(requestSearch)}`,
  );

  const { data: contactsData, isLoading: contactsLoading } = useFetch<{ items: ContactItem[] }>(
    `${WORKER_URL}/contacts?search=${encodeURIComponent(contactSearch)}`,
  );

  useEffect(() => {
    if (!selectedEmail || !contactsData?.items) return;
    const contact = contactsData.items.find((c) => c.email === selectedEmail);
    if (contact) setPhone(contact.phone ?? "");
  }, [selectedEmail, contactsData]);

  const isLoading = appsLoading || requestsLoading || contactsLoading;

  async function handleSubmit(values: Values) {
    const error = validate(values.apps, values.enquiryId, values.email);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: error });
      return;
    }
    const url = buildUrl(values.apps, values.enquiryId, values.email, values.phone, values.whiteLabel);
    await Clipboard.copy(url);
    await showHUD("✅ Link copied to clipboard!");
  }

  async function handlePreview(values: Values) {
    const error = validate(values.apps, values.enquiryId, values.email);
    if (error) {
      await showToast({ style: Toast.Style.Failure, title: "Validation Error", message: error });
      return;
    }
    const url = buildUrl(values.apps, values.enquiryId, values.email, values.phone, values.whiteLabel);
    await showToast({ style: Toast.Style.Success, title: "Generated Link", message: url });
  }

  return (
    <Form
      isLoading={isLoading}
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
      <Form.TagPicker id="apps" title="Apps" info="Select 1–5 apps" onSearchTextChange={setAppSearch}>
        {(appsData?.items ?? []).map((app) => (
          <Form.TagPicker.Item key={app.id} value={app.name} title={app.name} />
        ))}
      </Form.TagPicker>

      <Form.Dropdown id="enquiryId" title="Enquiry" onSearchTextChange={setRequestSearch} throttle>
        <Form.Dropdown.Item value="" title="Select an enquiry…" />
        {(requestsData?.items ?? []).map((r) => (
          <Form.Dropdown.Item key={r.id} value={r.enquiryNumber} title={r.enquiryNumber} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="email"
        title="Contact"
        value={selectedEmail}
        onChange={setSelectedEmail}
        onSearchTextChange={setContactSearch}
        throttle
      >
        <Form.Dropdown.Item value="" title="Select a contact…" />
        {(contactsData?.items ?? []).map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.email} title={`${c.name}  —  ${c.email}`} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="phone"
        title="Phone"
        placeholder="Auto-filled from contact, or enter manually"
        value={phone}
        onChange={setPhone}
      />

      <Form.Checkbox id="whiteLabel" label="Use White Label URL" title="Branding" />
    </Form>
  );
}
