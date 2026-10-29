"use client";
import { Tab, TabList } from "@fluentui/react-components";
interface AdminTabsProps<T extends string> { label: string; value: T; options: readonly { value: T; label: string }[]; onChange(value: T): void }
export default function AdminTabs<T extends string>({ label, value, options, onChange }: AdminTabsProps<T>): React.ReactElement {
  return <TabList aria-label={label} selectedValue={value} onTabSelect={(_, data) => { const option = options.find((o) => o.value === data.value); if (option) onChange(option.value); }}>
    {options.map((o) => <Tab key={o.value} value={o.value}>{o.label}</Tab>)}
  </TabList>;
}
