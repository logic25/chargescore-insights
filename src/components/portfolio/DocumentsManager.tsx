import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Trash2, Download, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface SiteDocument {
  id: string;
  site_name: string;
  address: string;
  file_name: string;
  file_path: string;
  doc_type: string;
  extracted_data: Record<string, unknown>;
  created_at: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  evpin_report: "EVpin Report",
  lease: "Lease",
  permit: "Permit",
  utility_bill: "Utility Bill",
  other: "Other",
};

interface SiteInfo {
  name: string;
  address: string;
}

interface Props {
  sites: SiteInfo[];
}

export default function DocumentsManager({ sites = [] }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<SiteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>("evpin_report");
  const [siteName, setSiteName] = useState(sites?.[0]?.name ?? "");
  const [address, setAddress] = useState(sites?.[0]?.address ?? "");

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("site_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDocs((data as SiteDocument[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("site-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      let extractedData: Record<string, unknown> = {};

      // If EVpin report, attempt to parse
      if (docType === "evpin_report" && file.name.toLowerCase().endsWith(".pdf")) {
        try {
          const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-evpin-report", {
            body: { filePath },
          });
          if (!parseError && parseData?.extracted) {
            extractedData = parseData.extracted;
          }
        } catch {
          console.warn("EVpin parse failed, saving document without extraction");
        }
      }

      const { error: insertError } = await supabase.from("site_documents").insert([{
        user_id: user.id,
        site_name: siteName,
        address,
        file_name: file.name,
        file_path: filePath,
        doc_type: docType as "evpin_report" | "lease" | "permit" | "utility_bill" | "other",
        extracted_data: extractedData as any,
      }]);

      if (insertError) throw insertError;

      toast({ title: "Document uploaded", description: extractedData.totalScore ? `EVpin Score: ${extractedData.totalScore}/5 extracted` : file.name });
      await fetchDocs();
      setSiteName("");
      setAddress("");
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (doc: SiteDocument) => {
    await supabase.storage.from("site-documents").remove([doc.file_path]);
    await supabase.from("site_documents").delete().eq("id", doc.id);
    setDocs(prev => prev.filter(d => d.id !== doc.id));
    toast({ title: "Document deleted" });
  };

  const handleDownload = async (doc: SiteDocument) => {
    const { data } = await supabase.storage.from("site-documents").download(doc.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleView = async (doc: SiteDocument) => {
    const { data } = await supabase.storage.from("site-documents").download(doc.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent" /> Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Site Name</Label>
              {(sites?.length ?? 0) > 0 ? (
                <Select value={siteName} onValueChange={(name) => {
                  setSiteName(name);
                  const match = sites.find(s => s.name === name);
                  if (match) setAddress(match.address);
                }}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select site..." /></SelectTrigger>
                  <SelectContent>
                    {sites.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="Site name" className="h-8 text-sm" />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Address</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Auto-filled from site" className="h-8 text-sm text-muted-foreground" readOnly={!!sites?.find(s => s.name === siteName)} />
            </div>
            <div>
              <Label htmlFor="doc-upload" className="cursor-pointer">
                <div className="h-8 flex items-center justify-center gap-1.5 rounded-md bg-accent text-accent-foreground text-sm px-3 hover:bg-accent/90 transition-colors">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : "Choose File"}
                </div>
              </Label>
              <input id="doc-upload" type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.jpg,.png,.xlsx" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Site Documents
            <Badge variant="secondary" className="text-[10px] ml-auto">{docs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : docs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No documents uploaded yet. Upload EVpin reports, leases, permits, or utility bills above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">File</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Site</TableHead>
                  <TableHead className="text-xs">Address</TableHead>
                  <TableHead className="text-xs">Extracted</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map(doc => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-xs font-mono">{doc.file_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{doc.site_name || "—"}</TableCell>
                    <TableCell className="text-xs">{doc.address || "—"}</TableCell>
                    <TableCell>
                      {doc.doc_type === "evpin_report" && doc.extracted_data?.totalScore ? (
                        <Badge className="text-[10px] bg-accent/20 text-accent border-accent/30">
                          EVpin: {String(doc.extracted_data.totalScore)}/5
                        </Badge>
                      ) : doc.doc_type === "evpin_report" ? (
                        <span className="text-[10px] text-muted-foreground">No score extracted</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleView(doc)} title="View">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(doc)} title="Download">
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(doc)} title="Delete">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
