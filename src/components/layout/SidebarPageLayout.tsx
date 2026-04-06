import { Separator } from "../ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface SidebarPageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarPageLayout({
  title,
  subtitle,
  actions,
  children,
}: SidebarPageLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <div className="flex flex-1 items-center justify-between gap-2">
            <div>
              <h1 className="text-sm font-bold leading-tight">{title}</h1>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
