export interface Profile {
    id: string
    full_name: string
    avatar_url?: string
    email?: string
    role: 'USER' | 'READER' | 'ADMIN'
    sexo?: 'masculino' | 'feminino' | 'não binário'
    bio?: string
    specialties?: string[]
    verification_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
    experience_years?: number
    instagram_handle?: string
    cpf_cnpj?: string
    rating_average?: number
    reviews_count?: number
}

export interface GigRequirement {
    id: string
    question: string
    type: 'text' | 'choice'
    options?: string[]
    required: boolean
}

export interface Gig {
    id: string
    title: string
    description: string
    price: number
    image_url?: string
    slug: string
    owner_id: string
    created_at: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    owner?: Profile
    requirements?: GigRequirement[]
    add_ons?: GigAddOn[]
    category?: string
    delivery_time_hours?: number
    delivery_method?: string
    tags?: string[]
    pricing_type?: 'ONE_TIME' | 'RECURRING'
    readings_per_month?: number
}

export interface GigAddOn {
    id: string
    title: string
    description?: string
    price: number
    type: 'SPEED' | 'EXTRA' | 'CUSTOM'
}

export interface Order {
    id: string
    gig_id: string
    client_id: string
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
    created_at: string
    gig?: Gig
    client?: Profile
    requirements_answers?: Record<string, string>
    selected_addons?: string[] // Array of AddOn IDs
    subscription_id?: string
}

export interface Subscription {
    id: string
    gig_id: string
    client_id: string
    reader_id: string
    status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
    monthly_price: number // in cents
    readings_per_month: number
    readings_done_this_period: number
    period_start: string
    period_end: string
    next_reading_due: string
    last_payment_at?: string
    created_at: string
    updated_at: string
    // Joined fields
    gig?: Gig
    client?: Profile
    reader?: Profile
}

export interface Message {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string
    is_read: boolean
    order_id?: string
}

