import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, ArrowRight, Sparkles, Shield, Zap, Star, Users } from 'lucide-react'
import { PractitionerCard, type PractitionerProps } from '@/components/practitioner-card'
import { createClient } from '@/lib/supabase/server'
import { getLandingStats } from '@/lib/data/stats'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { PageHeader } from '@/components/layout/PageHeader'

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
      <PageSection padding="xl" withOrbs className="pt-28 pb-36 text-center">
        <PageContainer maxWidth="4xl">
          <PageHeader
            align="center"
            badge="Conecte-se com o Cosmos"
            badgeIcon={<Sparkles className="w-3 h-3" />}
            title={
              <>
                Descubra seu{' '}
                <span className="text-gradient-primary italic">destino</span>
                <br />
                nas cartas.
              </>
            }
            description="Conecte-se com tarólogas qualificadas para orientações personalizadas. Leituras profundas com entrega rápida e segura."
            className="mb-12"
          />

          <h1 className="sr-only">Descubra seu destino nas cartas.</h1>

          {/* Search Bar */}
          <div className="w-full max-w-2xl mx-auto animate-fade-in-up delay-3">
            <div className="flex flex-col md:flex-row gap-2 p-2 glass rounded-2xl md:rounded-full shadow-xl shadow-primary/5">
              <div className="flex-grow flex items-center px-5 gap-3">
                <Search className="text-primary w-5 h-5 flex-shrink-0" />
                <Input
                  className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 shadow-none h-12"
                  placeholder="Buscar por 'Amor', 'Carreira' ou 'Tarot'..."
                />
              </div>
              <Button size="lg" className="rounded-xl md:rounded-full font-bold px-8 h-12" asChild>
                <Link href="/tarologas">Explorar</Link>
              </Button>
            </div>

            {/* Necessidades Imediatas - Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 w-full">
              {[
                {
                  name: 'Amor & Relacionamentos',
                  image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80',
                  color: 'from-pink-500/20 to-rose-500/40'
                },
                {
                  name: 'Carreira & Finanças',
                  image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=80',
                  color: 'from-blue-500/20 to-cyan-500/40'
                },
                {
                  name: 'Espiritualidade',
                  image: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=400&q=80',
                  color: 'from-purple-500/20 to-violet-500/40'
                },
                {
                  name: 'Interpretação de Sonhos',
                  image: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=400&q=80',
                  color: 'from-indigo-500/20 to-slate-500/40'
                },
              ].map((category, i) => (
                <Link
                  key={category.name}
                  href={`/tarologas?category=${category.name}`}
                  className={`group relative overflow-hidden rounded-2xl aspect-[4/3] md:aspect-[3/4] hover:scale-105 transition-all duration-300 shadow-lg animate-fade-in-up delay-${i + 4}`}
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${category.image})` }}
                  />

                  {/* Overlay Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${category.color} opacity-60 group-hover:opacity-80 transition-opacity`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <span className="inline-block px-2 py-1 mb-2 text-xs font-bold text-white/90 bg-white/10 backdrop-blur-md rounded-md border border-white/20">
                      Explorar
                    </span>
                    <h3 className="text-xl font-bold text-white group-hover:text-primary-foreground transition-colors flex items-center gap-2">
                      {category.name}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== SOCIAL PROOF =============== */}
      <PageSection padding="sm" variant="muted">
        <PageContainer>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
            {[
              { value: `${stats.totalConsultations}+`, label: 'Consultas realizadas' },
              { value: `${stats.satisfactionRate}%`, label: 'Satisfação' },
              { value: `${stats.activeReaders}+`, label: 'Tarólogas ativas' },
              { value: `${stats.averageRating}`, label: 'Avaliação média', icon: true },
            ].map((stat, i) => (
              <div key={stat.label} className={`animate-fade-in-up delay-${i + 1}`}>
                <p className="text-2xl md:text-3xl font-extrabold text-gradient-primary flex items-center gap-1 justify-center">
                  {stat.icon && <Star className="w-5 h-5 text-accent fill-accent" />}
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== PRACTITIONERS =============== */}
      <PageSection>
        <PageContainer>
          <div className="flex items-end justify-between mb-12">
            <PageHeader
              badge="Curadoria Especial"
              title="Profissionais em Destaque"
              description="Especialistas selecionados prontos para guiar sua jornada."
              className="mb-0"
            />
            <Button variant="ghost" className="text-primary font-bold gap-2 hidden md:flex hover:bg-primary/10" asChild>
              <Link href="/tarologas">
                Ver Todos <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {readers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {readers.map((p, i) => (
                <div key={p.id} className={`animate-fade-in-up delay-${i + 1}`}>
                  <PractitionerCard practitioner={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 animate-fade-in-up">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
                <Users className="w-10 h-10 text-primary/50" />
              </div>
              <h3 className="text-xl font-bold mb-2">Em breve</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Estamos selecionando as melhores tarólogas para você. Cadastre-se para ser notificado quando elas chegarem.
              </p>
              <Button className="mt-6 font-bold" asChild>
                <Link href="/register">Criar Conta</Link>
              </Button>
            </div>
          )}

          <div className="flex justify-center mt-10 md:hidden">
            <Button variant="outline" className="font-bold gap-2" asChild>
              <Link href="/tarologas">
                Ver Todos <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== HOW IT WORKS =============== */}
      <PageSection variant="card">
        <PageContainer>
          <PageHeader
            align="center"
            badge="Simples e Rápido"
            title="Como Funciona"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                icon: Search,
                title: 'Escolha sua taróloga',
                desc: 'Explore perfis, especialidades e avaliações para encontrar a conexão perfeita.'
              },
              {
                step: '02',
                icon: Zap,
                title: 'Faça o pagamento',
                desc: 'Pagamento seguro via PIX com confirmação instantânea. Sem complicações.'
              },
              {
                step: '03',
                icon: Sparkles,
                title: 'Receba sua leitura',
                desc: 'Leitura personalizada com cartas visuais e interpretação profunda da mestra.'
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`text-center group animate-fade-in-up delay-${i + 2}`}
              >
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6 group-hover:bg-primary/20 transition-all duration-500 group-hover:scale-110">
                  <item.icon className="w-8 h-8 text-primary" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </PageSection>

      {/* =============== CTA FINAL =============== */}
      <PageSection withOrbs className="text-center">
        <PageContainer maxWidth="4xl">
          <PageHeader
            align="center"
            title={
              <>
                Sua jornada espiritual{' '}
                <span className="text-gradient-primary">começa aqui</span>
              </>
            }
            description="Milhares de pessoas já encontraram respostas. Comece sua transformação hoje."
          />

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="py-7 px-10 text-base font-bold animate-glow-pulse rounded-xl" asChild>
              <Link href="/register">
                <Sparkles className="mr-2 w-5 h-5" />
                Começar Agora — É Grátis
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="py-7 px-10 text-base font-bold rounded-xl hover:bg-primary/10" asChild>
              <Link href="/tarologas">
                Explorar Tarólogas
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" /> Pagamento Seguro
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Entrega Rápida
            </span>
          </div>
        </PageContainer>
      </PageSection>
    </div>
  )
}

