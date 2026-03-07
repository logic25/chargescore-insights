import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const GUIDELINES = [
  { jurisdiction: "NYC (proposed)", requirement: "20% EV-ready", notes: "New construction" },
  { jurisdiction: "California", requirement: "10% EV-installed", notes: "CALGreen code" },
  { jurisdiction: "Connecticut", requirement: "10% for 30+ spaces", notes: "New commercial" },
  { jurisdiction: "Denver", requirement: "5% installed + 10% ready", notes: "Commercial 10+ spaces" },
  { jurisdiction: "LEED Standard", requirement: "5% Level 2+", notes: "Green building certification" },
  { jurisdiction: "Industry Best Practice", requirement: "2-5% DCFC", notes: "High-traffic retail with fast charging" },
];

export default function ParkingGuidelines() {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-heading">Parking Percentage Guidelines</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Jurisdiction</TableHead>
              <TableHead className="text-xs">Requirement</TableHead>
              <TableHead className="text-xs">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {GUIDELINES.map(g => (
              <TableRow key={g.jurisdiction}>
                <TableCell className="text-xs font-medium">{g.jurisdiction}</TableCell>
                <TableCell className="text-xs font-mono">{g.requirement}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{g.notes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
