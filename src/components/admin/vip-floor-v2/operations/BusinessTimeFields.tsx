"use client";

import { useMemo, useState } from "react";

import {
  formatGhostTimeRange,
  getGhostTimeOptions,
  isGhostOperatingInterval,
  resolveGhostEndTime,
} from "@/lib/ghostOperatingHours";

import styles from "../VipFloorWorkspace.module.css";
import { formatBusinessDateWithWeekday } from "../shell/BusinessDateField";

type TimeValue = {
  startAt: string;
  endAt: string;
};

type BusinessTimeFieldsProps = {
  businessDate: string;
  value: TimeValue;
  disabled?: boolean;
  startName?: string;
  endName?: string;
  onChange: (value: TimeValue) => void;
};

type BusinessTimeFormFieldsProps = {
  businessDate: string;
  initialValue: TimeValue;
  disabled?: boolean;
};

export function BusinessTimeFields({
  businessDate,
  value,
  disabled = false,
  startName,
  endName,
  onChange,
}: BusinessTimeFieldsProps) {
  const options = useMemo(() => getGhostTimeOptions(businessDate), [businessDate]);
  const validStartValues = new Set(options.slice(0, -1).map((option) => option.value));
  const validEndValues = new Set(options.slice(1).map((option) => option.value));
  const startInvalid = Boolean(value.startAt) && !validStartValues.has(value.startAt);
  const endInvalid = Boolean(value.endAt) && !validEndValues.has(value.endAt);
  const intervalValid = isGhostOperatingInterval(value.startAt, value.endAt, businessDate);
  const endOptions = options.slice(1).filter((option) => option.value > value.startAt);

  return (
    <>
      <div className={styles.formColumns}>
        <label>
          開始
          <select
            name={startName}
            value={value.startAt}
            disabled={disabled}
            required
            aria-invalid={startInvalid || !intervalValid}
            aria-describedby="ghost-business-time-hint"
            onChange={(event) => {
              const startAt = event.target.value;
              onChange({
                startAt,
                endAt: resolveGhostEndTime(businessDate, startAt, value.endAt),
              });
            }}
          >
            {startInvalid ? (
              <option value={value.startAt} disabled>営業時間外（要修正）</option>
            ) : null}
            {options.slice(0, -1).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          終了
          <select
            name={endName}
            value={value.endAt}
            disabled={disabled}
            required
            aria-invalid={endInvalid || !intervalValid}
            aria-describedby="ghost-business-time-hint"
            onChange={(event) => onChange({ ...value, endAt: event.target.value })}
          >
            {endInvalid || value.endAt <= value.startAt ? (
              <option value={value.endAt} disabled>営業時間外（要修正）</option>
            ) : null}
            {endOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>
      <p id="ghost-business-time-hint" className={styles.businessTimeHint}>
        営業日 <span className="tabular-nums">{formatBusinessDateWithWeekday(businessDate)}</span> の
        <strong className="tabular-nums"> 22:00〜翌05:00</strong>だけを15分単位で表示
      </p>
      {intervalValid ? null : (
        <p className={styles.wizardFieldError} role="alert">
          営業時間内で、終了が開始より後になるよう選び直してください。
        </p>
      )}
      <p className={styles.businessTimeReadout}>
        選択中 <strong className="tabular-nums">{formatGhostTimeRange(value.startAt, value.endAt, businessDate)}</strong>
      </p>
    </>
  );
}

export function BusinessTimeFormFields({
  businessDate,
  initialValue,
  disabled = false,
}: BusinessTimeFormFieldsProps) {
  const [value, setValue] = useState(initialValue);
  return (
    <BusinessTimeFields
      businessDate={businessDate}
      value={value}
      disabled={disabled}
      startName="startAt"
      endName="endAt"
      onChange={setValue}
    />
  );
}
