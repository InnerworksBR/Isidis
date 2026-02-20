import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, ArrowRight, Sparkles, Shield, Zap, Star, Users, Camera, MessageCircle, ShieldCheck, Heart, Play } from 'lucide-react'
import { PractitionerCard, type PractitionerProps } from '@/components/practitioner-card'
import { createClient } from '@/lib/supabase/server'
import { getLandingStats } from '@/lib/data/stats'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'
import { InteractiveTarotCards } from '@/components/interactive-tarot-cards'

async function getFeaturedReaders(): Promise<PractitionerProps[]> {
  const supabase = await createClient()

  // Fetch READER profiles with their cheapest gig price
  const { data: readers } = await supabase
    .from('profiles')
    .select('id, full_name, bio, specialties, avatar_url, rating_average, reviews_count')
    .eq('role', 'READER')
    .eq('verification_status', 'APPROVED')
    .limit(8)

  if (!readers || readers.length === 0) return []

  // Fetch gigs for these readers to get prices
  const readerIds = readers.map(r => r.id)
  const { data: gigs } = await supabase
    .from('gigs')
    .select('id, owner_id, price, title')
    .in('owner_id', readerIds)
    .eq('is_active', true)
    .eq('status', 'APPROVED')
    .order('price', { ascending: true })

  // Build practitioner data from real database
  return readers.map(reader => {
    const readerGigs = gigs?.filter(g => g.owner_id === reader.id) || []
    const cheapestPrice = readerGigs.length > 0 ? readerGigs[0].price / 100 : 0
    const gigTitle = readerGigs.length > 0 ? readerGigs[0].title : 'Taróloga'

    return {
      id: reader.id,
      name: reader.full_name || 'Taróloga',
      title: gigTitle,
      rating: reader.rating_average || 5.0,
      reviews: reader.reviews_count || 0,
      price: cheapestPrice,
      image: reader.avatar_url,
      tags: reader.specialties || [],
      gigId: readerGigs.length > 0 ? readerGigs[0].id : undefined,
    }
  }).filter(r => r.price > 0) // Only show readers who have active gigs with prices
}

export default async function Home() {
  const [readers, stats] = await Promise.all([
    getFeaturedReaders(),
    getLandingStats()
  ])

  return (
    <div className="flex flex-col">
      {/* =============== HERO =============== */}
      <PageSection padding="xl" withOrbs withShootingStars className="pt-28 pb-32 text-center md:text-left">
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <PageHeader
                align="left"
                badge="O Marketplace de Tarot mais Moderno do Brasil"
                badgeIcon={<Sparkles className="w-3 h-3" />}
                title={
                  <>
                    Encontre clareza para sua <span className="text-gradient-primary">jornada espiritual</span>
                  </>
                }
                description="Conecte-se com as melhores tarólogas do país em uma experiência única. Receba leituras profundas com áudio, vídeo e fotos das cartas, tudo em um só lugar."
                className="mb-8"
                titleClassName="text-4xl md:text-6xl"
              />

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button size="lg" className="h-14 px-8 text-base font-bold rounded-2xl animate-glow-pulse" asChild>
                  <Link href="/tarologas">Agendar Leitura Agora</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-2xl glass hover:bg-white/5" asChild>
                  <Link href="#como-funciona">Como Funciona</Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {[
                  { icon: Shield, text: 'Privacidade Total', color: 'text-green-500' },
                  { icon: Zap, text: 'Início Imediato', color: 'text-accent' },
                  { icon: Star, text: 'Elite do Tarot', color: 'text-yellow-500' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center md:items-start gap-2">
                    <div className={cn("p-2 rounded-lg bg-white/5", item.color)}>
                      <item.icon className="w-5 h-5 shadow-sm" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-tighter opacity-70">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative group perspective-1000 hidden lg:block">
              {/* Decorative background for the mockup */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 to-purple-500/30 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="relative animate-float rounded-3xl overflow-hidden glass-strong border-white/20 shadow-2xl shadow-primary/20">
                <div className="bg-muted/30 p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="text-[10px] font-mono opacity-40 uppercase tracking-widest text-white">Acesso Exclusivo: Sua Tiragem</div>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-primary uppercase tracking-wider">Status</div>
                      <div className="text-sm font-bold text-white">Leitura Concluída</div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Disponível
                    </div>
                  </div>

                  {/* Audio Simulation */}
                  <div className="glass p-3 rounded-xl border-white/10 flex items-center gap-4 bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                      <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                    </div>
                    <div className="flex-grow space-y-1.5">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-primary" />
                      </div>
                      <div className="flex justify-between text-[8px] opacity-40 font-mono text-white">
                        <span>01:42</span>
                        <span>03:00</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Mockups */}
                  <div className="flex gap-3 overflow-hidden">
                    {[
                      'https://sacred-texts.com/tarot/pkt/img/ar01.jpg',
                      'https://sacred-texts.com/tarot/pkt/img/ar02.jpg',
                      'https://sacred-texts.com/tarot/pkt/img/ar09.jpg'
                    ].map((url, i) => (
                      <div key={i} className="flex-shrink-0 w-20 aspect-[2/3] rounded-lg bg-muted/50 border border-white/10 flex items-center justify-center relative overflow-hidden group/card">
                        <img src={url} alt="Tarot Card" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/card:opacity-100 transition-opacity" />
                        <Star className="w-4 h-4 text-white/40 relative z-10" />
                      </div>
                    ))}
                    <div className="flex-shrink-0 w-20 aspect-[2/3] rounded-lg bg-muted/20 border border-dashed border-white/10 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full border border-white/5 flex items-center justify-center">
                        <ArrowRight className="w-3 h-3 opacity-20" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Float cards */}
              <div className="absolute -top-6 -right-6 glass rounded-2xl p-4 shadow-xl border-white/20 animate-float-slow delay-500">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-60">Segurança</div>
                    <div className="text-xs font-bold">Checkout PIX Seguro</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-10 -left-6 glass-strong rounded-2xl p-4 shadow-xl border-primary/20 animate-float delay-1000 overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border border-background bg-muted overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs font-bold">+{stats.activeReaders} Especialistas</div>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </PageSection>



      {/* =============== SOCIAL PROOF =============== */}
      <PageSection padding="md" variant="muted">
        <PageContainer>
          <div className="flex flex-wrap items-center justify-around gap-8 md:gap-16 text-center">
            {[
              { value: `${stats.totalConsultations}+`, label: 'Consultas Realizadas', icon: Zap },
              { value: `${stats.satisfactionRate}%`, label: 'Satisfação Garantida', icon: Heart },
              { value: `${stats.activeReaders}+`, label: 'Tarólogas Premium', icon: Users },
              { value: `${stats.averageRating}`, label: 'Avaliação Média', icon: Star, fill: true },
            ].map((stat, i) => (stat &&
              <div key={stat.label} className="group cursor-default">
                <div className="flex items-center gap-3 mb-1 justify-center">
                  {stat.icon && <stat.icon className={cn("w-6 h-6 text-primary", stat.fill && "fill-primary")} />}
                  <p className="text-3xl md:text-4xl font-black text-gradient-primary tracking-tighter">
                    {stat.value}
                  </p>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== O DIFERENCIAL (ENTREGA RICA) =============== */}
      <PageSection padding="xl" id="diferencial" withOrbs>
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-10 bg-primary/10 blur-[100px] rounded-full opacity-50" />
              <InteractiveTarotCards />

              {/* Play Button Overlay Mock */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/50 animate-glow-pulse cursor-pointer z-20 pointer-events-none">
                <Zap className="w-8 h-8 text-white fill-white" />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <PageHeader
                badge="A Experiência Isidis"
                title="Longe de ser apenas um chat de texto"
                description="Nós entregamos um produto digital completo. Sua leitura contém fotos reais das cartas tiradas, áudios detalhados com a voz da taróloga e uma interpretação escrita."
                className="mb-8"
              />

              <div className="space-y-8">
                {[
                  {
                    icon: Camera,
                    title: 'Visual Imersivo',
                    desc: 'Veja cada carta tirada em alta resolução. A transparência que você merece.'
                  },
                  {
                    icon: MessageCircle,
                    title: 'Voz e Alma',
                    desc: 'Ouça a interpretação da taróloga através de áudios exclusivos para sua tiragem.'
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Histórico Eterno',
                    desc: 'Sua tiragem fica gravada no seu dashboard para ser revisitada sempre que precisar.'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl glass border-white/10 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all duration-500">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== PRACTITIONERS =============== */}
      <PageSection>
        <PageContainer>
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-12 text-center md:text-left">
            <PageHeader
              badge="Curadoria Especial"
              title="As Vozes do Oráculo"
              description="Especialistas selecionadas a dedo para garantir a melhor orientação possível."
              className="mb-0"
              titleClassName="text-3xl md:text-4xl"
            />
            <Button variant="ghost" className="text-primary font-bold gap-2 mt-6 md:mt-0 hover:bg-primary/10 h-12 rounded-xl" asChild>
              <Link href="/tarologas">
                Ver Todas as Profissionais <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {readers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {readers.map((p, i) => (
                <div key={p.id} className={cn("animate-fade-in-up", `delay-${(i % 4) + 1}`)}>
                  <PractitionerCard practitioner={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 animate-fade-in-up glass rounded-3xl border-dashed border-white/10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 mb-6">
                <Users className="w-10 h-10 text-primary/30" />
              </div>
              <h3 className="text-2xl font-bold mb-2 italic">Novos portais se abrindo...</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Estamos finalizando a curadoria das melhores tarólogas do Brasil. Ouse esperar pelo extraordinário.
              </p>
              <Button className="mt-8 font-bold rounded-xl px-10 h-12" asChild>
                <Link href="/register">Ser Notificado</Link>
              </Button>
            </div>
          )}
        </PageContainer>
      </PageSection>

      {/* =============== COMO FUNCIONA =============== */}
      <PageSection padding="xl" id="como-funciona" variant="card">
        <PageContainer>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:pr-12">
              <PageHeader
                badge="Simplicidade"
                title="3 Passos para clareza"
                description="Transformamos milênios de conhecimento em uma experiência digital suave e segura."
                align="left"
              />
              <div className="hidden lg:block">
                <div className="p-6 glass rounded-2xl border-white/10 mt-12">
                  <p className="text-lg font-bold italic text-primary">"Isidis me deu a clareza que eu precisava em um momento de transição de carreira. A interface é mágica."</p>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
                      <img src="https://i.pravatar.cc/100?u=4" alt="user" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-sm">
                      <div className="font-bold">Mariana S.</div>
                      <div className="opacity-50">Cliente há 2 meses</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  step: '01',
                  icon: Users,
                  title: 'Escolha seu guia',
                  desc: 'Navegue pelos perfis e escolha a profissional que mais ressoa com seu momento atual. Veja especialidades e avaliações reais.'
                },
                {
                  step: '02',
                  icon: Zap,
                  title: 'Pagamento Mágico (PIX)',
                  desc: 'Sem burocracias. Pague via PIX com QR Code ou Copia e Cola. O sistema identifica seu pagamento em segundos e libera o pedido.'
                },
                {
                  step: '03',
                  icon: Sparkles,
                  title: 'Receba o Oráculo',
                  desc: 'Em pouco tempo sua tiragem estará pronta. Receba uma notificação e acesse seu dashboard para ver a leitura completa.'
                },
                {
                  step: '04',
                  icon: Shield,
                  title: 'Segurança & Sigilo',
                  desc: 'Absolutamente nada do que for dito na leitura sai da plataforma. Sua conta e seus segredos estão protegidos por criptografia.'
                }
              ].map((item, i) => (
                <div
                  key={item.step}
                  className="p-8 glass rounded-3xl border-white/5 group hover:border-primary/30 transition-all duration-500 relative"
                >
                  <div className="absolute top-6 right-8 text-4xl font-black opacity-[0.03] group-hover:opacity-10 transition-opacity">
                    {item.step}
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-6 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== FAQ =============== */}
      <PageSection padding="xl">
        <PageContainer maxWidth="4xl">
          <PageHeader
            align="center"
            badge="Dúvidas Comuns"
            title="Perguntas Frequentes"
            description="Tudo o que você precisa saber para começar sua jornada com Isidis."
          />

          <div className="space-y-4">
            {[
              { q: 'Quanto tempo demora para receber a leitura?', a: 'Cada taróloga tem seu prazo de entrega, mas a maioria entrega em menos de 24 horas. Você verá o prazo exato no perfil da profissional antes de contratar.' },
              { q: 'Como recebo o acesso à minha tiragem?', a: 'Assim que a taróloga concluir a leitura, você receberá um e-mail e uma notificação. O conteúdo estará disponível no seu Dashboard em "Minhas Tiragens".' },
              { q: 'O pagamento via PIX é seguro?', a: 'Sim, utilizamos os protocolos de segurança mais rígidos. O pagamento é instantâneo e garantido pela nossa plataforma.' },
              { q: 'E se eu não gostar da leitura?', a: 'Prezamos pela qualidade. Se você tiver qualquer problema com o conteúdo entregue, nosso suporte está pronto para analisar cada caso individualmente.' }
            ].map((faq, i) => (
              <div key={i} className="glass rounded-2xl p-6 border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                <h4 className="font-bold flex items-center justify-between text-lg">
                  {faq.q}
                  <ArrowRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h4>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed hidden group-hover:block animate-fade-in">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== CTA FINAL =============== */}
      <PageSection withOrbs withShootingStars className="text-center pb-40">
        <PageContainer maxWidth="4xl">
          <div className="relative">
            {/* Decorative element */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-primary/20 blur-[100px] rounded-full" />

            <PageHeader
              align="center"
              title={
                <>
                  Pronto para ver o que as <span className="text-gradient-primary">cartas revelam?</span>
                </>
              }
              description="Junte-se a milhares de pessoas que usam o Isidis para guiar suas decisões e encontrar paz interior."
            />

            <div className="flex flex-col sm:flex-row gap-6 justify-center mt-10">
              <Button size="lg" className="h-16 px-12 text-lg font-bold animate-glow-pulse rounded-2xl shadow-2xl shadow-primary/40" asChild>
                <Link href="/register">
                  Começar minha Jornada
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-12 text-lg font-bold rounded-2xl glass hover:bg-white/5" asChild>
                <Link href="/tarologas">
                  Explorar Especialistas
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-xs font-bold uppercase tracking-widest opacity-40">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Sigilo Total
              </span>
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Entrega Rápida
              </span>
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> Especialistas Verificadas
              </span>
            </div>
          </div>
        </PageContainer>
      </PageSection>
    </div>
  )
}

