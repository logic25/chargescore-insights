import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import PortfolioSidebar from "@/components/portfolio/PortfolioSidebar";
import MasterControls from "@/components/portfolio/MasterControls";
import SiteTable from "@/components/portfolio/SiteTable";
import WaterfallTable from "@/components/portfolio/WaterfallTable";
import ExitAnalysisCard from "@/components/portfolio/ExitAnalysis";
import WaterfallCharts from "@/components/portfolio/WaterfallCharts";
import StallSizer from "@/components/portfolio/StallSizer";
import DocumentsManager from "@/components/portfolio/DocumentsManager";
import {
  DEFAULT_CONTROLS,
  PRELOADED_SITES,
  computeSite,
  computeWaterfall,
  computeExit,
} from "@/lib/waterfallCalc";
import type { MasterControls as MCType, SiteRow } from "@/lib/waterfallCalc";

export default function PortfolioBuilder() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("waterfall");
  const [controls, setControls] = useState<MCType>(DEFAULT_CONTROLS);
  const [sites, setSites] = useState<SiteRow[]>(
    PRELOADED_SITES.map(s => ({ ...s, id: crypto.randomUUID() }))
  );

  const computedSites = useMemo(() => sites.map(s => computeSite(s, controls)), [sites, controls]);
  const totalOOP = useMemo(() => computedSites.reduce((s, c) => s + c.outOfPocket, 0), [computedSites]);
  const waterfallRows = useMemo(() => computeWaterfall(computedSites, controls), [computedSites, controls]);
  const exitAnalysis = useMemo(() => computeExit(waterfallRows, controls, totalOOP), [waterfallRows, controls, totalOOP]);

  const handleAddFromSizer = useCallback((site: Omit<SiteRow, 'id'>) => {
    setSites(prev => [...prev, { ...site, id: crypto.randomUUID() }]);
    setActiveTab("waterfall");
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PortfolioSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-3 border-b border-border px-4 shrink-0">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/')}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Home
            </Button>
            <div className="flex-1" />
            <h1 className="text-sm font-heading font-bold">AR Spark Energy — Portfolio Builder</h1>
          </header>

          <main className="flex-1 overflow-auto p-4 space-y-4">
            {activeTab === "waterfall" && (
              <>
                <MasterControls controls={controls} onChange={setControls} />
                <SiteTable sites={sites} controls={controls} onSitesChange={setSites} />
                <WaterfallTable rows={waterfallRows} />
                <ExitAnalysisCard exit={exitAnalysis} controls={controls} totalOOP={totalOOP} />
                <WaterfallCharts waterfallRows={waterfallRows} exit={exitAnalysis} sites={computedSites} />
              </>
            )}
            {activeTab === "chargescore" && (
              <StallSizer onAddToPortfolio={handleAddFromSizer} />
            )}
            {activeTab === "documents" && (
              <DocumentsManager sites={sites.map(s => ({ name: s.name, address: s.address }))} />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
