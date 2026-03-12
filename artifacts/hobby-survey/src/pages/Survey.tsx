import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

const HOBBY_OPTIONS = [
  { id: "read", label: "Read" },
  { id: "run", label: "Run" },
  { id: "hike", label: "Hike" },
  { id: "bike", label: "Bike" },
  { id: "swim", label: "Swim" },
  { id: "other", label: "Other" },
];

const YEAR_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
  { value: "5+", label: "5th Year or More" },
];

interface FormData {
  hometown: string;
  state: string;
  collegeYear: string;
  hobbies: string[];
  otherHobby: string;
}

interface FormErrors {
  hometown?: string;
  state?: string;
  collegeYear?: string;
  hobbies?: string;
  otherHobby?: string;
}

export default function Survey() {
  const [form, setForm] = useState<FormData>({
    hometown: "",
    state: "",
    collegeYear: "",
    hobbies: [],
    otherHobby: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.hometown.trim()) newErrors.hometown = "Please enter your hometown.";
    if (!form.state) newErrors.state = "Please select your state.";
    if (!form.collegeYear) newErrors.collegeYear = "Please select your year in college.";
    if (form.hobbies.length === 0) newErrors.hobbies = "Please select at least one hobby.";
    if (form.hobbies.includes("other") && !form.otherHobby.trim()) {
      newErrors.otherHobby = "Please describe your other hobby.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleHobbyChange(id: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      hobbies: checked
        ? [...prev.hobbies, id]
        : prev.hobbies.filter((h) => h !== id),
      otherHobby: id === "other" && !checked ? "" : prev.otherHobby,
    }));
    if (errors.hobbies) setErrors((e) => ({ ...e, hobbies: undefined }));
    if (id === "other" && !checked) setErrors((e) => ({ ...e, otherHobby: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const hobbyList = form.hobbies.map((h) =>
      h === "other" ? form.otherHobby.trim() : h
    );

    const { error } = await supabase.from("survey_responses").insert({
      hometown: form.hometown.trim(),
      state: form.state,
      college_year: form.collegeYear,
      hobbies: hobbyList,
      other_hobby: form.hobbies.includes("other") ? form.otherHobby.trim() : null,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError("There was a problem saving your response. Please try again.");
      console.error("Supabase insert error:", error);
      return;
    }

    setSubmitted(true);
  }

  function handleReset() {
    setForm({ hometown: "", state: "", collegeYear: "", hobbies: [], otherHobby: "" });
    setErrors({});
    setSubmitted(false);
    setSubmitError(null);
  }

  if (submitted) {
    const hobbyLabels = form.hobbies.map((h) => {
      if (h === "other") return form.otherHobby;
      return HOBBY_OPTIONS.find((o) => o.id === h)?.label ?? h;
    });
    const yearLabel = YEAR_OPTIONS.find((y) => y.value === form.collegeYear)?.label ?? form.collegeYear;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-primary">Thank you!</CardTitle>
            <CardDescription>Your response has been saved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-foreground w-36 shrink-0">Hometown:</span>
                <span className="text-muted-foreground">{form.hometown}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground w-36 shrink-0">State:</span>
                <span className="text-muted-foreground">{form.state}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground w-36 shrink-0">Year in College:</span>
                <span className="text-muted-foreground">{yearLabel}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-foreground w-36 shrink-0">Hobbies:</span>
                <span className="text-muted-foreground">{hobbyLabels.join(", ")}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleReset}>
                Submit Another Response
              </Button>
              <Link href="/results">
                <Button>View Results</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-2xl text-primary">Hobbies Survey</CardTitle>
              <CardDescription className="mt-1">
                A short survey for undergraduate business students about hobbies and relaxation.
              </CardDescription>
            </div>
            <Link href="/results">
              <Button variant="outline" size="sm" className="shrink-0 mt-1">
                View Results
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-6">

            {/* Q1: Hometown */}
            <div className="space-y-1.5">
              <Label htmlFor="hometown" className="text-base font-medium">
                1. What is your hometown?
              </Label>
              <Input
                id="hometown"
                placeholder="e.g. Springfield"
                value={form.hometown}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, hometown: e.target.value }));
                  if (errors.hometown) setErrors((er) => ({ ...er, hometown: undefined }));
                }}
                aria-invalid={!!errors.hometown}
              />
              {errors.hometown && (
                <p className="text-sm text-destructive">{errors.hometown}</p>
              )}
            </div>

            {/* Q2: State */}
            <div className="space-y-1.5">
              <Label htmlFor="state-select" className="text-base font-medium">
                2. What state are you from?
              </Label>
              <Select
                value={form.state}
                onValueChange={(val) => {
                  setForm((prev) => ({ ...prev, state: val }));
                  if (errors.state) setErrors((er) => ({ ...er, state: undefined }));
                }}
              >
                <SelectTrigger id="state-select" aria-invalid={!!errors.state}>
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state}</p>
              )}
            </div>

            {/* Q3: Year in College */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                3. What year are you in college?
              </Label>
              <RadioGroup
                value={form.collegeYear}
                onValueChange={(val) => {
                  setForm((prev) => ({ ...prev, collegeYear: val }));
                  if (errors.collegeYear) setErrors((er) => ({ ...er, collegeYear: undefined }));
                }}
                className="space-y-1"
              >
                {YEAR_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`year-${opt.value}`} />
                    <Label htmlFor={`year-${opt.value}`} className="font-normal cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.collegeYear && (
                <p className="text-sm text-destructive">{errors.collegeYear}</p>
              )}
            </div>

            {/* Q4: Hobbies */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                4. What hobbies do you do to relax? (Select all that apply)
              </Label>
              <div className="space-y-1.5">
                {HOBBY_OPTIONS.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`hobby-${opt.id}`}
                      checked={form.hobbies.includes(opt.id)}
                      onCheckedChange={(checked) =>
                        handleHobbyChange(opt.id, checked === true)
                      }
                    />
                    <Label htmlFor={`hobby-${opt.id}`} className="font-normal cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.hobbies && (
                <p className="text-sm text-destructive">{errors.hobbies}</p>
              )}

              {form.hobbies.includes("other") && (
                <div className="mt-2 space-y-1">
                  <Label htmlFor="other-hobby" className="text-sm font-medium">
                    Please describe your other hobby:
                  </Label>
                  <Input
                    id="other-hobby"
                    placeholder="e.g. Painting, Cooking..."
                    value={form.otherHobby}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, otherHobby: e.target.value }));
                      if (errors.otherHobby) setErrors((er) => ({ ...er, otherHobby: undefined }));
                    }}
                    aria-invalid={!!errors.otherHobby}
                  />
                  {errors.otherHobby && (
                    <p className="text-sm text-destructive">{errors.otherHobby}</p>
                  )}
                </div>
              )}
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Survey"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
