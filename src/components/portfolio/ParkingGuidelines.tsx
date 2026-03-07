import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Guideline {
  jurisdiction: string;
  requirement: string;
  notes: string;
  states: string[]; // empty = universal
}

const GUIDELINES: Guideline[] = [
  { jurisdiction: "NYC (proposed)", requirement: "20% EV-ready", notes: "New construction", states: ["NY"] },
  { jurisdiction: "New York State", requirement: "Varies by municipality", notes: "Local Law 97 / LL-130 compliance", states: ["NY"] },
  { jurisdiction: "California", requirement: "10% EV-installed", notes: "CALGreen code", states: ["CA"] },
  { jurisdiction: "Connecticut", requirement: "10% for 30+ spaces", notes: "New commercial", states: ["CT"] },
  { jurisdiction: "New Jersey", requirement: "15% EV-ready", notes: "New commercial & multi-family", states: ["NJ"] },
  { jurisdiction: "Massachusetts", requirement: "20% EV-ready", notes: "Stretch energy code", states: ["MA"] },
  { jurisdiction: "Denver", requirement: "5% installed + 10% ready", notes: "Commercial 10+ spaces", states: ["CO"] },
  { jurisdiction: "Oregon", requirement: "20% EV-ready", notes: "Commercial new construction", states: ["OR"] },
  { jurisdiction: "Washington", requirement: "10% EV-ready", notes: "Commercial 20+ spaces", states: ["WA"] },
  { jurisdiction: "LEED Standard", requirement: "5% Level 2+", notes: "Green building certification", states: [] },
  { jurisdiction: "Industry Best Practice", requirement: "2-5% DCFC", notes: "High-traffic retail with fast charging", states: [] },
];

interface Props {
  state?: string;
}

export default function ParkingGuidelines({ state }: Props) {
  const filtered = GUIDELINES.filter(
    g => g.states.length === 0 || (state && g.states.includes(state))
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-heading">
          Parking Percentage Guidelines
          {state && <span className="text-muted-foreground font-normal ml-1.5">— {state}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No specific EV parking mandates found. Industry best practice is 2–5% DCFC for high-traffic retail.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Jurisdiction</TableHead>
                <TableHead className="text-xs">Requirement</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => (
                <TableRow key={g.jurisdiction}>
                  <TableCell className="text-xs font-medium">{g.jurisdiction}</TableCell>
                  <TableCell className="text-xs font-mono">{g.requirement}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{g.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
