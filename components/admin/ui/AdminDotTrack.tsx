interface AdminDotTrackProps { value: number; maximum: number; color: string }

export default function AdminDotTrack({ value, maximum, color }: AdminDotTrackProps): React.ReactElement {
  const percent = Math.min(100, Math.max(0, value) / Math.max(1, maximum) * 100);
  return <span aria-hidden="true" className="tw:block tw:w-full tw:px-1.5">
    <span className="tw:relative tw:block tw:h-3">
      <span className="tw:absolute tw:inset-x-0 tw:top-1/2 tw:h-px tw:-translate-y-1/2 tw:bg-(--kpc-line)" />
      <span className="tw:absolute tw:top-1/2 tw:left-0 tw:h-0.5 tw:-translate-y-1/2 tw:opacity-60" style={{ width: percent + "%", backgroundColor: color }} />
      <span className="tw:absolute tw:top-1/2 tw:size-2.5 tw:-translate-x-1/2 tw:-translate-y-1/2 tw:rounded-full tw:border-2 tw:border-solid tw:bg-(--kpc-card)" style={{ left: percent + "%", borderColor: color }} />
    </span>
  </span>;
}
