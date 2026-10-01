"use client";

import { useActionState, useState } from "react";

import { FormError, SubmitButton, TextAreaField, valueOf } from "@/components/form/fields";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Stage } from "@/lib/deals";
import { initialFormState, type FormState } from "@/lib/form-state";

// Changes the pipeline stage on the deal page; asks for the loss reason when needed.
export function StageForm({
  action,
  stages,
  currentStageId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  stages: Stage[];
  currentStageId: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [stageId, setStageId] = useState(currentStageId);
  const isLost = stages.find((s) => s.id === stageId)?.art === "verloren";

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="stage-select">Phase</Label>
        <NativeSelect
          id="stage-select"
          name="stage_id"
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      {isLost && (
        <TextAreaField
          label="Verlustgrund *"
          name="verlustgrund"
          id="stage-verlustgrund"
          defaultValue={valueOf(state, "verlustgrund", "")}
          required
          rows={2}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" disabled={stageId === currentStageId}>
          Phase ändern
        </SubmitButton>
        <FormError state={state} />
      </div>
    </form>
  );
}
