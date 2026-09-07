"use client";

import { FormEvent, useState } from "react";
import {
  DonationStatus,
  LOAD_SIZE_LABELS,
  LoadValueSetting,
  STATUS_LABELS,
  Trailer,
  calcLoadEstimate,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

type TrailerAssignment = {
  trailerId: string;
  assignment: {
    reference_code: string;
    status: DonationStatus;
    name: string;
  } | null;
};

type Props = {
  initialTrailers: Trailer[];
  initialLoadSettings: LoadValueSetting[];
  trailerStatus: TrailerAssignment[];
};

export function SettingsClient({
  initialTrailers,
  initialLoadSettings,
  trailerStatus,
}: Props) {
  const [trailers, setTrailers] = useState(initialTrailers);
  const [loadSettings, setLoadSettings] = useState(initialLoadSettings);
  const [assignments, setAssignments] = useState(trailerStatus);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function addTrailer(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const res = await fetch("/api/trailers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, notes: notes || null }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Failed to add trailer");
      return;
    }

    setTrailers((prev) =>
      [...prev, body as Trailer].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setAssignments((prev) => [...prev, { trailerId: body.id, assignment: null }]);
    setName("");
    setNotes("");
    setMessage("Trailer added");
  }

  async function updateTrailer(
    id: string,
    patch: Partial<Pick<Trailer, "name" | "notes" | "is_active">>,
  ) {
    setError("");
    const res = await fetch(`/api/trailers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Failed to update trailer");
      return;
    }
    setTrailers((prev) => prev.map((t) => (t.id === id ? (body as Trailer) : t)));
  }

  async function removeTrailer(id: string) {
    setError("");
    const res = await fetch(`/api/trailers/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Failed to remove trailer");
      return;
    }
    setTrailers((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => prev.filter((a) => a.trailerId !== id));
  }

  async function saveLoadSetting(setting: LoadValueSetting) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/load-settings/${setting.load_size}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estimated_pounds: Number(setting.estimated_pounds),
        value_per_pound: Number(setting.value_per_pound),
        label: setting.label,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Failed to save load setting");
      return;
    }
    setLoadSettings((prev) =>
      prev.map((s) =>
        s.load_size === setting.load_size ? (body as LoadValueSetting) : s,
      ),
    );
    setMessage("Load values saved");
  }

  return (
    <div className="space-y-6">
      {(error || message) && (
        <p className={`text-sm ${error ? "text-[var(--danger)]" : "text-success"}`}>
          {error || message}
        </p>
      )}

      <section className="panel p-5">
        <h2 className="text-2xl font-bold text-ink">Trailers</h2>
        <p className="text-sm text-muted mt-1 mb-4">
          These trailers populate Manage Donations. A trailer assigned to an
          active pickup cannot be double-scheduled.
        </p>

        <form
          onSubmit={addTrailer}
          className="grid md:grid-cols-[1fr_1fr_auto] gap-3 mb-5"
        >
          <input
            className="input"
            placeholder="Trailer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Add trailer
          </button>
        </form>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Notes</th>
                <th>Current assignment</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trailers.map((t) => {
                const assignment =
                  assignments.find((a) => a.trailerId === t.id)?.assignment ||
                  null;
                return (
                  <tr key={t.id}>
                    <td>
                      <input
                        className="input"
                        defaultValue={t.name}
                        onBlur={(e) => {
                          if (e.target.value !== t.name) {
                            updateTrailer(t.id, { name: e.target.value });
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        defaultValue={t.notes || ""}
                        onBlur={(e) => {
                          if ((t.notes || "") !== e.target.value) {
                            updateTrailer(t.id, { notes: e.target.value });
                          }
                        }}
                      />
                    </td>
                    <td>
                      {assignment ? (
                        <div className="space-y-1">
                          <div className="font-semibold text-sm">
                            {assignment.reference_code} · {assignment.name}
                          </div>
                          <StatusBadge status={assignment.status} />
                        </div>
                      ) : (
                        <span className="text-muted text-sm">Available</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={t.is_active}
                        onChange={(e) =>
                          updateTrailer(t.id, { is_active: e.target.checked })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary !py-1.5 !px-3 text-sm"
                        onClick={() => removeTrailer(t.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-2xl font-bold text-ink">
          Load value estimates
        </h2>
        <p className="text-sm text-muted mt-1 mb-4">
          Set estimated pounds and value per pound for each load size. Manage
          Donations uses these to calculate totals.
        </p>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Load size</th>
                <th>Est. pounds</th>
                <th>$ / pound</th>
                <th>Preview total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loadSettings.map((setting) => {
                const preview = calcLoadEstimate(
                  Number(setting.estimated_pounds),
                  Number(setting.value_per_pound),
                );
                return (
                  <tr key={setting.id}>
                    <td className="font-semibold">
                      {setting.label || LOAD_SIZE_LABELS[setting.load_size]}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="input max-w-32"
                        value={setting.estimated_pounds}
                        onChange={(e) =>
                          setLoadSettings((prev) =>
                            prev.map((s) =>
                              s.id === setting.id
                                ? {
                                    ...s,
                                    estimated_pounds: Number(e.target.value),
                                  }
                                : s,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="input max-w-32"
                        value={setting.value_per_pound}
                        onChange={(e) =>
                          setLoadSettings((prev) =>
                            prev.map((s) =>
                              s.id === setting.id
                                ? {
                                    ...s,
                                    value_per_pound: Number(e.target.value),
                                  }
                                : s,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(preview.estimated_value)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary !py-1.5 !px-3 text-sm"
                        onClick={() => saveLoadSetting(setting)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted mt-3">
          Example: half trailer at 500 lbs × $1.50/lb = {formatCurrency(750)}.
          Status labels for reference:{" "}
          {Object.values(STATUS_LABELS).slice(0, 3).join(", ")}…
        </p>
      </section>
    </div>
  );
}
