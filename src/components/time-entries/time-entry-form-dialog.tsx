"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { AuthNotice } from "@/components/auth/auth-notice";
import { LoadError } from "@/components/customers/load-states";
import { ResponsiveDialog } from "@/components/customers/responsive-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRepositoryData } from "@/hooks/use-repository-data";
import {
  describeTimeEntryError,
  getTimeEntriesRepository,
  TimeEntryError,
  type BookableCustomer,
  type LastTarget,
  type TimeEntry,
} from "@/lib/time-entries";
import {
  formatDuration,
  formatTime,
  parseTime,
} from "@/lib/time-entries/duration";
import {
  findOverlaps,
  validateTimeEntry,
  workedMinutes,
  type TimeEntryFormValues,
  type TimeEntryMode,
} from "@/lib/time-entries/validation";
import {
  formatDate,
  isValidDate,
  todayInZurich,
} from "@/lib/time-entries/zurich";

interface TimeEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (entry: TimeEntry) => void;
}

export function TimeEntryFormDialog({
  open,
  onOpenChange,
  onSaved,
}: TimeEntryFormDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Zeit erfassen"
      description="Erfasse Arbeitszeit für heute oder trage sie nachträglich ein."
    >
      <FormLoader
        onCancel={() => onOpenChange(false)}
        onSaved={(entry) => {
          onOpenChange(false);
          onSaved(entry);
        }}
      />
    </ResponsiveDialog>
  );
}

interface FormData {
  targets: BookableCustomer[];
  last: LastTarget | null;
}

// Lädt Kunden, Projekte und den zuletzt benutzten Eintrag, bevor das Formular erscheint.
function FormLoader({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (entry: TimeEntry) => void;
}) {
  const { state, retry } = useRepositoryData<FormData>(async () => {
    const repository = getTimeEntriesRepository();
    const [targets, last] = await Promise.all([
      repository.listTargets(),
      repository.getLastTarget(),
    ]);
    return { targets, last };
  }, "form");

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Wird geladen" className="space-y-3">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }
  if (state.status === "error") return <LoadError onRetry={retry} />;

  if (state.data.targets.length === 0) {
    return (
      <div className="space-y-4">
        <Alert role="note">
          <AlertDescription>
            Lege zuerst einen Kunden an, um Zeiten zu erfassen.{" "}
            <Link
              href="/kunden"
              className="font-medium underline underline-offset-4"
            >
              Zu den Kunden
            </Link>
          </AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Schliessen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TimeEntryForm
      targets={state.data.targets}
      last={state.data.last}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  );
}

// Fehler aus der eigenen Prüfung in das Format von react-hook-form übersetzen.
const resolver: Resolver<TimeEntryFormValues> = async (values) => {
  const result = validateTimeEntry(values);
  if (result.ok) return { values, errors: {} };
  const errors: Record<string, { type: string; message: string }> = {};
  for (const [field, message] of Object.entries(result.errors)) {
    errors[field] = { type: "validation", message };
  }
  return { values: {}, errors: errors as FieldErrors<TimeEntryFormValues> };
};

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

function TimeEntryForm({
  targets,
  last,
  onCancel,
  onSaved,
}: {
  targets: BookableCustomer[];
  last: LastTarget | null;
  onCancel: () => void;
  onSaved: (entry: TimeEntry) => void;
}) {
  const today = todayInZurich();
  const [failure, setFailure] = useState<string | null>(null);
  // Solange die verrechenbare Dauer nicht von Hand geändert wurde, folgt sie der gearbeiteten.
  const [billableTouched, setBillableTouched] = useState(false);

  const initial = useMemo(() => {
    const customer =
      last && targets.find((candidate) => candidate.id === last.customerId);
    const project = customer?.projects.find(
      (candidate) => candidate.id === last?.projectId,
    );
    return customer && project
      ? { customerId: customer.id, projectId: project.id }
      : null;
  }, [last, targets]);

  const form = useForm<TimeEntryFormValues>({
    resolver,
    defaultValues: {
      customerId: initial?.customerId ?? "",
      projectId: initial?.projectId ?? "",
      date: today,
      mode: "duration",
      duration: "",
      start: "",
      end: "",
      billable: "",
      description: "",
    },
  });
  const { control, register, setValue, formState } = form;
  const busy = formState.isSubmitting;
  const errors = formState.errors;

  const values = useWatch({ control }) as TimeEntryFormValues;
  const worked = workedMinutes(values);

  useEffect(() => {
    if (!billableTouched && worked !== null) {
      setValue("billable", formatDuration(worked), {
        shouldValidate: formState.isSubmitted,
      });
    }
  }, [worked, billableTouched, setValue, formState.isSubmitted]);

  const customer = targets.find(
    (candidate) => candidate.id === values.customerId,
  );

  function changeCustomer(customerId: string) {
    setValue("customerId", customerId, {
      shouldValidate: formState.isSubmitted,
    });
    const next = targets.find((candidate) => candidate.id === customerId);
    const keep = next?.projects.some(
      (project) => project.id === values.projectId,
    );
    if (!keep) {
      const general = next?.projects.find(
        (project) => project.name === "Allgemein",
      );
      setValue("projectId", general?.id ?? "", {
        shouldValidate: formState.isSubmitted,
      });
    }
  }

  function changeMode(mode: TimeEntryMode) {
    if (mode === "duration" && worked !== null)
      setValue("duration", formatDuration(worked));
    setValue("mode", mode);
  }

  // Einträge desselben Tages für den Hinweis auf Überschneidungen.
  const dateKey = isValidDate(values.date) ? values.date : "";
  const { state: dayState } = useRepositoryData<TimeEntry[]>(
    async () =>
      dateKey ? getTimeEntriesRepository().listEntries(dateKey) : [],
    `day-${dateKey}`,
  );
  const overlaps = useMemo(() => {
    if (values.mode !== "range" || dayState.status !== "ready") return [];
    const start = parseTime(values.start);
    const end = parseTime(values.end);
    if (start === null || end === null || end <= start) return [];
    return findOverlaps(dayState.data, start, end);
  }, [values.mode, values.start, values.end, dayState]);

  async function onSubmit(raw: TimeEntryFormValues) {
    if (busy) return;
    setFailure(null);
    const result = validateTimeEntry(raw);
    if (!result.ok) return;
    try {
      const saved = await getTimeEntriesRepository().createEntry(result.input);
      onSaved(saved);
    } catch (error) {
      const message = describeTimeEntryError(error);
      if (error instanceof TimeEntryError && error.kind === "target-archived") {
        form.setError("projectId", { message });
      } else {
        setFailure(message);
      }
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="space-y-4"
    >
      {failure && <AuthNotice tone="error">{failure}</AuthNotice>}

      <div className="space-y-2">
        <Label htmlFor="te-date">Datum</Label>
        <Input
          id="te-date"
          type="date"
          max={today}
          className="h-11"
          aria-invalid={Boolean(errors.date)}
          aria-describedby={errors.date ? "te-date-error" : undefined}
          {...register("date")}
        />
        <ErrorText id="te-date-error" message={errors.date?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="te-customer">Kunde</Label>
        <Controller
          control={control}
          name="customerId"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => value && changeCustomer(value)}
            >
              <SelectTrigger
                id="te-customer"
                className="h-11"
                autoFocus={!initial}
                aria-invalid={Boolean(errors.customerId)}
                aria-describedby={
                  errors.customerId ? "te-customer-error" : undefined
                }
              >
                <SelectValue placeholder="Kunde wählen" />
              </SelectTrigger>
              <SelectContent>
                {targets.map((target) => (
                  <SelectItem key={target.id} value={target.id}>
                    <span className="font-mono">{target.code}</span> ·{" "}
                    {target.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <ErrorText
          id="te-customer-error"
          message={errors.customerId?.message}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="te-project">Projekt</Label>
        <Controller
          control={control}
          name="projectId"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                // Radix meldet beim Wechsel der Auswahl kurz einen leeren Wert; den ignorieren wir.
                if (value)
                  setValue("projectId", value, {
                    shouldValidate: formState.isSubmitted,
                  });
              }}
              disabled={!customer}
            >
              <SelectTrigger
                id="te-project"
                className="h-11"
                aria-invalid={Boolean(errors.projectId)}
                aria-describedby={
                  errors.projectId ? "te-project-error" : undefined
                }
              >
                <SelectValue
                  placeholder={
                    customer ? "Projekt wählen" : "Zuerst Kunde wählen"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {customer?.projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <ErrorText id="te-project-error" message={errors.projectId?.message} />
      </div>

      <Tabs
        value={values.mode}
        onValueChange={(value) => changeMode(value as TimeEntryMode)}
      >
        <TabsList className="h-14 w-full" aria-label="Eingabeart">
          <TabsTrigger value="duration" className="h-11 flex-1">
            Nur Dauer
          </TabsTrigger>
          <TabsTrigger value="range" className="h-11 flex-1">
            Von–bis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duration" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="te-duration">Dauer</Label>
            <Input
              id="te-duration"
              autoComplete="off"
              inputMode="text"
              placeholder="1:30"
              className="h-11"
              autoFocus={Boolean(initial)}
              aria-invalid={Boolean(errors.duration)}
              aria-describedby={
                errors.duration ? "te-duration-error" : "te-duration-hint"
              }
              {...register("duration")}
            />
            <p id="te-duration-hint" className="text-sm text-muted-foreground">
              Std:Min oder Dezimal, z. B. 1:30 oder 1,5
            </p>
            <ErrorText
              id="te-duration-error"
              message={errors.duration?.message}
            />
          </div>
        </TabsContent>

        <TabsContent value="range" className="mt-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="te-start">Von</Label>
                <Input
                  id="te-start"
                  type="time"
                  className="h-11"
                  aria-invalid={Boolean(errors.start)}
                  aria-describedby={errors.start ? "te-start-error" : undefined}
                  {...register("start")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="te-end">Bis</Label>
                <Input
                  id="te-end"
                  type="time"
                  className="h-11"
                  aria-invalid={Boolean(errors.end)}
                  aria-describedby={errors.end ? "te-end-error" : undefined}
                  {...register("end")}
                />
              </div>
            </div>
            <ErrorText id="te-start-error" message={errors.start?.message} />
            <ErrorText id="te-end-error" message={errors.end?.message} />
            {worked !== null && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Dauer: {formatDuration(worked)}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {overlaps.length > 0 && (
        <Alert role="status">
          <AlertDescription>
            Überschneidung mit{" "}
            {overlaps
              .map(
                (entry) =>
                  `${entry.customerCode} · ${entry.projectName} (${formatTime(parseTime(entry.startTime ?? "") ?? 0)}–${formatTime(parseTime(entry.endTime ?? "") ?? 0)})`,
              )
              .join(", ")}
            . Du kannst trotzdem speichern.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="te-billable">Verrechenbar</Label>
        <Input
          id="te-billable"
          autoComplete="off"
          inputMode="text"
          placeholder="1:30"
          className="h-11"
          aria-invalid={Boolean(errors.billable)}
          aria-describedby={
            errors.billable ? "te-billable-error" : "te-billable-hint"
          }
          {...register("billable", {
            onChange: () => setBillableTouched(true),
          })}
        />
        <p id="te-billable-hint" className="text-sm text-muted-foreground">
          Vorbelegt mit der gearbeiteten Dauer, 0 für nicht verrechenbar
        </p>
        <ErrorText id="te-billable-error" message={errors.billable?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="te-description">Beschreibung (optional)</Label>
        <Textarea
          id="te-description"
          rows={3}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "te-description-error" : undefined
          }
          {...register("description")}
        />
        <ErrorText
          id="te-description-error"
          message={errors.description?.message}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" aria-hidden="true" />
              Wird gespeichert …
            </>
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
      {values.date !== today &&
        isValidDate(values.date) &&
        values.date < today && (
          <p className="text-sm text-muted-foreground">
            Der Eintrag wird für den {formatDate(values.date)} gespeichert.
          </p>
        )}
    </form>
  );
}
