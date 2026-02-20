import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Shield, CreditCard, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { approveReader, rejectReader } from '../actions'
import { createClient as createClientJs } from '@supabase/supabase-js'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ApprovalDetailsPage({ params: paramsPromise }: PageProps) {
    const params = await paramsPromise
    const supabase = await createClient()

    const { data: reader } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', params.id)
        .single()

    if (!reader) {
        return <div className="p-8">Leitor não encontrado.</div>
    }

    // Generate signed URLs for private documents
    // Note: If buckets are private, we need createSignedUrl
    const docFrontUrl = reader.document_front_url
    const docBackUrl = reader.document_back_url
    const selfieUrl = reader.selfie_url

    // Use Admin Client to sign URLs (bypassing RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        return <div>Erro: Chave de API de serviço ausente.</div>
    }
    const supabaseAdmin = createClientJs(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // Helper to sign
    const signUrl = async (path: string) => {
        if (!path) return null
        if (path.startsWith('http')) return path
        // Use Admin client to sign
        const { data } = await supabaseAdmin.storage
            .from('verification_documents')
            .createSignedUrl(path, 3600) // 1 hour
        return data?.signedUrl
    }

    const signedDocFront = await signUrl(docFrontUrl)
    const signedDocBack = await signUrl(docBackUrl)
    const signedSelfie = await signUrl(selfieUrl)

    // Avatar is public usually
    const avatarUrl = reader.avatar_url ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${reader.avatar_url}` : null

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/approvals">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Análise de Cadastro</h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span>{reader.full_name}</span>
                        <span>•</span>
                        <span className="font-mono">{reader.id}</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <form action={rejectReader.bind(null, reader.id)}>
                        <Button variant="destructive" className="gap-2">
                            <XCircle className="w-4 h-4" />
                            Rejeitar
                        </Button>
                    </form>
                    <form action={approveReader.bind(null, reader.id)}>
                        <Button variant="default" className="bg-green-600 hover:bg-green-700 gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Aprovar Cadastro
                        </Button>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Profile Overview */}
                <div className="md:col-span-1 space-y-6">
                    <div className="border rounded-xl p-6 bg-card space-y-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-muted mb-4 border-4 border-muted">
                                {avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-12 h-12 text-muted-foreground mt-8 mx-auto" />
                                )}
                            </div>
                            <h2 className="text-lg font-bold">{reader.social_name || reader.full_name}</h2>
                            <p className="text-sm text-muted-foreground">{reader.email}</p>
                            <Badge className="mt-2 bg-amber-500/10 text-amber-500 border-amber-500/20">{reader.status || 'PENDING'}</Badge>
                        </div>

                        <div className="space-y-3 text-sm pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">CPF</span>
                                <span className="font-mono">{reader.tax_id || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Nascimento</span>
                                <span>{reader.birth_date ? new Date(reader.birth_date).toLocaleDateString('pt-BR') : '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Celular</span>
                                <span>{reader.cellphone || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-xl p-6 bg-card space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Endereço
                        </h3>
                        <div className="text-sm space-y-1 text-muted-foreground">
                            <p>{reader.address_street}, {reader.address_number}</p>
                            <p>{reader.address_neighborhood} - {reader.address_city}/{reader.address_state}</p>
                            <p>CEP: {reader.address_zip_code}</p>
                        </div>
                    </div>

                    <div className="border rounded-xl p-6 bg-card space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Dados Bancários
                        </h3>
                        <div className="text-sm space-y-1 text-muted-foreground">
                            <p>Banco: {reader.bank_code}</p>
                            <p>Agência: {reader.agency} | Conta: {reader.account_number}</p>
                            <p>Tipo: {reader.account_type === 'CHECKING' ? 'Corrente' : 'Poupança'}</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Documents & Compliance */}
                <div className="md:col-span-2 space-y-6">
                    <div className="border rounded-xl p-6 bg-card">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <Shield className="w-4 h-4" /> Documentos de Identificação
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Frente do Documento</span>
                                <div className="aspect-video bg-muted rounded-lg overflow-hidden border flex items-center justify-center relative group">
                                    {signedDocFront ? (
                                        <a href={signedDocFront} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={signedDocFront} alt="Doc Front" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Clique para ampliar</div>
                                        </a>
                                    ) : (
                                        <div className="text-muted-foreground text-xs">Não enviado</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Verso do Documento</span>
                                <div className="aspect-video bg-muted rounded-lg overflow-hidden border flex items-center justify-center relative group">
                                    {signedDocBack ? (
                                        <a href={signedDocBack} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={signedDocBack} alt="Doc Back" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Clique para ampliar</div>
                                        </a>
                                    ) : (
                                        <div className="text-muted-foreground text-xs">Não enviado</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Selfie com Documento</span>
                                <div className="aspect-video bg-muted rounded-lg overflow-hidden border flex items-center justify-center relative group max-w-sm mx-auto">
                                    {signedSelfie ? (
                                        <a href={signedSelfie} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={signedSelfie} alt="Selfie" className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">Clique para ampliar</div>
                                        </a>
                                    ) : (
                                        <div className="text-muted-foreground text-xs">Não enviado</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-xl p-6 bg-card">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <FileText className="w-4 h-4" /> Compliance e Perfil
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <span className="text-sm">Aceite dos Termos de Uso e Ética</span>
                                {reader.ethics_accepted_at ? (
                                    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Aceito em {new Date(reader.ethics_accepted_at).toLocaleDateString()}</Badge>
                                ) : (
                                    <Badge variant="destructive">Pendente</Badge>
                                )}
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Biografia</span>
                                <div className="p-3 bg-muted/30 rounded-lg text-sm text-foreground italic">
                                    "{reader.bio || 'Sem biografia'}"
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase">Especialidades</span>
                                <div className="flex flex-wrap gap-2">
                                    {reader.specialties?.map((s: string) => (
                                        <Badge key={s} variant="secondary">{s}</Badge>
                                    )) || <span className="text-sm text-muted-foreground">Nenhuma selecionada</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
