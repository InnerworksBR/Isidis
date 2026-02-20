import { createClient } from '@/lib/supabase/server'
import { TarologasClient } from './tarologas-client'

export interface ReaderData {
    id: string
    name: string
    title: string
    bio: string
    rating: number
    reviews: number
    price: number
    image: string | null
    tags: string[]
    isOnline: boolean
    gigId?: string
}

interface FilterParams {
    category?: string
    deck?: string
    priceMin?: number
    priceMax?: number
    rating?: number
    search?: string
}

async function getAllReaders(filters: FilterParams): Promise<ReaderData[]> {
    const supabase = await createClient()

    let query = supabase
        .from('profiles')
        .select('id, full_name, bio, specialties, avatar_url, rating_average, reviews_count')
        .eq('role', 'READER')
        .eq('verification_status', 'APPROVED')

    // Filter by Search (Name)
    if (filters.search) {
        query = query.ilike('full_name', `%${filters.search}%`)
    }

    // Filter by Category (Specialties)
    // Note: specialties is an array text[]. usage: cs = contains
    if (filters.category && filters.category !== 'all') {
        query = query.contains('specialties', [filters.category])
    }

    // Filter by Deck Type
    if (filters.deck) {
        query = query.contains('decks_used', [filters.deck])
    }

    const { data: readers } = await query

    if (!readers || readers.length === 0) return []

    // Fetch Gigs to calculate price and title
    const readerIds = readers.map((r: any) => r.id)
    const { data: gigs } = await supabase
        .from('gigs')
        .select('id, owner_id, price, title')
        .in('owner_id', readerIds)
        .eq('is_active', true)
        .order('price', { ascending: true })

    const processedReaders = readers.map((reader: any) => {
        const readerGigs = gigs?.filter(g => g.owner_id === reader.id) || []
        const cheapestPrice = readerGigs.length > 0 ? readerGigs[0].price / 100 : 0

        return {
            id: reader.id,
            name: reader.full_name || 'Taróloga',
            title: readerGigs[0]?.title || 'Tarot & Vidência',
            bio: reader.bio || '',
            rating: Number(reader.rating_average || 5.0),
            reviews: Number(reader.reviews_count || 0),
            price: cheapestPrice,
            image: reader.avatar_url,
            tags: reader.specialties || [],
            isOnline: false, // Client-side PresenceProvider handles the real status
            gigId: readerGigs[0]?.id,
        }
    })

    // Filter by Price and Rating in memory (since they are derived/mocked)
    return processedReaders.filter(r => {
        if (filters.priceMin !== undefined && r.price < filters.priceMin) return false
        if (filters.priceMax !== undefined && r.price > filters.priceMax) return false
        if (filters.rating !== undefined && r.rating < filters.rating) return false
        return true
    })
}

interface PageProps {
    searchParams: Promise<{
        category?: string
        deck?: string
        min?: string
        max?: string
        rating?: string
        q?: string
    }>
}

export default async function TarologasPage({ searchParams }: PageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const params = await searchParams

    const filters: FilterParams = {
        category: params.category,
        deck: params.deck,
        priceMin: params.min ? Number(params.min) : undefined,
        priceMax: params.max ? Number(params.max) : undefined,
        rating: params.rating ? Number(params.rating) : undefined,
        search: params.q
    }

    const readers = await getAllReaders(filters)

    return <TarologasClient readers={readers} initialFilters={filters} userId={user?.id} />
}
