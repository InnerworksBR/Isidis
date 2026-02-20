import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateGigStatus } from "../actions";
import { Check, X } from "lucide-react";
import Image from "next/image";

export default async function AdminGigsPage() {
    const supabase = await createClient();

    const { data: gigs } = await supabase
        .from('gigs')
        .select(`
            *,
            owner:profiles(*)
        `)
        .order('created_at', { ascending: false });

    const pendingGigs = gigs?.filter(g => g.status === 'PENDING') || [];
    const allGigs = gigs || [];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Moderação de Gigs</h2>

            <Tabs defaultValue="pending" className="w-full">
                <TabsList>
                    <TabsTrigger value="pending">Pendentes ({pendingGigs.length})</TabsTrigger>
                    <TabsTrigger value="all">Todos ({allGigs.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4 space-y-4">
                    {pendingGigs.length === 0 && (
                        <p className="text-muted-foreground">Nenhum gig pendente de aprovação.</p>
                    )}
                    {pendingGigs.map((gig) => (
                        <GigApprovalCard key={gig.id} gig={gig} />
                    ))}
                </TabsContent>

                <TabsContent value="all" className="mt-4 space-y-4">
                    {allGigs.map((gig) => (
                        <GigApprovalCard key={gig.id} gig={gig} showActions={false} />
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function GigApprovalCard({ gig, showActions = true }: { gig: any, showActions?: boolean }) {
    return (
        <Card>
            <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-48 h-32 rounded-lg overflow-hidden shrink-0 bg-muted">
                    {gig.image_url ? (
                        <Image src={gig.image_url} alt={gig.title} fill className="object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">Sem imagem</div>
                    )}
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-bold text-lg">{gig.title}</h3>
                            <p className="text-sm text-muted-foreground">por {gig.owner?.full_name}</p>
                        </div>
                        <Badge variant={gig.status === 'APPROVED' ? 'default' : gig.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                            {gig.status}
                        </Badge>
                    </div>

                    <p className="text-sm line-clamp-2">{gig.description}</p>
                    <div className="font-semibold">
                        {(gig.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                </div>

                {showActions && (
                    <div className="flex flex-col gap-2 justify-center border-l pl-6 border-border/50">
                        <form action={async () => {
                            'use server'
                            await updateGigStatus(gig.id, 'APPROVED')
                        }}>
                            <Button size="sm" className="w-full gap-2 bg-green-600 hover:bg-green-700">
                                <Check className="w-4 h-4" /> Aprovar
                            </Button>
                        </form>

                        <form action={async () => {
                            'use server'
                            await updateGigStatus(gig.id, 'REJECTED')
                        }}>
                            <Button size="sm" variant="destructive" className="w-full gap-2">
                                <X className="w-4 h-4" /> Rejeitar
                            </Button>
                        </form>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
