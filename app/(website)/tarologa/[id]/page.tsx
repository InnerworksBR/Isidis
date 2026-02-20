import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Star, Clock, Lock, CheckCircle2, ArrowRight, User,
    Mic, Camera, FileText, Shield, MessageCircle, Sparkles, Heart,
    Instagram, Youtube, MapPin
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/chat/chat-window'
import { getYouTubeEmbedUrl } from '@/lib/utils'
import { AnalyticsTracker } from '@/components/analytics-tracker'
import { ClickTracker } from '@/components/click-tracker'

export default async function TarologaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch reader profile with new fields
    const { data: profile } = await supabase
        .from('profiles')
        .select('*') // Select all to get new fields
        .eq('id', id)
        .eq('role', 'READER')
        .single()

    if (!profile) notFound()

    // Fetch gigs
    const { data: gigs } = await supabase
        .from('gigs')
        .select('id, title, description, price, image_url, is_active, category, delivery_time_hours, delivery_method')
        .eq('owner_id', id)
        .eq('is_active', true)
        .eq('status', 'APPROVED')
        .order('price', { ascending: true })

    // Fetch reviews for this reader
    const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, client_id, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
        .eq('reader_id', id)
        .order('created_at', { ascending: false })
        .limit(10)

    const reviewsList = reviews || []
    const avgRating = reviewsList.length > 0
        ? (reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length).toFixed(1)
        : '5.0'
    const totalReviews = reviewsList.length

    return (
        <div className="min-h-screen text-slate-200 font-sans relative" style={{ backgroundColor: profile.profile_color || '#0a0a0f' }}>
            {gigs && gigs.length > 0 && (
                <AnalyticsTracker
                    gigId={gigs[0].id}
                    readerId={profile.id}
                    eventType="view"
                    trigger="mount"
                />
            )}
            {/* HERO BANNER */}
            <div className="relative h-[350px] md:h-[450px] w-full bg-[#12121a] overflow-hidden group">
                {profile.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover opacity-80" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-indigo-900 to-purple-900 opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12">
                    <div className="container mx-auto px-4 flex flex-col md:flex-row items-end gap-8">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0a0a0f] overflow-hidden bg-slate-800 shadow-2xl">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={profile.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"}
                                    alt={profile.full_name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 rounded-full border-4 border-[#0a0a0f]" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 mb-2">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{profile.full_name}</h1>

                                {profile.instagram_handle && (
                                    <Link href={`https://instagram.com/${profile.instagram_handle}`} target="_blank" className="p-2 bg-white/5 rounded-full hover:bg-pink-500/20 hover:text-pink-500 transition-colors">
                                        <Instagram className="w-5 h-5" />
                                    </Link>
                                )}
                                {profile.youtube_url && (
                                    <Link href={profile.youtube_url} target="_blank" className="p-2 bg-white/5 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors">
                                        <Youtube className="w-5 h-5" />
                                    </Link>
                                )}
                            </div>

                            <p className="text-lg md:text-xl text-slate-300 font-medium mb-4 max-w-2xl">
                                {profile.tagline || profile.bio?.slice(0, 100) + '...'}
                            </p>

                            <div className="flex flex-wrap items-center gap-6 text-sm font-medium">
                                <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full">
                                    <Star className="w-4 h-4 fill-amber-400" />
                                    <span className="font-bold">{avgRating}</span>
                                    <span className="opacity-70">({totalReviews} avaliações)</span>
                                </div>
                                {profile.years_of_experience > 0 && (
                                    <div className="flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-full">
                                        <Sparkles className="w-4 h-4" />
                                        <span>{profile.years_of_experience} Anos de Exp.</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-slate-400">
                                    <MapPin className="w-4 h-4" />
                                    <span>Online Agora</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* LEFT COLUMN (Bio & Details) */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* About */}
                        <section>
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <User className="w-6 h-6 text-indigo-500" />
                                Sobre Mim
                            </h3>
                            <div className="prose prose-invert prose-lg max-w-none text-slate-300 leading-relaxed whitespace-pre-line">
                                {profile.bio}
                            </div>
                        </section>

                        {profile.youtube_url && getYouTubeEmbedUrl(profile.youtube_url) && (
                            <>
                                <div className="h-px bg-white/5" />
                                <section>
                                    <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                        <Youtube className="w-6 h-6 text-red-500" />
                                        Apresentação em Vídeo
                                    </h3>
                                    <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-[#12121a] shadow-2xl">
                                        <iframe
                                            src={getYouTubeEmbedUrl(profile.youtube_url)!}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                            className="w-full h-full"
                                        ></iframe>
                                    </div>
                                </section>
                            </>
                        )}

                        <div className="h-px bg-white/5" />

                        {/* Specialties */}
                        <section>
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-500" />
                                Especialidades & Ferramentas
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Áreas de Foco</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {profile.specialties?.map((spec: string) => (
                                            <span key={spec} className="px-4 py-2 bg-[#1a1a24] border border-white/5 rounded-xl text-indigo-300 font-medium">
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {profile.decks_used && profile.decks_used.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Baralhos Utilizados</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {profile.decks_used.map((deck: string) => (
                                                <span key={deck} className="px-4 py-2 bg-[#1a1a24] border border-white/5 rounded-xl text-slate-300 text-sm">
                                                    {deck}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="h-px bg-white/5" />

                        {/* Recent Reviews */}
                        <section>
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <MessageCircle className="w-6 h-6 text-indigo-500" />
                                Depoimentos de Clientes
                            </h3>
                            {reviewsList.length > 0 ? (
                                <div className="space-y-6">
                                    {reviewsList.map((review: any) => (
                                        <div key={review.id} className="bg-[#12121a] p-6 rounded-2xl border border-white/5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={review.profiles.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"}
                                                            alt="User"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white">{review.profiles.full_name}</p>
                                                        <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex text-amber-400">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-700'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-slate-300 italic">"{review.comment}"</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
                            )}
                        </section>

                    </div>

                    {/* RIGHT COLUMN (Gigs Sidebar) */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="sticky top-24">
                            <div className="bg-[#12121a] rounded-3xl p-6 border border-white/10 shadow-xl mb-8">
                                <h3 className="text-xl font-bold text-white mb-6">Serviços Disponíveis</h3>
                                {gigs && gigs.length > 0 ? (
                                    <div className="space-y-4">
                                        {gigs.map((gig) => (
                                            <div key={gig.id} className="relative">
                                                <AnalyticsTracker
                                                    gigId={gig.id}
                                                    readerId={profile.id}
                                                    eventType="impression"
                                                />
                                                <Link href={`/servico/${gig.id}`} className="block group bg-[#0a0a0f] p-4 rounded-xl border border-white/5 hover:border-indigo-500 transition-colors cursor-pointer">
                                                    {gig.image_url && (
                                                        <div className="w-full h-32 mb-4 rounded-lg overflow-hidden relative">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={gig.image_url}
                                                                alt={gig.title}
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                                                            {gig.title}
                                                        </h4>
                                                        <span className="shrink-0 bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded">
                                                            {gig.category || 'Geral'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {gig.delivery_time_hours}h</span>
                                                        <span className="flex items-center gap-1">{gig.delivery_method === 'PHYSICAL_PHOTO' ? <Camera className="w-3 h-3" /> : <Mic className="w-3 h-3" />} {gig.delivery_method === 'PHYSICAL_PHOTO' ? 'Foto' : 'Digital'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                                        <span className="text-xs text-slate-500">A partir de</span>
                                                        <span className="text-lg font-bold text-white">R$ {(gig.price / 100).toFixed(2)}</span>
                                                    </div>
                                                    {/* We keep the ClickTracker but it now leads to details page, which is effectively a preliminary "buy" step */}
                                                    <ClickTracker gigId={gig.id} readerId={profile.id} eventType="click_buy">
                                                        <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                                            Agendar Agora
                                                        </Button>
                                                    </ClickTracker>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-center py-8">Nenhum serviço ativo disponível.</p>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-3xl p-6 border border-white/10 text-center">
                                <Shield className="w-10 h-10 text-indigo-300 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-white mb-2">Satisfação Garantida</h4>
                                <p className="text-sm text-slate-300 mb-4">
                                    Seus fundos ficam retidos com segurança até que sua leitura seja entregue.
                                </p>
                                <div className="text-xs text-indigo-300 flex items-center justify-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" /> Taróloga Verificada
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Chat Window */}
            {user && (
                <div className="fixed bottom-6 right-6 z-50">
                    <ChatWindow
                        currentUser={{ id: user.id }}
                        otherUser={{ id: profile.id, name: profile.full_name || 'Taróloga', avatar: profile.avatar_url }}
                        title={`Chat com ${profile.full_name?.split(' ')[0]}`}
                        variant="floating"
                    />
                </div>
            )}
        </div>
    )
}
