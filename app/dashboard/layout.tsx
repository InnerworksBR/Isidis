import { DashboardBottomNav } from "@/components/layout/dashboard-bottom-nav"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen pb-20 md:pb-0">
            {children}
            <DashboardBottomNav />
        </div>
    )
}
