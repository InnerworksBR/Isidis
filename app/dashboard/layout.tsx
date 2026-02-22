import { DashboardBottomNav } from "@/components/layout/dashboard-bottom-nav"
import { Footer } from "@/components/layout/Footer"
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen pb-20 md:pb-0 flex flex-col">
            <main className="flex-1">
                {children}
            </main>
            <Footer />
            <DashboardBottomNav />
        </div>
    )
}
