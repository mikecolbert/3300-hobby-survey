import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface SurveyRow {
  college_year: string;
  state: string;
  hobbies: string[];
}

const YEAR_LABELS: Record<string, string> = {
  "1": "1st Year",
  "2": "2nd Year",
  "3": "3rd Year",
  "4": "4th Year",
  "5+": "5th Year+",
};

const HOBBY_LABELS: Record<string, string> = {
  read: "Read",
  run: "Run",
  hike: "Hike",
  bike: "Bike",
  swim: "Swim",
};

const CHART_COLORS = [
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#14b8a6",
];

function aggregateYears(rows: SurveyRow[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const label = YEAR_LABELS[row.college_year] ?? row.college_year;
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const order = Object.values(YEAR_LABELS);
      return order.indexOf(a.name) - order.indexOf(b.name);
    });
}

function aggregateHobbies(rows: SurveyRow[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const h of row.hobbies ?? []) {
      const label = HOBBY_LABELS[h] ?? h;
      counts[label] = (counts[label] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function aggregateStates(rows: SurveyRow[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.state) counts[row.state] = (counts[row.state] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export default function Results() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("college_year, state, hobbies");

      if (error) {
        setError("Could not load results. The read policy may not be set up yet.");
        setLoading(false);
        return;
      }
      setRows((data as SurveyRow[]) ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const yearData = aggregateYears(rows);
  const hobbyData = aggregateHobbies(rows);
  const stateData = aggregateStates(rows);
  const total = rows.length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Survey Results</h1>
            <p className="text-muted-foreground mt-1">
              Aggregated responses from undergraduate business students
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Take the Survey</Button>
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Make sure you have run the SELECT policy SQL in your Supabase dashboard.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* Total count */}
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="text-5xl font-bold text-primary">{total}</div>
                <div>
                  <p className="text-lg font-medium">Total Responses</p>
                  <p className="text-sm text-muted-foreground">
                    {total === 1 ? "1 student has responded" : `${total} students have responded`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {total === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-16">
                  <p className="text-muted-foreground text-lg">No responses yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to{" "}
                    <Link href="/" className="text-primary underline underline-offset-4">
                      take the survey
                    </Link>
                    !
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Year in College */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Year in College</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={yearData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(val: number) => [`${val} response${val !== 1 ? "s" : ""}`, "Count"]}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {yearData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Hobbies */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Most Popular Hobbies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={hobbyData}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                      >
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
                        <Tooltip
                          formatter={(val: number) => [`${val} student${val !== 1 ? "s" : ""}`, "Count"]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {hobbyData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top States */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      Top States Represented {stateData.length < aggregateStates(rows).length + stateData.length ? "" : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stateData.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No state data available.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={stateData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            labelLine={false}
                          >
                            {stateData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: number) => [`${val} response${val !== 1 ? "s" : ""}`, "Count"]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
